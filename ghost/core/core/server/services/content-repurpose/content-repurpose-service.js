/* eslint-disable no-unused-vars, no-plusplus, camelcase */
const logging = require('@tryghost/logging');

/**
 * Content Repurpose Service (Feature 7)
 * Generates LinkedIn threads, Twitter/X threads, and newsletter
 * summaries from a single post. Each format has platform-specific
 * constraints (character limits, threading conventions).
 */
class ContentRepurposeService {
    constructor({models}) {
        this.models = models;
    }

    async repurpose(postId, formats = ['linkedin', 'twitter', 'newsletter'], options = {}) {
        const models = this.models;
        const post = await models.Post.findOne({id: postId}, {
            ...options,
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'html', 'feature_image', 'url']
        });

        if (!post) {
            return {postId, status: 'not_found'};
        }

        const title = post.get('title') || '';
        const plaintext = post.get('plaintext') || '';
        const url = post.get('url') || '';
        const featureImage = post.get('feature_image') || '';

        const sentences = plaintext
            .replace(/\n+/g, ' ')
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 15);

        const keyPoints = this._extractKeyPoints(sentences);
        const result = {postId, title, url, formats: {}};

        for (const format of formats) {
            switch (format) {
            case 'linkedin':
                result.formats.linkedin = this._generateLinkedIn(title, keyPoints, url);
                break;
            case 'twitter':
                result.formats.twitter = this._generateTwitter(title, keyPoints, url);
                break;
            case 'newsletter':
                result.formats.newsletter = this._generateNewsletter(title, keyPoints, plaintext, url, featureImage);
                break;
            }
        }

        return result;
    }

    _extractKeyPoints(sentences) {
        const scored = sentences.map((s) => {
            const words = s.split(/\s+/);
            const wordCount = words.length;
            let score = 0;

            if (wordCount >= 8 && wordCount <= 25) {
                score += 0.3;
            }
            if (/\d/.test(s)) {
                score += 0.2;
            }
            if (/["']/.test(s)) {
                score += 0.2;
            }
            if (s.includes('important') || s.includes('key') || s.includes('essential') || s.includes('critical')) {
                score += 0.3;
            }
            if (s.length < 280) {
                score += 0.1;
            }

            return {text: s, score, wordCount};
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(s => s.text);
    }

    _generateLinkedIn(title, keyPoints, url) {
        const posts = [];

        posts.push({
            position: 1,
            content: `${title}\n\nHere's what I learned writing this — a thread:`,
            charCount: title.length + 45
        });

        const maxPosts = Math.min(keyPoints.length, 6);
        for (let i = 0; i < maxPosts; i++) {
            const content = `${i + 1}. ${keyPoints[i]}`;
            if (content.length <= 290) {
                posts.push({
                    position: i + 2,
                    content,
                    charCount: content.length
                });
            }
        }

        posts.push({
            position: posts.length + 1,
            content: `Read the full post here: ${url}\n\nWhat are your thoughts? Let me know in the comments.`,
            charCount: 60 + url.length
        });

        return {
            posts,
            totalPosts: posts.length,
            format: 'linkedin_thread',
            tips: [
                'Post the first item as your main post',
                'Reply to yourself with each subsequent number',
                'Pin the thread for visibility'
            ]
        };
    }

    _generateTwitter(title, keyPoints, url) {
        const thread = [];

        thread.push({
            position: 1,
            content: `${title}\n\nThread:`,
            charCount: title.length + 10
        });

        const maxTweets = Math.min(keyPoints.length, 6);
        for (let i = 0; i < maxTweets; i++) {
            const content = keyPoints[i].substring(0, 260);
            if (content.length <= 270) {
                thread.push({
                    position: i + 2,
                    content,
                    charCount: content.length
                });
            }
        }

        thread.push({
            position: thread.length + 1,
            content: `That's the thread!\n\nFull post: ${url}\n\nIf this was helpful, retweet the first tweet so others can see it too.`,
            charCount: 80 + url.length
        });

        return {
            thread,
            totalTweets: thread.length,
            format: 'twitter_thread',
            tips: [
                'Post the first tweet, then reply to it',
                'Use the thread unroller for easy reading',
                'Add relevant hashtags to the last tweet'
            ]
        };
    }

    _generateNewsletter(title, keyPoints, plaintext, url, featureImage) {
        const previewText = keyPoints[0]?.substring(0, 150) || plaintext.substring(0, 150);
        const bulletPoints = keyPoints.slice(0, 5).map(p => `• ${p}`);

        return {
            subject: title,
            previewText,
            intro: `In this edition, we explore ${title.toLowerCase()}.`,
            summary: bulletPoints.join('\n'),
            cta: {
                text: 'Read the full article',
                url
            },
            format: 'newsletter',
            designTips: [
                'Use a clear hierarchy with the subject as H1',
                'Keep preview text under 90 characters',
                'End with a single clear CTA button'
            ]
        };
    }
}

module.exports = ContentRepurposeService;
