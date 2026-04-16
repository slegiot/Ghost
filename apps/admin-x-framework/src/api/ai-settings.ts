import {createMutation, createQuery} from '../utils/api/hooks';

export type AiSetting = {
    key: string;
    value?: string | boolean | null;
    configured?: boolean;
};

export interface AiSettingsResponse {
    settings: AiSetting[];
}

const dataType = 'AiSettingsResponse';

export const useBrowseAiSettings = createQuery<AiSettingsResponse>({
    dataType,
    path: '/ai-settings/'
});

export const useEditAiSettings = createMutation<AiSettingsResponse, Array<{key: string; value: string | boolean}>>({
    method: 'PUT',
    path: () => '/ai-settings/',
    body: settings => ({settings}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData: AiSettingsResponse) => newData
    }
});

export const useTestAiProvider = createMutation<{provider: string; connected: boolean; message: string}, string>({
    method: 'POST',
    path: provider => `/ai-settings/test/${provider}/`
});
