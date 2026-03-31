const taxonomySuggester = require('../../services/taxonomy-suggester');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'taxonomy_suggester',

    suggest: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = taxonomySuggester.getService();
            return await service.suggestTags(frame.data.post_id, frame.options);
        }
    },

    apply: {
        statusCode: 200,
        headers: {cacheInvalidate: true},
        permissions: permissionsConfig,
        async query(frame) {
            const service = taxonomySuggester.getService();
            return await service.autoApplyTags(
                frame.data.post_id,
                frame.data.suggestions || [],
                frame.options
            );
        }
    },

    suggestBatch: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = taxonomySuggester.getService();
            return await service.suggestForRecent(frame.data.limit || 10, frame.options);
        }
    }
};

module.exports = controller;
