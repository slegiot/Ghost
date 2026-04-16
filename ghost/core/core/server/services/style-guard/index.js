const {assertServiceReady} = require('../ai-service-utils');

let styleGuardInstance;

const service = module.exports = {
    name: 'style-guard',
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
            const StyleGuardService = require('./style-guard-service');
            styleGuardInstance = new StyleGuardService({models});
            this._initialized = true;
            logging.info('Style Guard service initialised');
        } catch (err) {
            logging.error({err, message: '[style-guard] init failed'});
            styleGuardInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return styleGuardInstance;
    }
};
