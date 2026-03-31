const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let contentRepurposeInstance;

module.exports = {
    async init({models}) {
        const ContentRepurposeService = require('./content-repurpose-service');
        contentRepurposeInstance = new ContentRepurposeService({models});
        logging.info('Content Repurpose service initialised');
    },

    getService() {
        if (!contentRepurposeInstance) {
            throw new errors.InternalServerError({message: 'Content Repurpose service has not been initialised'});
        }
        return contentRepurposeInstance;
    }
};
