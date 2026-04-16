const {assertServiceReady} = require('../ai-service-utils');

let editorAIToolsInstance;

const service = module.exports = {
    name: 'editor-ai-tools',
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
            const EditorAIToolsService = require('./editor-ai-tools-service');
            editorAIToolsInstance = new EditorAIToolsService({models});
            this._initialized = true;
            logging.info('Editor AI Tools service initialised');
        } catch (err) {
            logging.error({err, message: '[editor-ai-tools] init failed'});
            editorAIToolsInstance = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return editorAIToolsInstance;
    }
};
