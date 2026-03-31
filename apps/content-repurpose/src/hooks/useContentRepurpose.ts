import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface RepurposePost {
    position: number;
    content: string;
    charCount: number;
}

interface LinkedInResult {
    posts: RepurposePost[];
    totalPosts: number;
    format: string;
    tips: string[];
}

interface TwitterResult {
    thread: RepurposePost[];
    totalTweets: number;
    format: string;
    tips: string[];
}

interface NewsletterResult {
    subject: string;
    previewText: string;
    intro: string;
    summary: string;
    cta: {text: string; url: string};
    format: string;
    designTips: string[];
}

interface RepurposeResponse {
    postId: string;
    title: string;
    url: string;
    formats: {
        linkedin?: LinkedInResult;
        twitter?: TwitterResult;
        newsletter?: NewsletterResult;
    };
}

export function useContentRepurpose() {
    const {apiRoot} = getGhostPaths();

    const repurpose = async (postId: string, formats: string[] = ['linkedin', 'twitter', 'newsletter']): Promise<RepurposeResponse> => {
        const response = await fetch(`${apiRoot}/content-repurpose/repurpose/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({post_id: postId, formats})
        });
        if (!response.ok) {
            throw new Error(`Repurpose failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.content_repurpose[0] as RepurposeResponse;
    };

    return {repurpose};
}

export type {RepurposePost, LinkedInResult, TwitterResult, NewsletterResult, RepurposeResponse};
