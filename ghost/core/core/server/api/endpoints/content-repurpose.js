const contentRepurpose = require('../../services/content-repurpose');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'content_repurpose',

    repurpose: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = contentRepurpose.getService();
            return await service.repurpose(
                frame.data.post_id,
                frame.data.formats || ['linkedin', 'twitter', 'newsletter'],
                frame.options
            );
        }
    }
};

module.exports = controller;
