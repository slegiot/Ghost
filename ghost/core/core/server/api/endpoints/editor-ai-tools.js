const editorAITools = require('../../services/editor-ai-tools');

const permissionsConfig = {
    docName: 'posts',
    method: 'browse'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'editor_ai_tools',

    contentRefresh: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.detectDecay(frame.data.post_id, frame.options);
        }
    },

    contentRefreshScan: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.scanAllPosts(frame.options);
        }
    },

    contentGap: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.analyzeContentGaps(frame.options);
        }
    },

    audioMetadata: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.generateAudioMetadata(frame.data.post_id, frame.data.voice_id, frame.options);
        }
    },

    styleCheck: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.checkStyle(frame.data.post_id, frame.data.style_guide || {}, frame.options);
        }
    },

    repurpose: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.repurposeContent(frame.data.post_id, frame.data.formats, frame.options);
        }
    },

    sentiment: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.analyzeSentiment(frame.data.post_id, frame.options);
        }
    },

    paywallSuggest: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.suggestPaywallPosition(frame.data.post_id, frame.options);
        }
    },

    altText: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.generateAltText(frame.data.image_url, frame.data.context);
        }
    },

    knowledgeBase: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.queryKnowledgeBase(frame.data.question, frame.options);
        }
    },

    subjectLines: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.predictSubjectLines(frame.data.post_id, frame.options);
        }
    },

    imageGenerate: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.generateImageContext(frame.data.post_id, frame.options);
        }
    },

    snippets: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.extractSnippets(frame.data.post_id, frame.data.max_snippets, frame.options);
        }
    },

    localize: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: permissionsConfig,
        async query(frame) {
            const service = editorAITools.getService();
            return await service.localizeContent(frame.data.post_id, frame.data.locale, frame.options);
        }
    }
};

module.exports = controller;
