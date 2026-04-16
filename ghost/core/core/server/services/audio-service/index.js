const {assertServiceReady} = require('../ai-service-utils');

let audioServiceInstance;

const service = module.exports = {
    name: 'audio-service',
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
            const AudioService = require('./audio-service');
            audioServiceInstance = new AudioService({models});
            this._initialized = true;
            logging.info('Audio service initialised');
        } catch (err) {
            logging.error({err, message: '[audio-service] init failed'});
            audioServiceInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return audioServiceInstance;
    }
};
