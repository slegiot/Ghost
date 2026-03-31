const semanticLinker = require('../../services/semantic-linker');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'semantic_linker',

    linkSuggestions: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        permissions: permissionsConfig,
        async query(frame) {
            const service = semanticLinker.getService();
            return await service.getLinkSuggestions(
                frame.data.post_id,
                frame.data.content || null,
                frame.options
            );
        }
    },

    indexPost: {
        statusCode: 200,
        headers: {
            cacheInvalidate: true
        },
        permissions: permissionsConfig,
        async query(frame) {
            const service = semanticLinker.getService();
            return await service.indexPost(frame.data.post_id, frame.options);
        }
    },

    indexAll: {
        statusCode: 200,
        headers: {
            cacheInvalidate: true
        },
        permissions: permissionsConfig,
        async query(frame) {
            const service = semanticLinker.getService();
            return await service.indexAllPosts(frame.options);
        }
    }
};

module.exports = controller;
