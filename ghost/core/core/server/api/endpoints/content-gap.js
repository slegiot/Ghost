const contentGap = require('../../services/content-gap');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'content_gap',

    analyze: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = contentGap.getService();
            return await service.analyzeTopicalAuthority(frame.options);
        }
    }
};

module.exports = controller;
