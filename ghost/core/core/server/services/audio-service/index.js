const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
let audioServiceInstance;

module.exports = {
    async init({models}) {
        const AudioService = require('./audio-service');
        audioServiceInstance = new AudioService({models});
        logging.info('Audio service initialised');
    },

    getService() {
        if (!audioServiceInstance) {
            throw new errors.InternalServerError({message: 'Audio service has not been initialised'});
        }
        return audioServiceInstance;
    }
};
