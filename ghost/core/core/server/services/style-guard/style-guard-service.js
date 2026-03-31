/* eslint-disable no-unused-vars, no-plusplus, camelcase */
/**
 * Style Guard Service (Feature 6)
 * Custom "Brand Voice" filter that flags phrases that don't match
 * a site's configured style guide. Enforces tone consistency across
 * guest authors and team members.
 */
class StyleGuardService {
    constructor({models}) {
        this.models = models;
    }

    async getStyleGuide(options = {}) {
        const db = options.transacting || options.knex || require('../../data/db').knex;

        let guide = await db('style_guides').where('id', 'default').first();
        if (!guide) {
            /* eslint-disable no-unused-vars */
            const ObjectID = require('bson-objectid');
            guide = {
                id: 'default',
                name: 'Default Style Guide',
                tone_keywords: JSON.stringify(['professional', 'clear', 'friendly']),
                forbidden_phrases: JSON.stringify([
                    'leverage', 'synergy', 'think outside the box', 'at the end of the day',
                    'low-hanging fruit', 'move the needle', 'bandwidth', 'circle back',
                    'touch base', 'deep dive', 'pivot', 'disrupt', 'hack', 'game-changer',
                    'boil the ocean', 'drink the kool-aid', 'peel back the onion',
                    'thought leader', 'best practice', 'value add', 'stakeholder alignment'
                ]),
                preferred_phrases: JSON.stringify([
                    'use effectively', 'work together', 'be creative', 'ultimately',
                    'quick win', 'make progress', 'capacity', 'follow up'
                ]),
                min_reading_level: '8th grade',
                max_sentence_length: '25 words',
                require_active_voice: true,
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            await db('style_guides').insert(guide);
        }

        return {
            id: guide.id,
            name: guide.name,
            toneKeywords: JSON.parse(guide.tone_keywords || '[]'),
            forbiddenPhrases: JSON.parse(guide.forbidden_phrases || '[]'),
            preferredPhrases: JSON.parse(guide.preferred_phrases || '[]'),
            minReadingLevel: guide.min_reading_level,
            maxSentenceLength: guide.max_sentence_length,
            requireActiveVoice: guide.require_active_voice
        };
    }

    async updateStyleGuide(updates, options = {}) {
        const db = options.transacting || options.knex || require('../../data/db').knex;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const existing = await db('style_guides').where('id', 'default').first();
        if (!existing) {
            await this.getStyleGuide(options);
        }

        const patch = {updated_at: now};
        if (updates.forbiddenPhrases) {
            patch.forbidden_phrases = JSON.stringify(updates.forbiddenPhrases);
        }
        if (updates.preferredPhrases) {
            patch.preferred_phrases = JSON.stringify(updates.preferredPhrases);
        }
        if (updates.toneKeywords) {
            patch.tone_keywords = JSON.stringify(updates.toneKeywords);
        }
        if (updates.minReadingLevel) {
            patch.min_reading_level = updates.minReadingLevel;
        }
        if (updates.maxSentenceLength) {
            patch.max_sentence_length = updates.maxSentenceLength;
        }
        if (updates.requireActiveVoice !== undefined) {
            patch.require_active_voice = updates.requireActiveVoice;
        }
        if (updates.name) {
            patch.name = updates.name;
        }

        await db('style_guides').where('id', 'default').update(patch);
        return await this.getStyleGuide(options);
    }

    async checkContent(postId, styleGuideOverride = null, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });

        if (!post) {
            return {postId, status: 'not_found'};
        }

        const styleGuide = styleGuideOverride || await this.getStyleGuide(options);
        const forbiddenPhrases = styleGuide.forbiddenPhrases || styleGuide.forbidden_phrases || [];
        const preferredPhrases = styleGuide.preferredPhrases || styleGuide.preferred_phrases || [];
        const plaintext = (post.get('plaintext') || '').toLowerCase();
        const sentences = (post.get('plaintext') || '').split(/[.!?]+/).filter(s => s.trim().length > 0);

        const flags = [];
        const suggestions = []; // used for tracking;

        for (const phrase of forbiddenPhrases) {
            if (plaintext.includes(phrase.toLowerCase())) {
                const preferred = preferredPhrases[forbiddenPhrases.indexOf(phrase)] || 'a more direct expression';
                flags.push({
                    phrase,
                    type: 'forbidden',
                    severity: 'warning',
                    suggestion: `Replace "${phrase}" with "${preferred}"`,
                    context: this._getSurroundingContext(plaintext, phrase)
                });
            }
        }

        const maxLen = parseInt((styleGuide.maxSentenceLength || '25').split(' ')[0], 10) || 25;
        let longSentenceCount = 0;
        for (const sentence of sentences) {
            const wordCount = sentence.trim().split(/\s+/).length;
            if (wordCount > maxLen) {
                longSentenceCount += 1;
                if (longSentenceCount <= 3) {
                    flags.push({
                        phrase: sentence.trim().substring(0, 80) + '...',
                        type: 'long_sentence',
                        severity: 'info',
                        suggestion: `Sentence has ${wordCount} words (max recommended: ${maxLen}). Consider breaking into shorter sentences.`
                    });
                }
            }
        }

        const passivePatterns = [
            /\b(is|are|was|were|been|being)\s+(been\s+)?(created|written|built|used|made|done|given|taken|shown|found|seen|told|asked|called|tried|needed|known|put|kept|brought|thought|left|set|held|led|paid|met|run|told|stood|sent|spent|grown|caught|driven|broken|chosen|drawn|fallen|fed|felt|fought|forgotten|forgiven|frozen|gotten|hidden|hit|hurt|laid|learned|lost|meant|read|risen|slept|spoken|swung|taught|torn|understood|won|worn|wound|written)\b/g
        ];

        if (styleGuide.requireActiveVoice || styleGuide.require_active_voice) {
            for (const pattern of passivePatterns) {
                const matches = plaintext.match(pattern);
                if (matches && matches.length > 2) {
                    flags.push({
                        phrase: `~${matches.length} passive voice instances`,
                        type: 'passive_voice',
                        severity: 'info',
                        suggestion: 'Consider rewriting passive sentences in active voice for clearer writing.'
                    });
                    break;
                }
            }
        }

        const totalSentences = sentences.length || 1;
        const score = Math.max(0, 1 - (flags.length / totalSentences));

        return {
            postId,
            title: post.get('title'),
            flags,
            flagCount: flags.length,
            passCount: flags.filter(f => f.severity === 'warning').length === 0,
            score: Math.round(score * 100),
            summary: {
                totalSentences,
                forbiddenPhrasesFound: flags.filter(f => f.type === 'forbidden').length,
                longSentences: flags.filter(f => f.type === 'long_sentence').length,
                passiveVoice: flags.filter(f => f.type === 'passive_voice').length
            }
        };
    }

    async checkBatch(postIds, options = {}) {
        const results = [];
        for (const postId of postIds) {
            const result = await this.checkContent(postId, null, options);
            if (result.flags && result.flags.length > 0) {
                results.push(result);
            }
        }
        return {
            totalChecked: postIds.length,
            postsWithFlags: results.length,
            results
        };
    }

    _getSurroundingContext(plaintext, phrase) {
        const idx = plaintext.indexOf(phrase.toLowerCase());
        if (idx === -1) {
            return '';
        }
        const start = Math.max(0, idx - 40);
        const end = Math.min(plaintext.length, idx + phrase.length + 40);
        return (start > 0 ? '...' : '') + plaintext.slice(start, end) + (end < plaintext.length ? '...' : '');
    }
}

module.exports = StyleGuardService;
