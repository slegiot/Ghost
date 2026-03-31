const logging = require('@tryghost/logging');

let aiAgentServiceInstance;

module.exports = {
    async init() {
        const AiAgentService = require('./ai-agent-service');
        const config = require('../../../shared/config');

        const apiKey = config.get('ai_agent:openrouter_api_key') || process.env.OPENROUTER_API_KEY;

        aiAgentServiceInstance = new AiAgentService({
            apiKey,
            model: config.get('ai_agent:model') || 'xiaomi/mimo-v2-pro',
            baseUrl: config.get('ai_agent:base_url') || 'https://openrouter.ai/api/v1'
        });

        logging.info('AI Agent service initialised');
    },

    getService() {
        if (!aiAgentServiceInstance) {
            const errors = require('@tryghost/errors');
            throw new errors.InternalServerError({message: 'AI Agent service has not been initialised'});
        }
        return aiAgentServiceInstance;
    }
};
