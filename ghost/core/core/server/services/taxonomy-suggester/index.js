const {assertServiceReady} = require('../ai-service-utils');

let taxonomySuggesterInstance;

const service = module.exports = {
    name: 'taxonomy-suggester',
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
            const TaxonomySuggesterService = require('./taxonomy-suggester-service');
            taxonomySuggesterInstance = new TaxonomySuggesterService({models});
            this._initialized = true;
            logging.info('Taxonomy Suggester service initialised');
        } catch (err) {
            logging.error({err, message: '[taxonomy-suggester] init failed'});
            taxonomySuggesterInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return taxonomySuggesterInstance;
    }
};
