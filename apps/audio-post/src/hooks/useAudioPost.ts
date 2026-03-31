import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface Voice {
    id: string;
    name: string;
    language: string;
    description: string;
}

interface AudioInfo {
    id: string;
    audioUrl: string | null;
    duration: number | null;
    voiceId: string;
    status: string;
    errorMessage?: string | null;
}

interface PostAudioItem {
    postId: string;
    title: string;
    postStatus: string;
    wordCount: number;
    estimatedDurationMinutes: number;
    audio: AudioInfo | null;
}

interface AudioMetadataResponse {
    postId: string;
    title: string;
    wordCount: number;
    estimatedDurationMinutes: number;
    audio: AudioInfo;
    availableVoices: Voice[];
    ttsProvider: string;
    message: string;
}

interface AudioListResponse {
    total: number;
    posts: PostAudioItem[];
    withAudio: number;
}

interface GenerateResponse {
    postId: string;
    title: string;
    voiceId: string;
    wordCount: number;
    estimatedDurationMinutes: number;
    status: string;
    message: string;
    ttsProvider: string;
}

export function useAudioPost() {
    const {apiRoot} = getGhostPaths();

    const fetchMetadata = async (postId: string): Promise<AudioMetadataResponse> => {
        const response = await fetch(`${apiRoot}/audio-post/metadata/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({post_id: postId})
        });
        if (!response.ok) {
            throw new Error(`Audio metadata failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.audio[0] as AudioMetadataResponse;
    };

    const fetchList = async (): Promise<AudioListResponse> => {
        const response = await fetch(`${apiRoot}/audio-post/list/`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Audio list failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.audio[0] as AudioListResponse;
    };

    const generateAudio = async (postId: string, voiceId = 'default'): Promise<GenerateResponse> => {
        const response = await fetch(`${apiRoot}/audio-post/generate/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'app-pragma': 'no-cache'},
            credentials: 'include',
            body: JSON.stringify({post_id: postId, voice_id: voiceId})
        });
        if (!response.ok) {
            throw new Error(`Audio generation failed (${response.status}): ${await response.text()}`);
        }
        const data = await response.json();
        return data.audio[0] as GenerateResponse;
    };

    return {fetchMetadata, fetchList, generateAudio};
}

export type {Voice, AudioInfo, PostAudioItem, AudioMetadataResponse, AudioListResponse, GenerateResponse};
