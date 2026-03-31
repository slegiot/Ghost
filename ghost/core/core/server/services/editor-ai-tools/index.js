const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let editorAIToolsInstance;

module.exports = {
    async init({models}) {
        const EditorAIToolsService = require('./editor-ai-tools-service');
        editorAIToolsInstance = new EditorAIToolsService({models});
        logging.info('Editor AI Tools service initialised');
    },

    getService() {
        if (!editorAIToolsInstance) {
            throw new errors.InternalServerError({message: 'Editor AI Tools service has not been initialised'});
        }
        return editorAIToolsInstance;
    }
};
