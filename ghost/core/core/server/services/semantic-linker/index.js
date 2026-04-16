const {assertServiceReady} = require('../ai-service-utils');

let semanticLinkerServiceInstance;

const service = module.exports = {
    name: 'semantic-linker',
    _initialized: false,

    /**
     * @param {object} ctx
     * @param {import('../../../shared/config')} ctx.config
     * @param {object} ctx.models
     * @param {typeof import('@tryghost/logging')} ctx.logging
     * @param {object} ctx.aiConfig
     */
    async init(ctx) {
        const {models, logging} = ctx;
        try {
            const SemanticLinkerService = require('./semantic-linker-service');
            semanticLinkerServiceInstance = new SemanticLinkerService({models});
            this._initialized = true;
            logging.info('Semantic Linker service initialised');
        } catch (err) {
            logging.error({err, message: '[semantic-linker] init failed'});
            semanticLinkerServiceInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return semanticLinkerServiceInstance;
    }
};
