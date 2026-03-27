const aiAgentService = require('../../services/ai-agent');
const executor = require('../../services/ai-agent/executor');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'ai_agent',

    chat: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
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
        permissions: true,
        async query(frame) {
            const results = await executor.executeAll(
                frame.data.actions,
                frame.options
            );
            return {results};
        }
    }
};

module.exports = controller;
