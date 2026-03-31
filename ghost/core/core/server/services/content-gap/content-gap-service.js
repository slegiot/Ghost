/* eslint-disable no-unused-vars, no-plusplus, camelcase */
const logging = require('@tryghost/logging');

/**
 * Content Gap Radar Service
 * Analyzes topical authority by clustering posts by tags/topics,
 * identifies underserved areas, and generates headline suggestions.
 */
class ContentGapService {
    constructor({models}) {
        this.models = models;
    }

    /**
     * Full topical authority analysis.
     * Returns topic clusters, coverage map, and content gaps with suggested headlines.
     */
    async analyzeTopicalAuthority(options = {}) {
        const models = this.models;

        const posts = await models.Post.findPage({
            filter: 'type:post+status:published',
            limit: 500,
            context: {internal: true},
            withRelated: ['tags'],
            columns: ['id', 'title', 'plaintext', 'published_at']
        });

        // 1. Build tag coverage map
        const tagCoverage = {};
        for (const post of posts.data) {
            const tags = post.related('tags');
            for (const tag of tags) {
                const name = tag.get('name');
                if (!tagCoverage[name]) {
                    tagCoverage[name] = {count: 0, posts: [], slug: tag.get('slug')};
                }
                tagCoverage[name].count++;
                tagCoverage[name].posts.push({
                    id: post.id,
                    title: post.get('title'),
                    publishedAt: post.get('published_at')
                });
            }
        }

        // 2. Extract untagged content topics via TF analysis
        const allTopics = {};
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that',
            'these', 'those', 'its', 'not', 'no', 'so', 'than', 'very', 'just',
            'about', 'also', 'into', 'like', 'new', 'one', 'use', 'using', 'used',
            'get', 'got', 'make', 'made', 'going', 'your', 'you', 'how', 'what',
            'when', 'where', 'which', 'who', 'them', 'their', 'our', 'been', 'more'
        ]);

        for (const post of posts.data) {
            const plaintext = (post.get('plaintext') || '').toLowerCase();
            const words = plaintext.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
                .filter(w => w.length > 3 && !stopWords.has(w));

            const freq = {};
            for (const w of words) {
                freq[w] = (freq[w] || 0) + 1;
            }

            for (const [word, count] of Object.entries(freq)) {
                if (count >= 2) {
                    if (!allTopics[word]) {
                        allTopics[word] = {frequency: 0, posts: 0};
                    }
                    allTopics[word].frequency += count;
                    allTopics[word].posts++;
                }
            }
        }

        // 3. Identify gaps: topics that appear frequently but have no dedicated tag
        const coveredTopics = new Set(Object.keys(tagCoverage).map(t => t.toLowerCase()));
        const taggedSlugs = new Set(Object.values(tagCoverage).map(t => t.slug));

        const gaps = Object.entries(allTopics)
            .filter(([topic]) => !coveredTopics.has(topic) && !taggedSlugs.has(topic))
            .sort((a, b) => b[1].frequency - a[1].frequency)
            .slice(0, 12)
            .map(([topic, data]) => {
                const capitalized = topic.charAt(0).toUpperCase() + topic.slice(1);
                return {
                    topic: capitalized,
                    frequency: data.frequency,
                    postsMentioning: data.posts,
                    opportunityScore: Math.min(100, Math.round(
                        (data.frequency * 3) + (data.posts * 5)
                    )),
                    suggestedHeadlines: [
                        `The Complete Guide to ${capitalized}`,
                        `${capitalized}: Everything You Need to Know in 2026`,
                        `Why ${capitalized} Matters More Than Ever`,
                        `How to Master ${capitalized} — A Step-by-Step Guide`,
                        `5 Common ${capitalized} Mistakes and How to Avoid Them`
                    ]
                };
            });

        // 4. Build topic cluster summary
        const topCategories = Object.entries(tagCoverage)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 15)
            .map(([name, data]) => ({
                name,
                postCount: data.count,
                samplePosts: data.posts.slice(0, 3).map(p => p.title)
            }));

        // 5. Compute overall topical authority score
        const totalTagged = Object.values(tagCoverage).reduce((sum, t) => sum + t.count, 0);
        const totalPosts = posts.data.length;
        const tagDiversity = Object.keys(tagCoverage).length;
        const authorityScore = Math.min(100, Math.round(
            (tagDiversity * 2) + (totalTagged / Math.max(totalPosts, 1) * 10)
        ));

        return {
            totalPosts,
            topCategories,
            contentGaps: gaps,
            summary: {
                totalTags: Object.keys(tagCoverage).length,
                totalTagged,
                tagDiversity,
                authorityScore,
                gapsFound: gaps.length,
                highPriorityGaps: gaps.filter(g => g.opportunityScore >= 50).length
            }
        };
    }
}

module.exports = ContentGapService;
