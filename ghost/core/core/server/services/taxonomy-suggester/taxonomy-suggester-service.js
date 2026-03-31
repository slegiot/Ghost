/* eslint-disable no-unused-vars, no-plusplus, camelcase */
/**
 * Taxonomy Suggester Service
 * Analyzes post content and suggests tags based on NLP keyword extraction
 * combined with existing site tag structure and performance data.
 */
class TaxonomySuggesterService {
    constructor({models}) {
        this.models = models;
    }

    /**
     * Extract key topics from plaintext content.
     * Uses TF-based extraction with compound phrase detection.
     */
    extractTopics(plaintext, title = '') {
        if (!plaintext && !title) {
            return [];
        }

        const combined = `${title} ${title} ${(plaintext || '').substring(0, 3000)}`;

        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
            'this', 'that', 'these', 'those', 'it', 'its', 'not', 'no', 'so',
            'than', 'too', 'very', 'just', 'about', 'also', 'into', 'like',
            'new', 'one', 'use', 'using', 'used', 'get', 'got', 'make', 'made',
            'going', 'go', 'went', 'come', 'came', 'take', 'took', 'put'
        ]);

        const words = combined.toLowerCase()
            .replace(/[^a-z0-9\s'-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        // Single word frequency
        const freq = {};
        for (const word of words) {
            freq[word] = (freq[word] || 0) + 1;
        }

        // Bigram extraction for compound topics
        const bigrams = {};
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`;
            if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
                bigrams[bigram] = (bigrams[bigram] || 0) + 1;
            }
        }

        const topics = [];

        // Add top bigrams
        for (const [phrase, count] of Object.entries(bigrams)) {
            if (count >= 2) {
                topics.push({
                    term: phrase,
                    count,
                    score: count / words.length,
                    type: 'compound'
                });
            }
        }

        // Add top single words
        for (const [word, count] of Object.entries(freq)) {
            if (count >= 2 && !topics.some(t => t.term.includes(word))) {
                topics.push({
                    term: word,
                    count,
                    score: count / words.length,
                    type: 'single'
                });
            }
        }

        return topics.sort((a, b) => b.score - a.score).slice(0, 15);
    }

    /**
     * Suggest tags for a post based on content analysis.
     * Matches extracted topics against existing tags and suggests new ones.
     */
    async suggestTags(postId, options = {}) {
        const models = this.models;

        // Fetch the post
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'html']
        });

        if (!post) {
            return {suggestions: [], message: 'Post not found'};
        }

        const plaintext = post.get('plaintext') || '';
        const title = post.get('title') || '';

        // Extract topics from content
        const topics = this.extractTopics(plaintext, title);

        // Fetch all existing tags with their post counts
        const existingTags = await models.Tag.findAll({
            ...options,
            context: {internal: true},
            columns: ['id', 'name', 'slug']
        });

        const tagMap = {};
        for (const tag of existingTags) {
            tagMap[tag.get('name').toLowerCase()] = {
                id: tag.id,
                name: tag.get('name'),
                slug: tag.get('slug')
            };
        }

        // Fetch current tags on this post
        const currentTags = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            withRelated: ['tags']
        });
        const currentTagNames = new Set(
            (currentTags ? currentTags.related('tags') : []).map(t => t.get('name').toLowerCase())
        );

        const suggestions = [];

        for (const topic of topics) {
            const matchingExistingTag = tagMap[topic.term];

            if (matchingExistingTag && !currentTagNames.has(topic.term)) {
                // Existing tag that matches content but isn't applied
                suggestions.push({
                    tagName: matchingExistingTag.name,
                    tagId: matchingExistingTag.id,
                    slug: matchingExistingTag.slug,
                    score: topic.score,
                    matchType: 'existing',
                    reason: `Topic "${topic.term}" matches existing tag`,
                    isNew: false
                });
            } else if (!matchingExistingTag && topic.score > 0.01) {
                // New tag suggestion based on content topics
                suggestions.push({
                    tagName: topic.term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    tagId: null,
                    slug: topic.term.replace(/\s+/g, '-'),
                    score: topic.score,
                    matchType: 'suggested',
                    reason: `New tag suggested from content topic "${topic.term}"`,
                    isNew: true
                });
            }
        }

        // Sort by score descending
        suggestions.sort((a, b) => b.score - a.score);

        // Determine if post should be moved to "Deep Dive" based on complexity
        const wordCount = plaintext.split(/\s+/).filter(w => w.length > 0).length;
        const complexityScore = this._computeComplexity(plaintext);
        const deepDiveSuggestion = wordCount > 1500 && complexityScore > 0.6;

        return {
            postId,
            suggestions: suggestions.slice(0, 10),
            deepDiveSuggestion,
            wordCount,
            complexityScore: Math.round(complexityScore * 100) / 100,
            topics: topics.slice(0, 8)
        };
    }

    /**
     * Auto-apply tags to a post based on suggestions.
     */
    async autoApplyTags(postId, suggestions, options = {}) {
        const models = this.models;

        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            withRelated: ['tags']
        });

        if (!post) {
            return {applied: 0, message: 'Post not found'};
        }

        const existingTagNames = post.related('tags').map(t => t.get('name'));
        const tagsToApply = [];

        for (const suggestion of suggestions) {
            if (suggestion.isNew) {
                // Create new tag and apply
                const newTag = await models.Tag.add({
                    name: suggestion.tagName,
                    slug: suggestion.slug
                }, {
                    ...options,
                    context: {internal: true}
                });
                tagsToApply.push({name: newTag.get('name')});
            } else {
                tagsToApply.push({name: suggestion.tagName});
            }
        }

        // Merge with existing tags
        const allTagNames = [...existingTagNames, ...tagsToApply.map(t => t.name)];
        const uniqueTags = [...new Set(allTagNames.map(n => n.toLowerCase()))].map(name => ({
            name: allTagNames.find(n => n.toLowerCase() === name)
        }));

        // Update the post with new tags
        await models.Post.edit({tags: uniqueTags}, {
            ...options,
            id: postId,
            context: {internal: true}
        });

        return {
            postId,
            applied: tagsToApply.length,
            tags: uniqueTags.map(t => t.name)
        };
    }

    /**
     * Batch suggest tags for recent untagged posts.
     */
    async suggestForRecent(limit = 10, options = {}) {
        const models = this.models;

        const posts = await models.Post.findPage({
            filter: 'type:post+status:[published,draft]',
            limit,
            order: 'updated_at desc',
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });

        const results = [];
        for (const post of posts.data) {
            const result = await this.suggestTags(post.id, options);
            if (result.suggestions.length > 0) {
                results.push(result);
            }
        }

        return {postsAnalyzed: posts.data.length, results};
    }

    /**
     * Compute content complexity score (0-1).
     */
    _computeComplexity(plaintext) {
        if (!plaintext) {
            return 0;
        }

        const words = plaintext.split(/\s+/).filter(w => w.length > 0);
        const sentences = plaintext.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
        const avgSentenceLength = words.length / Math.max(sentences.length, 1);

        // Normalize: longer words and longer sentences = more complex
        const wordComplexity = Math.min(avgWordLength / 8, 1);
        const sentenceComplexity = Math.min(avgSentenceLength / 30, 1);
        const lengthComplexity = Math.min(words.length / 2000, 1);

        return (wordComplexity * 0.3 + sentenceComplexity * 0.4 + lengthComplexity * 0.3);
    }
}

module.exports = TaxonomySuggesterService;
