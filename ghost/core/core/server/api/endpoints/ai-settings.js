const settingsService = require('../../services/settings/settings-service');
const aiConfig = require('../../services/ai-config');
const {validateConfig} = require('../../services/ai-config/validator');

const settingsBREADService = settingsService.getSettingsBREADServiceInstance();

const SETTINGS_KEYS = [
    'ai_openrouter_api_key',
    'ai_openrouter_base_url',
    'ai_openrouter_default_model',
    'ai_openrouter_embedding_model',
    'ai_elevenlabs_api_key',
    'ai_elevenlabs_default_voice_id',
    'ai_openai_api_key',
    'ai_feature_ai_agent',
    'ai_feature_semantic_linker',
    'ai_feature_audio_post',
    'ai_feature_style_guard',
    'ai_feature_content_repurpose',
    'ai_feature_editor_ai_tools',
    'ai_feature_content_gap',
    'ai_feature_seocopilot'
];

const SECRET_KEYS = new Set([
    'ai_openrouter_api_key',
    'ai_elevenlabs_api_key',
    'ai_openai_api_key'
]);

/**
 * Masks AI settings for admin responses.
 *
 * @param {Array<{key: string, value: any}>} settings
 * @returns {{settings: Array<{key: string, value: any, configured?: boolean}>}}
 */
function maskSettings(settings) {
    return {
        settings: settings.map((setting) => {
            if (SECRET_KEYS.has(setting.key)) {
                return {
                    key: setting.key,
                    configured: Boolean(setting.value)
                };
            }

            return {
                key: setting.key,
                value: setting.value
            };
        })
    };
}

/**
 * @param {Awaited<ReturnType<typeof aiConfig.getConfig>>} config
 * @param {string} provider
 */
function buildProviderTestPayload(config, provider) {
    if (provider === 'openrouter') {
        return {
            provider,
            connected: Boolean(config.openrouter.apiKey),
            message: config.openrouter.apiKey ? 'OpenRouter key is configured.' : 'OpenRouter key is missing.'
        };
    }

    if (provider === 'elevenlabs') {
        return {
            provider,
            connected: Boolean(config.elevenlabs.apiKey),
            message: config.elevenlabs.apiKey ? 'ElevenLabs key is configured.' : 'ElevenLabs key is missing.'
        };
    }

    if (provider === 'openai') {
        return {
            provider,
            connected: Boolean(config.openai.apiKey),
            message: config.openai.apiKey ? 'OpenAI key is configured.' : 'OpenAI key is missing.'
        };
    }

    return {
        provider,
        connected: false,
        message: 'Unknown provider.'
    };
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'ai_settings',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query(frame) {
            const {settings = []} = await settingsBREADService.browse(frame.options.context);
            const aiSettings = settings.filter(setting => SETTINGS_KEYS.includes(setting.key));
            return maskSettings(aiSettings);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const incoming = (frame.data?.settings || []).filter(setting => SETTINGS_KEYS.includes(setting.key));
            await settingsBREADService.edit(incoming, frame.options);

            const config = await aiConfig.getConfig();
            const result = validateConfig(config);
            frame.meta = {
                warnings: result.warnings,
                errors: result.errors
            };

            const {settings = []} = await settingsBREADService.browse(frame.options.context);
            const aiSettings = settings.filter(setting => SETTINGS_KEYS.includes(setting.key));
            return maskSettings(aiSettings);
        }
    },

    test: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: ['provider'],
        validation: {
            options: {
                provider: {
                    required: true
                }
            }
        },
        async query(frame) {
            const config = await aiConfig.getConfig();
            return buildProviderTestPayload(config, frame.options.provider);
        }
    }
};

module.exports = controller;
