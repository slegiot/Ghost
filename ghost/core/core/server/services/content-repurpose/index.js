const {assertServiceReady} = require('../ai-service-utils');

let contentRepurposeInstance;

const service = module.exports = {
    name: 'content-repurpose',
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
            const ContentRepurposeService = require('./content-repurpose-service');
            contentRepurposeInstance = new ContentRepurposeService({models});
            this._initialized = true;
            logging.info('Content Repurpose service initialised');
        } catch (err) {
            logging.error({err, message: '[content-repurpose] init failed'});
            contentRepurposeInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return contentRepurposeInstance;
    }
};
