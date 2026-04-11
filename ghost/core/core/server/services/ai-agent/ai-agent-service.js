const tools = require('./tools');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

const SYSTEM_PROMPT = `You are an AI assistant embedded in the Ghost CMS admin panel. You help site administrators manage their content, optimise their site, and understand their analytics.

You have access to the following tools to interact with the Ghost CMS:

${tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')}

IMPORTANT RULES:
1. When the user asks you to perform an action (create, edit, delete, send), ALWAYS use the appropriate tool call. Never just describe what you would do.
2. For analytics/data questions, use the analyse_data tool to fetch real data before responding.
3. When auto-tagging, first browse the content to understand it, then suggest specific tags.
4. When optimising content, explain what you changed and why.
5. When linking related content, explain the relevance between linked items.
6. Be concise and action-oriented. This is a CMS tool, not a general chatbot.
7. If a request is ambiguous, ask for clarification before acting.
8. When the user asks about topics, past content, or "what have I written about X", use the search_content tool to find relevant existing content before responding.
9. Use search_content to ground your answers in actual site data — cite specific post titles and URLs when referring to existing content.`;

class AiAgentService {
    constructor({apiKey, model, baseUrl}) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
        this.mockMode = !apiKey;

        if (this.mockMode) {
            logging.warn('AI Agent running in mock mode — no OpenRouter API key configured');
        }
    }

    /**
     * Process a chat message and return the agent's response with any pending actions
     */
    async chat({message, conversationHistory = []}) {
        if (this.mockMode) {
            return this._mockChat(message);
        }

        const messages = [
            {role: 'system', content: SYSTEM_PROMPT},
            ...conversationHistory.map(m => ({
                role: m.role,
                content: m.content
            })),
            {role: 'user', content: message}
        ];

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://ghost.org',
                    'X-Title': 'Ghost CMS AI Agent'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    tools,
                    tool_choice: 'auto',
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.text();
                logging.error(`OpenRouter API error: ${error}`);
                throw new errors.InternalServerError({message: `AI service returned ${response.status}`});
            }

            const data = await response.json();
            const choice = data.choices[0];

            if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
                const pendingActions = choice.message.tool_calls.map(tc => ({
                    id: tc.id,
                    tool: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments)
                }));

                return {
                    message: choice.message.content || 'I\'d like to perform the following actions:',
                    pendingActions,
                    status: 'awaiting_confirmation'
                };
            }

            return {
                message: choice.message.content,
                pendingActions: [],
                status: 'complete'
            };
        } catch (err) {
            logging.error({err, message: 'AI Agent chat error'});
            throw err;
        }
    }

    /**
     * Mock responses for development without an API key
     */
    _mockChat(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('create') && lowerMessage.includes('page')) {
            return {
                message: 'I\'ll create a new page for you. Here\'s what I\'m proposing:',
                pendingActions: [{
                    id: 'mock-1',
                    tool: 'create_page',
                    arguments: {
                        title: 'About Us',
                        content: '<p>Welcome to our site. This page was created by the AI Agent.</p>',
                        status: 'draft',
                        tags: ['about']
                    }
                }],
                status: 'awaiting_confirmation'
            };
        }

        if (lowerMessage.includes('tag') || lowerMessage.includes('auto-tag')) {
            return {
                message: 'I\'ll analyse your recent posts and suggest tags. Here\'s my proposal:',
                pendingActions: [{
                    id: 'mock-2',
                    tool: 'auto_tag',
                    arguments: {
                        scope: 'recent',
                        limit: 10
                    }
                }],
                status: 'awaiting_confirmation'
            };
        }

        if (lowerMessage.includes('stats') || lowerMessage.includes('analy')) {
            return {
                message: 'I\'ll pull your site analytics now.',
                pendingActions: [{
                    id: 'mock-3',
                    tool: 'analyse_data',
                    arguments: {
                        metrics: ['member_count', 'mrr', 'top_posts'],
                        period: '30d'
                    }
                }],
                status: 'awaiting_confirmation'
            };
        }

        if (lowerMessage.includes('newsletter') || lowerMessage.includes('send')) {
            return {
                message: 'I can help you send a newsletter. Which post would you like to send?',
                pendingActions: [],
                status: 'complete'
            };
        }

        if (lowerMessage.includes('optimis') || lowerMessage.includes('optimiz')) {
            return {
                message: 'I\'ll review your content and suggest optimisations. Which post would you like me to look at?',
                pendingActions: [],
                status: 'complete'
            };
        }

        if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('written about')) {
            return {
                message: 'I\'ll search your site content for relevant posts.',
                pendingActions: [{
                    id: 'mock-search-1',
                    tool: 'search_content',
                    arguments: {
                        query: message,
                        limit: 5
                    }
                }],
                status: 'awaiting_confirmation'
            };
        }

        return {
            message: 'I can help you with:\n\n• **Creating pages and posts** — "Create a new About page"\n• **Auto-tagging content** — "Auto-tag my recent posts"\n• **Linking related content** — "Find and link related posts"\n• **Optimising content** — "Optimise my latest post for SEO"\n• **Sending newsletters** — "Send my latest post as a newsletter"\n• **Analysing data** — "Show me my site stats"\n• **Searching content** — "What have I written about AI?"\n\nWhat would you like to do?',
            pendingActions: [],
            status: 'complete'
        };
    }
}

module.exports = AiAgentService;
