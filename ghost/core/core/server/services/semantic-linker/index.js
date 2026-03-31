const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let semanticLinkerServiceInstance;

module.exports = {
    async init({models}) {
        const SemanticLinkerService = require('./semantic-linker-service');
        semanticLinkerServiceInstance = new SemanticLinkerService({models});
        logging.info('Semantic Linker service initialised');
    },

    getService() {
        if (!semanticLinkerServiceInstance) {
            throw new errors.InternalServerError({message: 'Semantic Linker service has not been initialised'});
        }
        return semanticLinkerServiceInstance;
    }
};
