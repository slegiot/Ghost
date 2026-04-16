/**
 * Validates AI provider configuration against enabled features.
 *
 * @param {Awaited<ReturnType<import('./index').getConfig>>} config
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];

    const requiredByFeature = [
        {feature: 'aiAgent', label: 'AI Agent', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey)},
        {feature: 'semanticLinker', label: 'Semantic Linker', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey || config.openai.apiKey)},
        {feature: 'audioPost', label: 'Audio Post', provider: 'ElevenLabs API key', isConfigured: Boolean(config.elevenlabs.apiKey)},
        {feature: 'styleGuard', label: 'Style Guard', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey)},
        {feature: 'contentRepurpose', label: 'Content Repurpose', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey)},
        {feature: 'editorAiTools', label: 'Editor AI Tools', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey)},
        {feature: 'contentGap', label: 'Content Gap', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey)},
        {feature: 'seocopilot', label: 'SEO Copilot', provider: 'OpenRouter API key', isConfigured: Boolean(config.openrouter.apiKey)}
    ];

    requiredByFeature.forEach((entry) => {
        if (config.features[entry.feature] && !entry.isConfigured) {
            errors.push(`${entry.label} is enabled but ${entry.provider} is missing.`);
        }
    });

    if (!config.openrouter.apiKey) {
        warnings.push('OpenRouter API key is not configured.');
    }
    if (!config.elevenlabs.apiKey) {
        warnings.push('ElevenLabs API key is not configured.');
    }
    if (!config.openai.apiKey) {
        warnings.push('OpenAI API key is not configured.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

module.exports = {
    validateConfig
};
