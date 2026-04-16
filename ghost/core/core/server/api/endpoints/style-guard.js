const {getService} = require('../../services');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'style_guard',

    check: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('style-guard');
            return await service.checkContent(frame.data.post_id, frame.data.style_guide || null, frame.options);
        }
    },

    checkBatch: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('style-guard');
            return await service.checkBatch(frame.data.post_ids || [], frame.options);
        }
    },

    getGuide: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('style-guard');
            return await service.getStyleGuide(frame.options);
        }
    },

    updateGuide: {
        statusCode: 200,
        headers: {cacheInvalidate: true},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('style-guard');
            return await service.updateStyleGuide(frame.data.style_guide || {}, frame.options);
        }
    }
};

module.exports = controller;
