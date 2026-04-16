const {assertServiceReady} = require('../ai-service-utils');

let contentGapInstance;

const service = module.exports = {
    name: 'content-gap',
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
            const ContentGapService = require('./content-gap-service');
            contentGapInstance = new ContentGapService({models});
            this._initialized = true;
            logging.info('Content Gap service initialised');
        } catch (err) {
            logging.error({err, message: '[content-gap] init failed'});
            contentGapInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return contentGapInstance;
    }
};
