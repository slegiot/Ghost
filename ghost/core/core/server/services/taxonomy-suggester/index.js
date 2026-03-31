const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let taxonomySuggesterInstance;

module.exports = {
    async init({models}) {
        const TaxonomySuggesterService = require('./taxonomy-suggester-service');
        taxonomySuggesterInstance = new TaxonomySuggesterService({models});
        logging.info('Taxonomy Suggester service initialised');
    },

    getService() {
        if (!taxonomySuggesterInstance) {
            throw new errors.InternalServerError({message: 'Taxonomy Suggester service has not been initialised'});
        }
        return taxonomySuggesterInstance;
    }
};
