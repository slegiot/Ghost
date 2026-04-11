const aiAgentService = require('../../services/ai-agent');
const executor = require('../../services/ai-agent/executor');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'ai_agent',

    chat: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        permissions: permissionsConfig,
        async query(frame) {
            const service = aiAgentService.getService();
            return await service.chat({
                message: frame.data.message,
                conversationHistory: frame.data.conversation_history || []
            });
        }
    },

    execute: {
        statusCode: 200,
        headers: {
            cacheInvalidate: true
        },
        permissions: permissionsConfig,
        async query(frame) {
            const results = await executor.executeAll(
                frame.data.actions,
                frame.options
            );
            return {results};
        }
    },

    search: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        permissions: permissionsConfig,
        async query(frame) {
            return await executor.search_content({
                query: frame.data.query,
                limit: frame.data.limit || 5,
                include_content: frame.data.include_content || false
            });
        }
    }
};

module.exports = controller;
