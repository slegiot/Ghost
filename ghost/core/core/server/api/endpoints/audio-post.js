const {getService} = require('../../services');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'audio',

    metadata: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('audio-service');
            return await service.getAudioMetadata(frame.data.post_id, frame.options);
        }
    },

    list: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('audio-service');
            return await service.listPostsWithAudio(frame.options);
        }
    },

    generate: {
        statusCode: 200,
        headers: {cacheInvalidate: true},
        permissions: permissionsConfig,
        async query(frame) {
            const service = getService('audio-service');
            return await service.generateAudio(
                frame.data.post_id,
                frame.data.voice_id || 'default',
                frame.options
            );
        }
    }
};

module.exports = controller;
