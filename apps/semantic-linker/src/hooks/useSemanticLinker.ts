import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface LinkSuggestion {
    postId: string;
    title: string;
    url: string;
    similarity: number;
    suggestedAnchors: string[];
    excerpt: string;
}

interface LinkSuggestionsResponse {
    suggestions: LinkSuggestion[];
    totalAnalyzed: number;
}

interface IndexResponse {
    postId: string;
    keywords: Array<{term: string; count: number; score: number}>;
    keywordCount: number;
}

interface IndexAllResponse {
    indexed: number;
    errors: number;
    total: number;
}

export function useSemanticLinker() {
    const {apiRoot} = getGhostPaths();

    const fetchSuggestions = async (postId: string, content?: string): Promise<LinkSuggestionsResponse> => {
        const response = await fetch(`${apiRoot}/semantic-linker/suggestions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
                post_id: postId,
                content: content || null
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Semantic linker suggestions failed (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data.semantic_linker[0] as LinkSuggestionsResponse;
    };

    const indexPost = async (postId: string): Promise<IndexResponse> => {
        const response = await fetch(`${apiRoot}/semantic-linker/index/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
                post_id: postId
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Semantic linker index failed (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data.semantic_linker[0] as IndexResponse;
    };

    const indexAll = async (): Promise<IndexAllResponse> => {
        const response = await fetch(`${apiRoot}/semantic-linker/index-all/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Semantic linker index-all failed (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data.semantic_linker[0] as IndexAllResponse;
    };

    return {fetchSuggestions, indexPost, indexAll};
}

export type {LinkSuggestion, LinkSuggestionsResponse, IndexResponse, IndexAllResponse};
