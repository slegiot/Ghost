const settingsService = require('../settings');

/**
 * AI configuration service.
 *
 * @returns {Promise<{
 *   openrouter: {apiKey: string, baseUrl: string, defaultModel: string, embeddingModel: string},
 *   elevenlabs: {apiKey: string, defaultVoiceId: string},
 *   openai: {apiKey: string},
 *   features: {
 *      aiAgent: boolean,
 *      semanticLinker: boolean,
 *      audioPost: boolean,
 *      styleGuard: boolean,
 *      contentRepurpose: boolean,
 *      editorAiTools: boolean,
 *      contentGap: boolean,
 *      seocopilot: boolean
 *   }
 * }>}
 */
async function getConfig() {
    const settingsBREADService = settingsService.getSettingsBREADServiceInstance();
    const {settings = []} = await settingsBREADService.browse({internal: true});
    const map = new Map(settings.map(setting => [setting.key, setting.value]));

    const getString = (key, envKey = null) => {
        const value = map.get(key);
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
        if (envKey && process.env[envKey]) {
            return process.env[envKey].trim();
        }
        return '';
    };

    const getBoolean = (key) => {
        const value = map.get(key);
        return value === true || value === 'true' || value === 1 || value === '1';
    };

    return {
        openrouter: {
            apiKey: getString('ai_openrouter_api_key', 'AI_OPENROUTER_API_KEY'),
            baseUrl: getString('ai_openrouter_base_url', 'AI_OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1',
            defaultModel: getString('ai_openrouter_default_model', 'AI_OPENROUTER_DEFAULT_MODEL') || 'xiaomi/mimo-v2-pro',
            embeddingModel: getString('ai_openrouter_embedding_model', 'AI_OPENROUTER_EMBEDDING_MODEL') || 'text-embedding-3-small'
        },
        elevenlabs: {
            apiKey: getString('ai_elevenlabs_api_key', 'AI_ELEVENLABS_API_KEY'),
            defaultVoiceId: getString('ai_elevenlabs_default_voice_id', 'AI_ELEVENLABS_DEFAULT_VOICE_ID')
        },
        openai: {
            apiKey: getString('ai_openai_api_key', 'AI_OPENAI_API_KEY')
        },
        features: {
            aiAgent: getBoolean('ai_feature_ai_agent'),
            semanticLinker: getBoolean('ai_feature_semantic_linker'),
            audioPost: getBoolean('ai_feature_audio_post'),
            styleGuard: getBoolean('ai_feature_style_guard'),
            contentRepurpose: getBoolean('ai_feature_content_repurpose'),
            editorAiTools: getBoolean('ai_feature_editor_ai_tools'),
            contentGap: getBoolean('ai_feature_content_gap'),
            seocopilot: getBoolean('ai_feature_seocopilot')
        }
    };
}

module.exports = {
    getConfig
};
