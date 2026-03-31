const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let contentGapInstance;

module.exports = {
    async init({models}) {
        const ContentGapService = require('./content-gap-service');
        contentGapInstance = new ContentGapService({models});
        logging.info('Content Gap service initialised');
    },

    getService() {
        if (!contentGapInstance) {
            throw new errors.InternalServerError({message: 'Content Gap service has not been initialised'});
        }
        return contentGapInstance;
    }
};
