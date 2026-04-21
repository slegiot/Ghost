import React, {useMemo, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {
    Button,
    Input,
    Label,
    Switch
} from '@tryghost/shade';
import {showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {
    useBrowseAiSettings,
    useEditAiSettings,
    useTestAiProvider
} from '@tryghost/admin-x-framework/api/ai-settings';
import {APIError} from '@tryghost/admin-x-framework/errors';

const FIELD_KEYS = {
    openrouterKey: 'ai_openrouter_api_key',
    openrouterBaseUrl: 'ai_openrouter_base_url',
    openrouterModel: 'ai_openrouter_default_model',
    openrouterEmbeddingModel: 'ai_openrouter_embedding_model',
    elevenlabsKey: 'ai_elevenlabs_api_key',
    elevenlabsVoiceId: 'ai_elevenlabs_default_voice_id',
    openaiKey: 'ai_openai_api_key'
};

const FEATURE_KEYS = [
    {key: 'ai_feature_ai_agent', label: 'AI Agent'},
    {key: 'ai_feature_semantic_linker', label: 'Semantic Linker'},
    {key: 'ai_feature_audio_post', label: 'Audio Post'},
    {key: 'ai_feature_style_guard', label: 'Style Guard'},
    {key: 'ai_feature_content_repurpose', label: 'Content Repurpose'},
    {key: 'ai_feature_editor_ai_tools', label: 'Editor AI Tools'},
    {key: 'ai_feature_content_gap', label: 'Content Gap'},
    {key: 'ai_feature_seocopilot', label: 'SEO Copilot'}
];

const AiSettings: React.FC<{keywords: string[]}> = ({keywords}) => {
    const {data, error} = useBrowseAiSettings({
        defaultErrorHandler: false,
        retry: false
    });
    const {mutateAsync: saveSettings, isLoading: isSaving} = useEditAiSettings();
    const {mutateAsync: testProvider, isLoading: isTesting} = useTestAiProvider();

    const errorStatus = error instanceof APIError ? error.response?.status : undefined;

    // Treat the AI admin endpoint as optional so older or mismatched backends
    // don't show an unrelated global toast elsewhere in Settings.
    if (errorStatus === 404 || errorStatus === 405 || errorStatus === 501) {
        return null;
    }

    if (error) {
        throw error;
    }

    const settingByKey = useMemo(() => {
        const settings = data?.settings || [];
        return new Map(settings.map(setting => [setting.key, setting]));
    }, [data?.settings]);

    const [values, setValues] = useState<Record<string, string>>({});

    const setValue = (key: string, value: string) => {
        setValues(current => ({
            ...current,
            [key]: value
        }));
    };

    const isConfigured = (key: string) => Boolean(settingByKey.get(key)?.configured);
    const featureEnabled = (key: string) => Boolean(settingByKey.get(key)?.value);

    const missingEnabledConfig = (
        featureEnabled('ai_feature_ai_agent') && !isConfigured(FIELD_KEYS.openrouterKey)
    ) || (
        featureEnabled('ai_feature_semantic_linker') && !isConfigured(FIELD_KEYS.openrouterKey) && !isConfigured(FIELD_KEYS.openaiKey)
    ) || (
        featureEnabled('ai_feature_audio_post') && !isConfigured(FIELD_KEYS.elevenlabsKey)
    );

    const saveSingleSetting = async (key: string, value: string | boolean) => {
        await saveSettings([{key, value}]);
    };

    const saveSecretField = async (key: string) => {
        const value = values[key] || '';
        await saveSingleSetting(key, value);
        setValue(key, '');
        showToast({title: 'Saved AI setting', type: 'success'});
    };

    const savePlainField = async (key: string) => {
        const value = values[key] ?? String(settingByKey.get(key)?.value || '');
        await saveSingleSetting(key, value);
        showToast({title: 'Saved AI setting', type: 'success'});
    };

    return (
        <TopLevelGroup
            customHeader={
                <div className='flex items-start justify-between'>
                    <div>
                        <h3 className='text-lg font-semibold'>AI Settings</h3>
                        <p className='mt-1 text-sm text-gray-600 dark:text-gray-300'>Configure providers and enable AI features used across custom tools.</p>
                    </div>
                </div>
            }
            keywords={keywords}
            navid='ai-settings'
            testId='ai-settings'
        >
            <div className='space-y-6'>
                {missingEnabledConfig && (
                    <div className='rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'>
                        Some enabled AI features are missing required API keys.
                    </div>
                )}

                <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                        <Label htmlFor='openrouter-key'>OpenRouter API Key</Label>
                        <span className='text-xs font-medium'>{isConfigured(FIELD_KEYS.openrouterKey) ? 'Configured' : 'Not configured'}</span>
                    </div>
                    <div className='flex gap-2'>
                        <Input id='openrouter-key' type='password' value={values[FIELD_KEYS.openrouterKey] || ''} onChange={e => setValue(FIELD_KEYS.openrouterKey, e.target.value)} />
                        <Button disabled={isSaving} onClick={() => saveSecretField(FIELD_KEYS.openrouterKey)}>Save</Button>
                        <Button disabled={isTesting} variant='outline' onClick={() => testProvider('openrouter')}>Test Connection</Button>
                    </div>
                </div>

                <div className='space-y-3'>
                    <Label htmlFor='elevenlabs-key'>ElevenLabs API Key</Label>
                    <div className='flex gap-2'>
                        <Input id='elevenlabs-key' type='password' value={values[FIELD_KEYS.elevenlabsKey] || ''} onChange={e => setValue(FIELD_KEYS.elevenlabsKey, e.target.value)} />
                        <Button disabled={isSaving} onClick={() => saveSecretField(FIELD_KEYS.elevenlabsKey)}>Save</Button>
                        <Button disabled={isTesting} variant='outline' onClick={() => testProvider('elevenlabs')}>Test Connection</Button>
                    </div>
                </div>

                <div className='space-y-3'>
                    <Label htmlFor='openai-key'>OpenAI API Key (fallback)</Label>
                    <div className='flex gap-2'>
                        <Input id='openai-key' type='password' value={values[FIELD_KEYS.openaiKey] || ''} onChange={e => setValue(FIELD_KEYS.openaiKey, e.target.value)} />
                        <Button disabled={isSaving} onClick={() => saveSecretField(FIELD_KEYS.openaiKey)}>Save</Button>
                        <Button disabled={isTesting} variant='outline' onClick={() => testProvider('openai')}>Test Connection</Button>
                    </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label htmlFor='openrouter-base-url'>OpenRouter Base URL</Label>
                        <Input id='openrouter-base-url' value={values[FIELD_KEYS.openrouterBaseUrl] ?? String(settingByKey.get(FIELD_KEYS.openrouterBaseUrl)?.value || '')} onChange={e => setValue(FIELD_KEYS.openrouterBaseUrl, e.target.value)} />
                        <Button disabled={isSaving} size='sm' variant='outline' onClick={() => savePlainField(FIELD_KEYS.openrouterBaseUrl)}>Save</Button>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='openrouter-model'>OpenRouter Default Model</Label>
                        <Input id='openrouter-model' value={values[FIELD_KEYS.openrouterModel] ?? String(settingByKey.get(FIELD_KEYS.openrouterModel)?.value || '')} onChange={e => setValue(FIELD_KEYS.openrouterModel, e.target.value)} />
                        <Button disabled={isSaving} size='sm' variant='outline' onClick={() => savePlainField(FIELD_KEYS.openrouterModel)}>Save</Button>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='openrouter-embedding-model'>OpenRouter Embedding Model</Label>
                        <Input id='openrouter-embedding-model' value={values[FIELD_KEYS.openrouterEmbeddingModel] ?? String(settingByKey.get(FIELD_KEYS.openrouterEmbeddingModel)?.value || '')} onChange={e => setValue(FIELD_KEYS.openrouterEmbeddingModel, e.target.value)} />
                        <Button disabled={isSaving} size='sm' variant='outline' onClick={() => savePlainField(FIELD_KEYS.openrouterEmbeddingModel)}>Save</Button>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='elevenlabs-voice-id'>ElevenLabs Default Voice ID</Label>
                        <Input id='elevenlabs-voice-id' value={values[FIELD_KEYS.elevenlabsVoiceId] ?? String(settingByKey.get(FIELD_KEYS.elevenlabsVoiceId)?.value || '')} onChange={e => setValue(FIELD_KEYS.elevenlabsVoiceId, e.target.value)} />
                        <Button disabled={isSaving} size='sm' variant='outline' onClick={() => savePlainField(FIELD_KEYS.elevenlabsVoiceId)}>Save</Button>
                    </div>
                </div>

                <div className='space-y-3'>
                    <h4 className='text-sm font-semibold'>Feature Toggles</h4>
                    {FEATURE_KEYS.map(feature => (
                        <div key={feature.key} className='flex items-center justify-between'>
                            <Label htmlFor={feature.key}>{feature.label}</Label>
                            <Switch
                                checked={featureEnabled(feature.key)}
                                id={feature.key}
                                onCheckedChange={checked => saveSingleSetting(feature.key, checked)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(AiSettings, 'AI Settings');
