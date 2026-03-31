/* eslint-disable no-unused-vars, no-plusplus, camelcase */
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * Semantic Linker Service
 * Extracts keywords from post content using NER-like tokenization,
 * generates lightweight embeddings, and finds semantically related posts.
 */
class SemanticLinkerService {
    constructor({models}) {
        this.models = models;
    }

    /**
     * Extract keywords from plaintext using TF-based NER approximation.
     * Returns top terms with frequency scores.
     */
    extractKeywords(plaintext) {
        if (!plaintext) {
            return [];
        }

        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
            'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he',
            'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
            'his', 'our', 'their', 'what', 'which', 'who', 'whom', 'where',
            'when', 'how', 'why', 'all', 'each', 'every', 'both', 'few', 'more',
            'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
            'so', 'than', 'too', 'very', 'just', 'about', 'above', 'after',
            'again', 'also', 'any', 'because', 'before', 'between', 'during',
            'here', 'into', 'like', 'now', 'out', 'over', 'then', 'there',
            'through', 'under', 'up', 'while', 'get', 'got', 'make', 'made',
            'going', 'go', 'went', 'come', 'came', 'take', 'took', 'put',
            'new', 'one', 'two', 'use', 'using', 'used', 'still', 'even'
        ]);

        const words = plaintext.toLowerCase()
            .replace(/[^a-z0-9\s'-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        const freq = {};
        for (const word of words) {
            freq[word] = (freq[word] || 0) + 1;
        }

        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([term, count]) => ({
                term,
                count,
                score: count / words.length
            }));
    }

    /**
     * Generate a lightweight embedding as a normalized term-frequency vector.
     * Stores as JSON string for simplicity; can be upgraded to real vector embeddings later.
     */
    generateEmbedding(keywords) {
        const vector = {};
        for (const kw of keywords) {
            vector[kw.term] = kw.score;
        }
        return JSON.stringify(vector);
    }

    /**
     * Compute cosine similarity between two embedding vectors.
     */
    cosineSimilarity(vecA, vecB) {
        const parsedA = typeof vecA === 'string' ? JSON.parse(vecA) : vecA;
        const parsedB = typeof vecB === 'string' ? JSON.parse(vecB) : vecB;

        const allTerms = new Set([...Object.keys(parsedA), ...Object.keys(parsedB)]);
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (const term of allTerms) {
            const a = parsedA[term] || 0;
            const b = parsedB[term] || 0;
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Index a post's embedding and keywords into the database.
     */
    async indexPost(postId, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });

        if (!post) {
            throw new errors.NotFoundError({message: 'Post not found'});
        }

        const plaintext = post.get('plaintext') || '';
        const keywords = this.extractKeywords(plaintext);
        const embedding = this.generateEmbedding(keywords);
        const keywordsJson = JSON.stringify(keywords);

        const db = options.transacting || options.knex || require('../../data/db').knex;

        // Upsert: check if embedding exists for this post
        const existing = await db('post_embeddings').where('post_id', postId).first();

        if (existing) {
            await db('post_embeddings')
                .where('post_id', postId)
                .update({
                    embedding,
                    keywords: keywordsJson,
                    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                });
        } else {
            const ObjectID = require('bson-objectid');
            await db('post_embeddings').insert({
                id: new ObjectID().toHexString(),
                post_id: postId,
                embedding,
                keywords: keywordsJson,
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            });
        }

        return {postId, keywords, keywordCount: keywords.length};
    }

    /**
     * Find semantically related posts for a given post.
     * Returns suggestions with similarity scores and anchor text candidates.
     */
    async findRelatedPosts(postId, {maxResults = 5, minSimilarity = 0.1} = {}, options = {}) {
        const models = this.models;
        const db = options.transacting || options.knex || require('../../data/db').knex;

        // Get the target post's embedding
        const targetRow = await db('post_embeddings').where('post_id', postId).first();

        if (!targetRow) {
            // Auto-index if not yet indexed
            await this.indexPost(postId, options);
            const reloaded = await db('post_embeddings').where('post_id', postId).first();
            if (!reloaded) {
                return {suggestions: [], message: 'Could not index post'};
            }
            return this._computeRelated(postId, reloaded, maxResults, minSimilarity, db, models);
        }

        return this._computeRelated(postId, targetRow, maxResults, minSimilarity, db, models);
    }

    async _computeRelated(postId, targetRow, maxResults, minSimilarity, db, models) {
        // Get all other post embeddings
        const allEmbeddings = await db('post_embeddings')
            .whereNot('post_id', postId)
            .select('post_id', 'embedding', 'keywords');

        // Fetch post metadata for matched posts
        const postIds = allEmbeddings.map(e => e.post_id);
        let postsMap = {};

        if (postIds.length > 0) {
            const posts = await models.Post.findPage({
                filter: `id:[${postIds.join(',')}]`,
                limit: postIds.length,
                context: {internal: true},
                columns: ['id', 'title', 'slug', 'url', 'plaintext']
            });

            for (const post of posts.data) {
                postsMap[post.id] = {
                    id: post.id,
                    title: post.get('title'),
                    slug: post.get('slug'),
                    url: post.get('url'),
                    excerpt: (post.get('plaintext') || '').substring(0, 200)
                };
            }
        }

        // Compute similarities
        const targetKeywords = JSON.parse(targetRow.keywords || '[]');
        const suggestions = [];

        for (const row of allEmbeddings) {
            if (!postsMap[row.post_id]) {
                continue;
            }

            const similarity = this.cosineSimilarity(targetRow.embedding, row.embedding);
            if (similarity < minSimilarity) {
                continue;
            }

            const candidateKeywords = JSON.parse(row.keywords || '[]');

            // Find anchor text candidates: keywords from target post that appear in the related post's keywords
            const candidateKeywordSet = new Set(candidateKeywords.map(k => k.term));
            const anchorCandidates = targetKeywords
                .filter(k => candidateKeywordSet.has(k.term))
                .map(k => k.term)
                .slice(0, 5);

            suggestions.push({
                ...postsMap[row.post_id],
                similarity: Math.round(similarity * 1000) / 1000,
                anchorCandidates
            });
        }

        // Sort by similarity descending
        suggestions.sort((a, b) => b.similarity - a.similarity);

        return {
            targetPostId: postId,
            suggestions: suggestions.slice(0, maxResults),
            totalAnalyzed: allEmbeddings.length
        };
    }

    /**
     * Index all published posts (for batch re-indexing).
     */
    async indexAllPosts(options = {}) {
        const models = this.models;
        const db = options.transacting || options.knex || require('../../data/db').knex;

        const posts = await models.Post.findPage({
            filter: 'type:post+status:published',
            limit: 1000,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });

        let indexed = 0;
        let errorsCount = 0;

        for (const post of posts.data) {
            try {
                await this.indexPost(post.id, {...options, transacting: db});
                indexed += 1;
            } catch (err) {
                logging.error({err, message: `Failed to index post ${post.id}`});
                errorsCount += 1;
            }
        }

        return {indexed, errors: errorsCount, total: posts.data.length};
    }

    /**
     * Get link suggestions for the editor sidebar.
     * Returns suggestions with anchor text and URL for quick insertion.
     */
    async getLinkSuggestions(postId, postContent, options = {}) {
        const related = await this.findRelatedPosts(postId, {maxResults: 8}, options);

        return {
            suggestions: related.suggestions.map(s => ({
                postId: s.id,
                title: s.title,
                url: s.url,
                similarity: s.similarity,
                suggestedAnchors: s.anchorCandidates,
                excerpt: s.excerpt
            })),
            totalAnalyzed: related.totalAnalyzed
        };
    }
}

module.exports = SemanticLinkerService;
