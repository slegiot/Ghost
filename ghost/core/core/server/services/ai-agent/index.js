const {validateConfig} = require('../ai-config/validator');
const {assertServiceReady} = require('../ai-service-utils');

let aiAgentServiceInstance;

const service = module.exports = {
    name: 'ai-agent',
    _initialized: false,

    /**
     * @param {object} ctx
     * @param {import('../../../shared/config')} ctx.config
     * @param {object} ctx.models
     * @param {typeof import('@tryghost/logging')} ctx.logging
     * @param {object} ctx.aiConfig
     */
    async init(ctx) {
        const {logging, aiConfig} = ctx;
        try {
            const AiAgentService = require('./ai-agent-service');
            const validation = validateConfig(aiConfig);

            validation.warnings.forEach((warning) => {
                logging.warn(`[AI Config] ${warning}`);
            });
            validation.errors.forEach((error) => {
                logging.warn(`[AI Config] ${error}`);
            });

            aiAgentServiceInstance = new AiAgentService({
                apiKey: aiConfig.openrouter.apiKey,
                model: aiConfig.openrouter.defaultModel,
                baseUrl: aiConfig.openrouter.baseUrl
            });

            this._initialized = true;
            logging.info('AI Agent service initialised');
        } catch (err) {
            logging.error({err, message: '[ai-agent] init failed'});
            aiAgentServiceInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return aiAgentServiceInstance;
    }
};
