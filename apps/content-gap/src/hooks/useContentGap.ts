import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface TopicCategory {
    name: string;
    postCount: number;
}

interface ContentGap {
    topic: string;
    frequency: number;
    suggestedHeadlines: string[];
    opportunityScore?: number;
}

interface ContentGapResponse {
    totalPosts: number;
    topCategories: TopicCategory[];
    contentGaps: ContentGap[];
}

export function useContentGap() {
    const {apiRoot} = getGhostPaths();

    const fetchAnalysis = async (): Promise<ContentGapResponse> => {
        const response = await fetch(`${apiRoot}/content-gap/analyze/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`Content gap analysis failed (${response.status}): ${await response.text()}`);
        }

        const data = await response.json();
        return data.content_gap[0] as ContentGapResponse;
    };

    return {fetchAnalysis};
}

export type {TopicCategory, ContentGap, ContentGapResponse};
