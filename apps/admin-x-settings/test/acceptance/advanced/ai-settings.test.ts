import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('AI settings', async () => {
    test('Hides AI settings when endpoint is unavailable', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseAiSettings: {
                method: 'GET',
                path: '/ai-settings/',
                responseStatus: 404,
                response: {
                    errors: [{
                        code: 'NOT_FOUND',
                        context: null,
                        details: null,
                        ghostErrorCode: null,
                        help: '',
                        id: 'ai-settings-not-found',
                        message: 'Not found',
                        property: null,
                        type: 'NotFoundError'
                    }]
                }
            }
        }});

        const aiSettingsResponse = page.waitForResponse(response => response.url().includes('/ghost/api/admin/ai-settings/'));

        await page.goto('/');
        await aiSettingsResponse;

        await expect(page.getByTestId('ai-settings')).toHaveCount(0);
        await expect(page.getByText('Something went wrong while loading ai, please try again.')).toHaveCount(0);
    });
});
