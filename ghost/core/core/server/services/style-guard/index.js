const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let styleGuardInstance;

module.exports = {
    async init({models}) {
        const StyleGuardService = require('./style-guard-service');
        styleGuardInstance = new StyleGuardService({models});
        logging.info('Style Guard service initialised');
    },

    getService() {
        if (!styleGuardInstance) {
            throw new errors.InternalServerError({message: 'Style Guard service has not been initialised'});
        }
        return styleGuardInstance;
    }
};
