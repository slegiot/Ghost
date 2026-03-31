import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface TagSuggestion {
    tagName: string;
    tagId: string | null;
    slug: string;
    score: number;
    matchType: 'existing' | 'suggested';
    reason: string;
    isNew: boolean;
}

interface Topic {
    term: string;
    count: number;
    score: number;
    type: string;
}

interface SuggestResponse {
    postId: string;
    suggestions: TagSuggestion[];
    deepDiveSuggestion: boolean;
    wordCount: number;
    complexityScore: number;
    topics: Topic[];
}

interface ApplyResponse {
    postId: string;
    applied: number;
    tags: string[];
}

interface BatchSuggestResponse {
    postsAnalyzed: number;
    results: SuggestResponse[];
}

export function useAutoTagger() {
    const {apiRoot} = getGhostPaths();

    const fetchSuggestions = async (postId: string): Promise<SuggestResponse> => {
        const response = await fetch(`${apiRoot}/taxonomy/suggest/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({post_id: postId})
        });
        if (!response.ok) {
            throw new Error(`Taxonomy suggest failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.taxonomy_suggester[0] as SuggestResponse;
    };

    const applyTags = async (postId: string, suggestions: TagSuggestion[]): Promise<ApplyResponse> => {
        const response = await fetch(`${apiRoot}/taxonomy/apply/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({post_id: postId, suggestions})
        });
        if (!response.ok) {
            throw new Error(`Taxonomy apply failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.taxonomy_suggester[0] as ApplyResponse;
    };

    const fetchBatchSuggestions = async (limit = 10): Promise<BatchSuggestResponse> => {
        const response = await fetch(`${apiRoot}/taxonomy/suggest-batch/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({limit})
        });
        if (!response.ok) {
            throw new Error(`Taxonomy batch suggest failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.taxonomy_suggester[0] as BatchSuggestResponse;
    };

    return {fetchSuggestions, applyTags, fetchBatchSuggestions};
}

export type {TagSuggestion, Topic, SuggestResponse, ApplyResponse, BatchSuggestResponse};
