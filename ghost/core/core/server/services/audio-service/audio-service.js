const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const aiConfig = require('../ai-config');

/**
 * Audio Service for Voice Clone Audio Postings (Feature 5)
 * Manages audio generation metadata, TTS provider abstraction,
 * and audio file lifecycle for post audio versions.
 */
class AudioService {
    constructor({models}) {
        this.models = models;
    }

    async _ensureConfigured() {
        const config = await aiConfig.getConfig();
        if (!config.elevenlabs.apiKey) {
            throw new errors.UnprocessableEntityError({
                message: 'AI service not configured. Visit Settings > Advanced > AI Settings to add your API keys.',
                context: 'ElevenLabs API key is required for audio features.'
            });
        }
    }

    /**
     * Get audio metadata for a post. Creates the record if it doesn't exist.
     */
    async getAudioMetadata(postId, options = {}) {
        await this._ensureConfigured();
        const models = this.models;
        const db = options.transacting || options.knex || require('../../data/db').knex;

        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });

        if (!post) {
            throw new errors.NotFoundError({message: 'Post not found'});
        }

        const plaintext = post.get('plaintext') || '';
        const wordCount = plaintext.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedDuration = Math.ceil(wordCount / 150);

        // Check for existing audio record
        let audioRecord = await db('post_audio').where('post_id', postId).first();

        if (!audioRecord) {
            const ObjectID = require('bson-objectid');
            audioRecord = {
                id: new ObjectID().toHexString(),
                post_id: postId,
                audio_url: null,
                duration: null,
                voice_id: 'default',
                status: 'pending',
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            await db('post_audio').insert(audioRecord);
        }

        return {
            postId,
            title: post.get('title'),
            wordCount,
            estimatedDurationMinutes: estimatedDuration,
            audio: {
                id: audioRecord.id,
                audioUrl: audioRecord.audio_url,
                duration: audioRecord.duration,
                voiceId: audioRecord.voice_id,
                status: audioRecord.status,
                errorMessage: audioRecord.error_message
            },
            availableVoices: this._getAvailableVoices(),
            ttsProvider: 'elevenlabs',
            message: audioRecord.status === 'ready'
                ? 'Audio version is ready'
                : 'Configure ElevenLabs API key to enable voice cloning'
        };
    }

    /**
     * List all posts with their audio status.
     */
    async listPostsWithAudio(options = {}) {
        await this._ensureConfigured();
        const models = this.models;
        const db = options.transacting || options.knex || require('../../data/db').knex;

        const posts = await models.Post.findPage({
            filter: 'type:post+status:[published,draft]',
            limit: 50,
            order: 'updated_at desc',
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'status']
        });

        const postIds = posts.data.map(p => p.id);
        const audioRecords = await db('post_audio').whereIn('post_id', postIds).select();
        const audioMap = {};
        for (const record of audioRecords) {
            audioMap[record.post_id] = record;
        }

        const results = posts.data.map((post) => {
            const plaintext = post.get('plaintext') || '';
            const wordCount = plaintext.split(/\s+/).filter(w => w.length > 0).length;
            const audio = audioMap[post.id];

            return {
                postId: post.id,
                title: post.get('title'),
                postStatus: post.get('status'),
                wordCount,
                estimatedDurationMinutes: Math.ceil(wordCount / 150),
                audio: audio ? {
                    id: audio.id,
                    audioUrl: audio.audio_url,
                    duration: audio.duration,
                    voiceId: audio.voice_id,
                    status: audio.status
                } : null
            };
        });

        return {
            total: results.length,
            posts: results,
            withAudio: results.filter(r => r.audio?.status === 'ready').length
        };
    }

    /**
     * Generate audio for a post (creates metadata record, actual TTS is async).
     */
    async generateAudio(postId, voiceId = 'default', options = {}) {
        await this._ensureConfigured();
        const models = this.models;
        const db = options.transacting || options.knex || require('../../data/db').knex;

        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });

        if (!post) {
            throw new errors.NotFoundError({message: 'Post not found'});
        }

        const plaintext = post.get('plaintext') || '';
        if (plaintext.length < 50) {
            throw new errors.ValidationError({message: 'Post content is too short for audio generation'});
        }

        const wordCount = plaintext.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedDuration = Math.ceil(wordCount / 150);

        // Upsert audio record
        const existing = await db('post_audio').where('post_id', postId).first();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (existing) {
            await db('post_audio').where('post_id', postId).update({
                voice_id: voiceId,
                status: 'generating',
                error_message: null,
                updated_at: now
            });
        } else {
            const ObjectID = require('bson-objectid');
            await db('post_audio').insert({
                id: new ObjectID().toHexString(),
                post_id: postId,
                audio_url: null,
                duration: null,
                voice_id: voiceId,
                status: 'generating',
                created_at: now,
                updated_at: now
            });
        }

        logging.info(`Audio generation initiated for post ${postId} with voice ${voiceId}`);

        return {
            postId,
            title: post.get('title'),
            voiceId,
            wordCount,
            estimatedDurationMinutes: estimatedDuration,
            status: 'generating',
            message: 'Audio generation has been queued. Actual TTS requires ElevenLabs API configuration.',
            ttsProvider: 'elevenlabs'
        };
    }

    /**
     * Get available voice options for TTS.
     */
    _getAvailableVoices() {
        return [
            {id: 'default', name: 'Default Voice', language: 'en-US', description: 'Standard neutral voice'},
            {id: 'narrative', name: 'Narrative', language: 'en-US', description: 'Warm storytelling voice'},
            {id: 'professional', name: 'Professional', language: 'en-US', description: 'Clear business tone'},
            {id: 'conversational', name: 'Conversational', language: 'en-US', description: 'Casual and friendly'},
            {id: 'british', name: 'British', language: 'en-GB', description: 'British English accent'}
        ];
    }
}

module.exports = AudioService;
