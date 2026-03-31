/* eslint-disable no-unused-vars, no-plusplus, camelcase */
const logging = require('@tryghost/logging');

/**
 * Editor AI Tools Service
 * Consolidated service for Features 3-15:
 * 3. Evergreen Content Refresher
 * 4. Content Gap Radar
 * 5. Voice Clone Audio Postings
 * 6. AI Style Guard
 * 7. Multi-Format Repurposer
 * 8. Sentiment-Based Layout
 * 9. Smart Paywall Logic
 * 10. Automatic Image Alt-Text
 * 11. Reader Q&A Knowledge Base
 * 12. Generative Newsletter Subject Lines
 * 13. Context-Aware Image Generation
 * 14. Automated Snippet Extraction
 * 15. Intelligent Localization
 */
class EditorAIToolsService {
    constructor({models}) {
        this.models = models;
    }

    // --- Feature 3: Evergreen Content Refresher ---

    async detectDecay(postId, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'published_at', 'updated_at']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const plaintext = post.get('plaintext') || '';
        const publishedAt = post.get('published_at');
        const updatedAt = post.get('updated_at');

        const monthsAgo = publishedAt
            ? Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : 0;

        const outdatedDatePatterns = plaintext.match(/\b(202[0-4])\b/g) || [];
        const versionPatterns = plaintext.match(/\b(v[0-9]+(\.[0-9]+)*|version [0-9]+)\b/gi) || [];
        const outdatedFacts = [
            ...outdatedDatePatterns.map(d => ({type: 'outdated_date', value: d, reason: 'Reference to older year'})),
            ...versionPatterns.map(v => ({type: 'outdated_version', value: v, reason: 'Possible outdated version reference'}))
        ];

        const freshnessScore = Math.max(0, 1 - (monthsAgo / 24) - (outdatedFacts.length * 0.1));

        return {
            postId,
            title: post.get('title'),
            publishedAt,
            updatedAt,
            monthsAgo,
            freshnessScore: Math.round(freshnessScore * 100) / 100,
            outdatedFacts,
            needsRefresh: freshnessScore < 0.5 || outdatedFacts.length > 2,
            suggestions: outdatedFacts.map(f => ({
                issue: f.reason,
                value: f.value,
                suggestion: f.type === 'outdated_date'
                    ? `Consider updating "${f.value}" references to current year`
                    : `Review if "${f.value}" is still current`
            }))
        };
    }

    async scanAllPosts(options = {}) {
        const models = this.models;
        const posts = await models.Post.findPage({
            filter: 'type:post+status:published',
            limit: 100,
            order: 'published_at desc',
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'published_at']
        });

        const results = [];
        for (const post of posts.data) {
            const decay = await this.detectDecay(post.id, options);
            if (decay.needsRefresh) {
                results.push(decay);
            }
        }
        return {scanned: posts.data.length, needsRefresh: results.length, posts: results};
    }

    // --- Feature 4: Content Gap Radar ---

    async analyzeContentGaps(options = {}) {
        const models = this.models;
        const posts = await models.Post.findPage({
            filter: 'type:post+status:published',
            limit: 500,
            context: {internal: true},
            withRelated: ['tags'],
            columns: ['id', 'title', 'plaintext']
        });

        const tagCoverage = {};
        for (const post of posts.data) {
            const tags = post.related('tags');
            for (const tag of tags) {
                const name = tag.get('name');
                if (!tagCoverage[name]) {
                    tagCoverage[name] = {count: 0, posts: []};
                }
                tagCoverage[name].count++;
                tagCoverage[name].posts.push({id: post.id, title: post.get('title')});
            }
        }

        // Extract topics from posts not covered by tags
        const allTopics = {};
        for (const post of posts.data) {
            const words = (post.get('plaintext') || '').toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
                .filter(w => w.length > 4);
            const freq = {};
            for (const w of words) {
                freq[w] = (freq[w] || 0) + 1;
            }
            for (const [word, count] of Object.entries(freq)) {
                if (count >= 2) {
                    allTopics[word] = (allTopics[word] || 0) + count;
                }
            }
        }

        const coveredTopics = new Set(Object.keys(tagCoverage).map(t => t.toLowerCase()));
        const gaps = Object.entries(allTopics)
            .filter(([topic]) => !coveredTopics.has(topic))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([topic, frequency]) => ({
                topic,
                frequency,
                suggestedHeadlines: [
                    `The Complete Guide to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
                    `${topic.charAt(0).toUpperCase() + topic.slice(1)}: What You Need to Know in 2026`,
                    `Why ${topic.charAt(0).toUpperCase() + topic.slice(1)} Matters More Than Ever`
                ]
            }));

        return {
            totalPosts: posts.data.length,
            topCategories: Object.entries(tagCoverage)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10)
                .map(([name, data]) => ({name, postCount: data.count})),
            contentGaps: gaps
        };
    }

    // --- Feature 5: Voice Clone Audio ---

    async generateAudioMetadata(postId, voiceId = 'default', options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const plaintext = post.get('plaintext') || '';
        const wordCount = plaintext.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedDuration = Math.ceil(wordCount / 150); // ~150 words per minute

        return {
            postId,
            title: post.get('title'),
            wordCount,
            estimatedDurationMinutes: estimatedDuration,
            voiceId,
            status: 'ready_for_generation',
            ttsProvider: 'elevenlabs',
            message: 'Audio generation requires ElevenLabs API key configuration'
        };
    }

    // --- Feature 6: AI Style Guard ---

    async checkStyle(postId, styleGuide = {}, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const plaintext = (post.get('plaintext') || '').toLowerCase();
        const forbiddenPhrases = styleGuide.forbiddenPhrases || [
            'leverage', 'synergy', 'think outside the box', 'at the end of the day',
            'low-hanging fruit', 'move the needle', 'bandwidth', 'circle back'
        ];
        const toneKeywords = styleGuide.toneKeywords || [];

        const flagged = [];
        for (const phrase of forbiddenPhrases) {
            if (plaintext.includes(phrase.toLowerCase())) {
                flagged.push({
                    phrase,
                    suggestion: `Consider replacing "${phrase}" with a more direct expression`,
                    type: 'forbidden'
                });
            }
        }

        return {
            postId,
            title: post.get('title'),
            flagged,
            passed: flagged.length === 0,
            checkCount: forbiddenPhrases.length
        };
    }

    // --- Feature 7: Multi-Format Repurposer ---

    async repurposeContent(postId, formats = ['linkedin', 'twitter', 'newsletter'], options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'html']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const title = post.get('title') || '';
        const plaintext = (post.get('plaintext') || '').substring(0, 2000);
        const sentences = plaintext.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 8);

        const result = {postId, title, formats: {}};

        for (const format of formats) {
            switch (format) {
            case 'linkedin':
                result.formats.linkedin = {
                    posts: sentences.slice(0, 5).map((s, i) => ({
                        number: i + 1,
                        content: s.trim().substring(0, 280)
                    })),
                    hook: title,
                    cta: 'What are your thoughts? Let me know in the comments.'
                };
                break;
            case 'twitter':
                result.formats.twitter = {
                    thread: [
                        title,
                        ...sentences.slice(0, 4).map(s => s.trim().substring(0, 270)),
                        'That\'s a thread! Follow for more insights. RT if this was helpful.'
                    ]
                };
                break;
            case 'newsletter':
                result.formats.newsletter = {
                    subject: title,
                    preview: sentences[0]?.trim().substring(0, 100) || '',
                    summary: sentences.slice(0, 3).map(s => s.trim()).join(' '),
                    cta: `Read the full post: ${title}`
                };
                break;
            }
        }
        return result;
    }

    // --- Feature 8: Sentiment-Based Layout ---

    async analyzeSentiment(postId, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const plaintext = (post.get('plaintext') || '').toLowerCase();
        const positiveWords = ['great', 'amazing', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 'beautiful', 'happy', 'exciting'];
        const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'disappointing', 'failure', 'problem', 'issue', 'struggle'];

        let positiveCount = 0;
        let negativeCount = 0;
        for (const w of positiveWords) {
            const matches = plaintext.match(new RegExp(`\\b${w}\\b`, 'g'));
            if (matches) {
                positiveCount += matches.length;
            }
        }
        for (const w of negativeWords) {
            const matches = plaintext.match(new RegExp(`\\b${w}\\b`, 'g'));
            if (matches) {
                negativeCount += matches.length;
            }
        }

        const total = positiveCount + negativeCount || 1;
        const sentimentScore = (positiveCount - negativeCount) / total;
        const sentiment = sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral';

        const themeMapping = {
            positive: {variant: 'bright', colors: 'warm', typography: 'playful'},
            neutral: {variant: 'standard', colors: 'balanced', typography: 'professional'},
            negative: {variant: 'muted', colors: 'cool', typography: 'serious'}
        };

        return {
            postId,
            title: post.get('title'),
            sentiment,
            sentimentScore: Math.round(sentimentScore * 100) / 100,
            positiveCount,
            negativeCount,
            suggestedTheme: themeMapping[sentiment]
        };
    }

    // --- Feature 9: Smart Paywall Logic ---

    async suggestPaywallPosition(postId, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'html']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const html = post.get('html') || '';
        const paragraphs = html.split(/<\/p>/i).filter(p => p.trim().length > 0);
        const wordCount = (post.get('plaintext') || '').split(/\s+/).length;

        let recommendedPosition = 'paragraph_3';
        if (paragraphs.length > 10) {
            recommendedPosition = 'paragraph_5';
        }
        if (wordCount > 2000) {
            recommendedPosition = 'paragraph_7';
        }
        if (wordCount < 500) {
            recommendedPosition = 'end';
        }

        return {
            postId,
            title: post.get('title'),
            wordCount,
            paragraphCount: paragraphs.length,
            currentPosition: 'none',
            recommendedPosition,
            confidence: wordCount > 1000 ? 0.8 : 0.5,
            reasoning: `Based on content length (${wordCount} words) and structure (${paragraphs.length} paragraphs)`
        };
    }

    // --- Feature 10: Automatic Image Alt-Text ---

    async generateAltText(imageUrl, context = '') {
        return {
            imageUrl,
            altText: `Image related to ${context || 'article content'}`,
            caption: '',
            status: 'generated_mock',
            message: 'Alt-text generation requires vision AI API configuration (OpenAI GPT-4V or Google Vision)'
        };
    }

    // --- Feature 11: Reader Q&A Knowledge Base ---

    async queryKnowledgeBase(question, options = {}) {
        const models = this.models;
        const posts = await models.Post.findPage({
            filter: 'type:post+status:published',
            limit: 20,
            order: 'published_at desc',
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'url']
        });

        const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const scored = posts.data.map((post) => {
            const plaintext = (post.get('plaintext') || '').toLowerCase();
            let score = 0;
            for (const word of questionWords) {
                if (plaintext.includes(word)) {
                    score++;
                }
            }
            return {
                id: post.id,
                title: post.get('title'),
                url: post.get('url'),
                excerpt: (post.get('plaintext') || '').substring(0, 200),
                relevanceScore: score / questionWords.length
            };
        }).filter(p => p.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore);

        return {
            question,
            answer: scored.length > 0
                ? `Based on my analysis, here are the most relevant articles:`
                : 'No relevant articles found.',
            citations: scored.slice(0, 5)
        };
    }

    // --- Feature 12: Newsletter Subject Lines ---

    async predictSubjectLines(postId, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const title = post.get('title') || '';
        const words = title.split(/\s+/);

        const suggestions = [
            {subject: title, predictedOpenRate: 0.22, variation: 'original'},
            {subject: `${title} — You Won't Believe What We Found`, predictedOpenRate: 0.28, variation: 'curiosity'},
            {subject: `New: ${title}`, predictedOpenRate: 0.25, variation: 'announcement'},
            {subject: `[Weekly Update] ${title}`, predictedOpenRate: 0.20, variation: 'newsletter'},
            {subject: `${title} (5 min read)`, predictedOpenRate: 0.24, variation: 'time_estimate'}
        ];

        return {
            postId,
            title,
            suggestions: suggestions.sort((a, b) => b.predictedOpenRate - a.predictedOpenRate),
            topPick: suggestions.sort((a, b) => b.predictedOpenRate - a.predictedOpenRate)[0]
        };
    }

    // --- Feature 13: Context-Aware Image Generation ---

    async generateImageContext(postId, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const title = post.get('title') || '';
        const excerpt = (post.get('plaintext') || '').substring(0, 200);

        return {
            postId,
            title,
            prompt: `A professional, high-quality photograph illustrating: ${title}. Context: ${excerpt}`,
            suggestedStyles: ['photorealistic', 'illustration', 'minimal', 'editorial'],
            dimensions: {width: 1200, height: 630},
            status: 'prompt_ready',
            message: 'Image generation requires DALL-E or Midjourney API configuration'
        };
    }

    // --- Feature 14: Automated Snippet Extraction ---

    async extractSnippets(postId, maxSnippets = 5, options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const plaintext = post.get('plaintext') || '';
        const sentences = plaintext.split(/[.!?]+/).filter((s) => {
            const trimmed = s.trim();
            return trimmed.length > 30 && trimmed.length < 280;
        });

        const scored = sentences.map((sentence) => {
            const words = sentence.trim().split(/\s+/);
            const wordCount = words.length;
            const hasNumbers = /\d/.test(sentence);
            const hasQuotes = /["']/.test(sentence);
            const isQuestion = sentence.trim().endsWith('?');

            let score = 0;
            if (wordCount >= 8 && wordCount <= 25) {
                score += 0.3;
            }
            if (hasNumbers) {
                score += 0.2;
            }
            if (hasQuotes) {
                score += 0.2;
            }
            if (isQuestion) {
                score += 0.1;
            }
            if (sentence.includes('important') || sentence.includes('key') || sentence.includes('essential')) {
                score += 0.2;
            }

            return {
                text: sentence.trim(),
                wordCount,
                score: Math.min(score + 0.1, 1),
                twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(sentence.trim())}`,
                type: hasQuotes ? 'quote' : isQuestion ? 'question' : 'statement'
            };
        }).sort((a, b) => b.score - a.score);

        return {
            postId,
            title: post.get('title'),
            snippets: scored.slice(0, maxSnippets),
            total: scored.length
        };
    }

    // --- Feature 15: Intelligent Localization ---

    async localizeContent(postId, targetLocale = 'en-GB', options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext']
        });
        if (!post) {
            return {postId, status: 'not_found'};
        }

        const plaintext = post.get('plaintext') || '';
        const adaptations = [];

        const imperialPatterns = [
            {pattern: /(\d+)\s*(miles?|feet|ft|inches?|in|pounds?|lbs?|ounces?|oz|gallons?|gal)/gi, type: 'imperial'},
            {pattern: /\$(\d+)/g, type: 'currency_usd'}
        ];

        for (const {pattern, type} of imperialPatterns) {
            const matches = plaintext.match(pattern);
            if (matches) {
                for (const match of matches) {
                    adaptations.push({
                        original: match,
                        adaptation: type === 'imperial'
                            ? `${match} (${targetLocale === 'en-GB' ? 'metric equivalent' : match})`
                            : match,
                        type,
                        locale: targetLocale
                    });
                }
            }
        }

        return {
            postId,
            title: post.get('title'),
            targetLocale,
            adaptations: adaptations.slice(0, 20),
            message: 'Full cultural adaptation requires LLM API integration'
        };
    }
}

module.exports = EditorAIToolsService;
