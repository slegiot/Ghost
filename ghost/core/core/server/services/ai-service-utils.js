const errors = require('@tryghost/errors');

/**
 * @param {string} serviceName
 * @param {boolean} isReady
 */
function assertServiceReady(serviceName, isReady) {
    if (!isReady) {
        throw new errors.InternalServerError({
            message: `Service ${serviceName} is not initialized.`,
            statusCode: 503
        });
    }
}

module.exports = {
    assertServiceReady
};
