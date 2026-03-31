import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface StyleFlag {
    phrase: string;
    type: string;
    severity: string;
    suggestion: string;
    context?: string;
}

interface StyleCheckResponse {
    postId: string;
    title: string;
    flags: StyleFlag[];
    flagCount: number;
    passCount: boolean;
    score: number;
    summary: {
        totalSentences: number;
        forbiddenPhrasesFound: number;
        longSentences: number;
        passiveVoice: number;
    };
}

interface StyleGuide {
    id: string;
    name: string;
    toneKeywords: string[];
    forbiddenPhrases: string[];
    preferredPhrases: string[];
    minReadingLevel: string;
    maxSentenceLength: string;
    requireActiveVoice: boolean;
}

export function useStyleGuard() {
    const {apiRoot} = getGhostPaths();

    const checkContent = async (postId: string): Promise<StyleCheckResponse> => {
        const response = await fetch(`${apiRoot}/style-guard/check/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({post_id: postId})
        });
        if (!response.ok) {
            throw new Error(`Style check failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.style_guard[0] as StyleCheckResponse;
    };

    const fetchGuide = async (): Promise<StyleGuide> => {
        const response = await fetch(`${apiRoot}/style-guard/guide/`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Guide fetch failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.style_guard[0] as StyleGuide;
    };

    const updateGuide = async (updates: Partial<StyleGuide>): Promise<StyleGuide> => {
        const response = await fetch(`${apiRoot}/style-guard/guide/`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({style_guide: updates})
        });
        if (!response.ok) {
            throw new Error(`Guide update failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.style_guard[0] as StyleGuide;
    };

    return {checkContent, fetchGuide, updateGuide};
}

export type {StyleFlag, StyleCheckResponse, StyleGuide};
