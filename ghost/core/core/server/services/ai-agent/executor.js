const models = require('../../models');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * Executes confirmed AI agent actions by calling Ghost's internal model layer.
 * Each method corresponds to a tool defined in tools.js.
 */
class ActionExecutor {
    /**
     * Execute a single confirmed action
     * @param {Object} action - { tool, arguments }
     * @param {Object} options - Ghost API frame options (context, transacting, etc.)
     */
    async execute(action, options = {}) {
        const method = this[action.tool];
        if (!method) {
            throw new errors.InternalServerError({message: `Unknown action: ${action.tool}`});
        }

        logging.info(`AI Agent executing: ${action.tool}`);
        return await method.call(this, action.arguments, options);
    }

    /**
     * Execute multiple confirmed actions in sequence
     */
    async executeAll(actions, options = {}) {
        const results = [];
        for (const action of actions) {
            try {
                const result = await this.execute(action, options);
                results.push({
                    tool: action.tool,
                    success: true,
                    result
                });
            } catch (err) {
                logging.error({err, message: `AI Agent action failed: ${action.tool}`});
                results.push({
                    tool: action.tool,
                    success: false,
                    error: err.message
                });
            }
        }
        return results;
    }

    // --- Tool implementations ---

    async create_page(args, options) {
        const data = {
            title: args.title,
            html: args.content,
            type: 'page',
            status: args.status || 'draft',
            tags: (args.tags || []).map(name => ({name}))
        };

        const model = await models.Post.add(data, {
            ...options,
            context: {internal: true},
            source: 'html'
        });

        return {
            id: model.id,
            title: model.get('title'),
            slug: model.get('slug'),
            status: model.get('status'),
            url: model.get('url')
        };
    }

    async create_post(args, options) {
        const data = {
            title: args.title,
            html: args.content,
            status: args.status || 'draft',
            featured: args.featured || false,
            tags: (args.tags || []).map(name => ({name}))
        };

        const model = await models.Post.add(data, {
            ...options,
            context: {internal: true},
            source: 'html'
        });

        return {
            id: model.id,
            title: model.get('title'),
            slug: model.get('slug'),
            status: model.get('status'),
            url: model.get('url')
        };
    }

    async auto_tag(args, options) {
        let filter = 'type:post';
        if (args.scope === 'recent') {
            filter += '+status:[published,draft]';
        } else if (args.scope === 'untagged') {
            filter += '+tag:-[*]';
        }

        const posts = await models.Post.findPage({
            ...options,
            filter,
            limit: args.limit || 10,
            order: 'published_at desc',
            context: {internal: true},
            withRelated: ['tags'],
            columns: ['id', 'title', 'plaintext']
        });

        // Return post summaries for the agent to analyse
        const postSummaries = posts.data.map(p => ({
            id: p.id,
            title: p.get('title'),
            excerpt: (p.get('plaintext') || '').substring(0, 300),
            currentTags: p.related('tags').map(t => t.get('name'))
        }));

        return {
            postsAnalysed: postSummaries.length,
            posts: postSummaries
        };
    }

    async link_related(args, options) {
        const queryOptions = {
            ...options,
            filter: 'type:post+status:published',
            limit: args.post_id ? 20 : 10,
            order: 'published_at desc',
            context: {internal: true},
            columns: ['id', 'title', 'plaintext', 'slug', 'url']
        };

        const posts = await models.Post.findPage(queryOptions);
        const pages = await models.Post.findPage({
            ...queryOptions,
            filter: 'type:page+status:published'
        });

        const allContent = [
            ...posts.data.map(p => ({
                id: p.id,
                title: p.get('title'),
                slug: p.get('slug'),
                type: 'post',
                excerpt: (p.get('plaintext') || '').substring(0, 200)
            })),
            ...pages.data.map(p => ({
                id: p.id,
                title: p.get('title'),
                slug: p.get('slug'),
                type: 'page',
                excerpt: (p.get('plaintext') || '').substring(0, 200)
            }))
        ];

        return {
            contentCount: allContent.length,
            content: allContent,
            maxLinks: args.max_links || 3
        };
    }

    async optimize_content(args, options) {
        const model = await models.Post.findOne({id: args.post_id}, {
            ...options,
            context: {internal: true},
            formats: ['html', 'plaintext']
        });

        if (!model) {
            throw new errors.NotFoundError({message: 'Post not found'});
        }

        return {
            id: model.id,
            title: model.get('title'),
            content: model.get('html'),
            plaintext: (model.get('plaintext') || '').substring(0, 2000),
            focus: args.focus || 'all',
            wordCount: (model.get('plaintext') || '').split(/\s+/).length,
            metaTitle: model.get('meta_title'),
            metaDescription: model.get('meta_description')
        };
    }

    async send_newsletter(args, options) {
        // First verify the post exists and is published
        const model = await models.Post.findOne({id: args.post_id}, {
            ...options,
            context: {internal: true}
        });

        if (!model) {
            throw new errors.NotFoundError({message: 'Post not found'});
        }

        if (model.get('status') !== 'published') {
            throw new errors.ValidationError({message: 'Post must be published before it can be sent as a newsletter'});
        }

        // Update the post to trigger email sending
        const updated = await models.Post.edit({
            email_only: false,
            newsletter_id: args.newsletter_id || undefined
        }, {
            ...options,
            id: args.post_id,
            context: {internal: true}
        });

        return {
            id: updated.id,
            title: updated.get('title'),
            status: 'email_queued',
            message: `Newsletter queued for "${updated.get('title')}"`
        };
    }

    async analyse_data(args) {
        const statsService = require('../../services/stats');
        const results = {};
        const period = args.period || '30d';
        const dateFrom = this._getDateFrom(period);

        for (const metric of (args.metrics || [])) {
            try {
                switch (metric) {
                case 'member_count':
                    results.memberCount = await statsService.api.getMemberCountHistory({dateFrom});
                    break;
                case 'mrr':
                    results.mrr = await statsService.api.getMRRHistory({dateFrom});
                    break;
                case 'top_posts':
                    results.topPosts = await statsService.api.getTopPosts({
                        limit: 10,
                        order: 'free_members desc',
                        date_from: dateFrom
                    });
                    break;
                case 'referrers':
                    results.referrers = await statsService.api.getReferrersHistory();
                    break;
                case 'newsletter_stats':
                    results.newsletterStats = await statsService.api.getNewsletterStats({
                        limit: 5,
                        date_from: dateFrom
                    });
                    break;
                case 'subscriptions':
                    results.subscriptions = await statsService.api.getSubscriptionCountHistory();
                    break;
                }
            } catch (err) {
                logging.error({err, message: `Failed to fetch metric: ${metric}`});
                results[metric] = {error: err.message};
            }
        }

        return {
            period,
            data: results
        };
    }

    async browse_posts(args, options) {
        const queryOptions = {
            ...options,
            filter: args.filter || 'type:post',
            limit: args.limit || 15,
            order: args.order || 'published_at desc',
            context: {internal: true},
            withRelated: ['tags'],
            columns: ['id', 'title', 'status', 'published_at', 'slug', 'url']
        };

        const posts = await models.Post.findPage(queryOptions);
        return {
            total: posts.meta.pagination.total,
            posts: posts.data.map(p => ({
                id: p.id,
                title: p.get('title'),
                status: p.get('status'),
                publishedAt: p.get('published_at'),
                slug: p.get('slug'),
                tags: p.related('tags').map(t => t.get('name'))
            }))
        };
    }

    async browse_pages(args, options) {
        const queryOptions = {
            ...options,
            filter: args.filter ? `type:page+${args.filter}` : 'type:page',
            limit: args.limit || 15,
            order: 'published_at desc',
            context: {internal: true},
            columns: ['id', 'title', 'status', 'published_at', 'slug', 'url']
        };

        const pages = await models.Post.findPage(queryOptions);
        return {
            total: pages.meta.pagination.total,
            pages: pages.data.map(p => ({
                id: p.id,
                title: p.get('title'),
                status: p.get('status'),
                publishedAt: p.get('published_at'),
                slug: p.get('slug')
            }))
        };
    }

    async semantic_link_suggestion(args, options) {
        const semanticLinker = require('../services/semantic-linker');
        const service = semanticLinker.getService();

        return await service.getLinkSuggestions(
            args.post_id,
            null,
            options
        );
    }

    async predictive_taxonomy(args, options) {
        const taxonomySuggester = require('../services/taxonomy-suggester');
        const service = taxonomySuggester.getService();

        const result = await service.suggestTags(args.post_id, options);

        if (args.apply_suggestions && result.suggestions.length > 0) {
            const applied = await service.autoApplyTags(
                args.post_id,
                result.suggestions,
                options
            );
            return {...result, applied};
        }

        return result;
    }

    // --- Helpers ---

    _getDateFrom(period) {
        const now = new Date();
        switch (period) {
        case '7d':
            now.setDate(now.getDate() - 7);
            break;
        case '30d':
            now.setDate(now.getDate() - 30);
            break;
        case '90d':
            now.setDate(now.getDate() - 90);
            break;
        case 'all':
            return undefined;
        default:
            now.setDate(now.getDate() - 30);
        }
        return now.toISOString().split('T')[0];
    }
}

module.exports = new ActionExecutor();
