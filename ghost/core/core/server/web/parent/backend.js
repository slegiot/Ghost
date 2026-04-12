const debug = require('@tryghost/debug')('web:backend');
const express = require('../../../shared/express');
const {BASE_API_PATH} = require('../../../shared/url-utils');

/**
 *
 * @returns {import('express').Application}
 */
module.exports = () => {
    debug('BackendApp setup start');
    // BACKEND
    // Wrap the admin and API apps into a single express app for use with vhost
    const backendApp = express('backend');

    if (process.env.NODE_ENV === 'development') {
        backendApp.get('/ghost/debug-sentry', function debugSentryHandler(req, res, next) {
            try {
                throw new Error('My first Sentry error!');
            } catch (err) {
                next(err);
            }
        });
    }

    backendApp.lazyUse(BASE_API_PATH, require('../api'));
    backendApp.lazyUse('/ghost/.well-known', require('../well-known'));

    backendApp.use('/ghost', require('../../services/auth/session').createSessionFromToken(), require('../admin')());

    return backendApp;
};
