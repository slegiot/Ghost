import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

type EditorAITool =
    | 'content-refresh'
    | 'content-gap'
    | 'audio'
    | 'style-check'
    | 'repurpose'
    | 'sentiment'
    | 'paywall'
    | 'alt-text'
    | 'knowledge-base'
    | 'subject-lines'
    | 'image-generate'
    | 'snippets'
    | 'localize';

interface ToolResponse {
    [key: string]: unknown;
}

export function useEditorAI() {
    const {apiRoot} = getGhostPaths();

    const callTool = async (tool: EditorAITool, payload: Record<string, unknown> = {}): Promise<ToolResponse> => {
        const endpointMap: Record<EditorAITool, string> = {
            'content-refresh': 'content-refresh',
            'content-gap': 'content-gap',
            audio: 'audio-metadata',
            'style-check': 'style-check',
            repurpose: 'repurpose',
            sentiment: 'sentiment',
            paywall: 'paywall-suggest',
            'alt-text': 'alt-text',
            'knowledge-base': 'knowledge-base',
            'subject-lines': 'subject-lines',
            'image-generate': 'image-generate',
            snippets: 'snippets',
            localize: 'localize'
        };

        const response = await fetch(`${apiRoot}/editor-ai/${endpointMap[tool]}/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Editor AI tool failed (${response.status}): ${await response.text()}`);
        }

        const data = await response.json();
        return data.editor_ai_tools[0] as ToolResponse;
    };

    const scanContent = async () => {
        const response = await fetch(`${apiRoot}/editor-ai/content-refresh-scan/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({})
        });
        if (!response.ok) {
            throw new Error(`Scan failed (${response.status})`);
        }
        const data = await response.json();
        return data.editor_ai_tools[0];
    };

    return {callTool, scanContent};
}

export type {EditorAITool, ToolResponse};
