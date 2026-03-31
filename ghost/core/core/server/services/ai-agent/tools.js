/**
 * Tool definitions for the AI Agent following OpenAI function calling schema.
 * Each tool maps to an action the agent can perform via Ghost's internal APIs.
 */
const tools = [
    {
        type: 'function',
        function: {
            name: 'create_page',
            description: 'Creates a new page in Ghost CMS with the given title, content, tags, and status.',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'The title of the page'
                    },
                    content: {
                        type: 'string',
                        description: 'The HTML content of the page'
                    },
                    status: {
                        type: 'string',
                        enum: ['draft', 'published'],
                        description: 'The publish status. Default is draft.'
                    },
                    tags: {
                        type: 'array',
                        items: {type: 'string'},
                        description: 'Array of tag names to assign'
                    }
                },
                required: ['title', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_post',
            description: 'Creates a new blog post in Ghost CMS.',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'The title of the post'
                    },
                    content: {
                        type: 'string',
                        description: 'The HTML content of the post'
                    },
                    status: {
                        type: 'string',
                        enum: ['draft', 'published'],
                        description: 'The publish status. Default is draft.'
                    },
                    tags: {
                        type: 'array',
                        items: {type: 'string'},
                        description: 'Array of tag names to assign'
                    },
                    featured: {
                        type: 'boolean',
                        description: 'Whether to feature the post'
                    }
                },
                required: ['title', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'auto_tag',
            description: 'Analyses posts/pages and automatically suggests and applies relevant tags based on content.',
            parameters: {
                type: 'object',
                properties: {
                    scope: {
                        type: 'string',
                        enum: ['all', 'recent', 'untagged'],
                        description: 'Which posts to auto-tag. "recent" = last 10, "untagged" = posts with no tags.'
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of posts to process'
                    }
                },
                required: ['scope']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'link_related',
            description: 'Finds and suggests internal links between related posts and pages based on content similarity.',
            parameters: {
                type: 'object',
                properties: {
                    post_id: {
                        type: 'string',
                        description: 'The ID of a specific post to find related content for. If omitted, scans all recent posts.'
                    },
                    max_links: {
                        type: 'number',
                        description: 'Maximum number of related links to suggest per post. Default 3.'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'optimize_content',
            description: 'Analyses a post or page and suggests content improvements for SEO, readability, or engagement.',
            parameters: {
                type: 'object',
                properties: {
                    post_id: {
                        type: 'string',
                        description: 'The ID of the post/page to optimise'
                    },
                    focus: {
                        type: 'string',
                        enum: ['seo', 'readability', 'engagement', 'all'],
                        description: 'What aspect to optimise for. Default is "all".'
                    }
                },
                required: ['post_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'send_newsletter',
            description: 'Sends a published post as a newsletter email to subscribers.',
            parameters: {
                type: 'object',
                properties: {
                    post_id: {
                        type: 'string',
                        description: 'The ID of the post to send as newsletter'
                    },
                    newsletter_id: {
                        type: 'string',
                        description: 'The ID of the newsletter to send through. If omitted, uses the default newsletter.'
                    }
                },
                required: ['post_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'analyse_data',
            description: 'Retrieves and summarises site analytics data including member counts, MRR, top posts, referrers, and newsletter performance.',
            parameters: {
                type: 'object',
                properties: {
                    metrics: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: ['member_count', 'mrr', 'top_posts', 'referrers', 'newsletter_stats', 'subscriptions']
                        },
                        description: 'Which metrics to retrieve'
                    },
                    period: {
                        type: 'string',
                        enum: ['7d', '30d', '90d', 'all'],
                        description: 'Time period for the data. Default is 30d.'
                    }
                },
                required: ['metrics']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'browse_posts',
            description: 'Browse and search existing blog posts with optional filtering.',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        description: 'NQL filter string, e.g. "status:published" or "tag:news"'
                    },
                    limit: {
                        type: 'number',
                        description: 'Number of posts to return. Default 15.'
                    },
                    order: {
                        type: 'string',
                        description: 'Sort order, e.g. "published_at desc"'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'browse_pages',
            description: 'Browse and search existing pages with optional filtering.',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        description: 'NQL filter string, e.g. "status:published"'
                    },
                    limit: {
                        type: 'number',
                        description: 'Number of pages to return. Default 15.'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'semantic_link_suggestion',
            description: 'Analyzes a post and finds semantically related content for internal linking suggestions using NER and vector similarity.',
            parameters: {
                type: 'object',
                properties: {
                    post_id: {
                        type: 'string',
                        description: 'The ID of the post to find internal link suggestions for'
                    },
                    max_suggestions: {
                        type: 'number',
                        description: 'Maximum number of link suggestions to return. Default 5.'
                    }
                },
                required: ['post_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'predictive_taxonomy',
            description: 'Analyzes post content and suggests tags based on NLP topic extraction, matching against existing tags and identifying content complexity for categorization.',
            parameters: {
                type: 'object',
                properties: {
                    post_id: {
                        type: 'string',
                        description: 'The ID of the post to analyze for tag suggestions'
                    },
                    apply_suggestions: {
                        type: 'boolean',
                        description: 'Whether to automatically apply the suggested tags. Default false.'
                    }
                },
                required: ['post_id']
            }
        }
    }
];

module.exports = tools;
