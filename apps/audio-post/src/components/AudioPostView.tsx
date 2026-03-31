import React, {useCallback, useState} from 'react';
import {Badge, Button, Input, LucideIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade';
import {useAudioPost} from '@hooks/useAudioPost';
import type {AudioMetadataResponse, PostAudioItem, Voice} from '@hooks/useAudioPost';

const AudioPostView: React.FC = () => {
    const [postId, setPostId] = useState('');
    const [metadata, setMetadata] = useState<AudioMetadataResponse | null>(null);
    const [postList, setPostList] = useState<PostAudioItem[]>([]);
    const [withAudio, setWithAudio] = useState(0);
    const [selectedVoice, setSelectedVoice] = useState('default');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [listing, setListing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {fetchMetadata, fetchList, generateAudio} = useAudioPost();

    const handleFetchMetadata = useCallback(async () => {
        if (!postId.trim()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchMetadata(postId.trim());
            setMetadata(result);
            setSelectedVoice(result.audio?.voiceId || 'default');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
        } finally {
            setLoading(false);
        }
    }, [postId, fetchMetadata]);

    const handleListPosts = useCallback(async () => {
        setListing(true);
        setError(null);
        try {
            const result = await fetchList();
            setPostList(result.posts);
            setWithAudio(result.withAudio);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to list posts');
        } finally {
            setListing(false);
        }
    }, [fetchList]);

    const handleGenerate = useCallback(async (targetPostId?: string) => {
        const id = targetPostId || postId.trim();
        if (!id) {
            return;
        }
        setGenerating(true);
        setError(null);
        try {
            await generateAudio(id, selectedVoice);
            if (id === postId.trim()) {
                await handleFetchMetadata();
            } else {
                await handleListPosts();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Audio generation failed');
        } finally {
            setGenerating(false);
        }
    }, [postId, selectedVoice, generateAudio, handleFetchMetadata, handleListPosts]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, {variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string}> = {
            ready: {variant: 'default', label: 'Ready'},
            generating: {variant: 'secondary', label: 'Generating'},
            pending: {variant: 'outline', label: 'Pending'},
            error: {variant: 'destructive', label: 'Error'}
        };
        const config = variants[status] || variants.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 1) {
            return '< 1 min';
        }
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Mic className="h-5 w-5 text-green-500" />
                <h1 className="text-xl font-semibold">Audio Posts</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Single Post Lookup */}
                    <div className="rounded-lg border bg-white p-6 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Generate Audio Version</h2>
                        <p className="mb-4 text-sm text-gray-500">
                            Convert any post into a high-fidelity audio narration using AI voice cloning.
                            Select a voice style and generate an audio version for commuters and accessibility.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                className="flex-1"
                                placeholder="Enter post ID"
                                value={postId}
                                onChange={e => setPostId(e.target.value)}
                            />
                            <Button disabled={loading || !postId.trim()} onClick={handleFetchMetadata}>
                                {loading ? 'Loading...' : 'Check Post'}
                            </Button>
                            <Button disabled={listing} variant="outline" onClick={handleListPosts}>
                                {listing ? 'Loading...' : 'List All Posts'}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Post Metadata & Generation */}
                    {metadata && (
                        <div className="rounded-lg border bg-white p-6 dark:bg-gray-950">
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-medium">{metadata.title}</h2>
                                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                                        <span>{metadata.wordCount} words</span>
                                        <span>~{formatDuration(metadata.estimatedDurationMinutes)} narration</span>
                                        {getStatusBadge(metadata.audio.status)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {metadata.availableVoices.length > 0 && (
                                        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                                            <SelectTrigger className="w-48">
                                                <SelectValue placeholder="Select voice" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {metadata.availableVoices.map((voice: Voice) => (
                                                    <SelectItem key={voice.id} value={voice.id}>
                                                        {voice.name} ({voice.language})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Button
                                        disabled={generating}
                                        onClick={() => handleGenerate()}
                                    >
                                        {generating ? 'Generating...' : 'Generate Audio'}
                                    </Button>
                                </div>
                            </div>

                            {/* Audio Player */}
                            {metadata.audio.audioUrl && (
                                <div className="mt-4 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
                                    <div className="mb-2 flex items-center gap-2">
                                        <LucideIcon.Play className="h-4 w-4 text-green-500" />
                                        <span className="text-sm font-medium">Audio Version</span>
                                        {metadata.audio.duration && (
                                            <span className="text-xs text-gray-500">
                                                {formatDuration(Math.ceil(metadata.audio.duration / 60))}
                                            </span>
                                        )}
                                    </div>
                                    <audio className="w-full" preload="metadata" src={metadata.audio.audioUrl} controls>
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            )}

                            {/* Available Voices */}
                            {metadata.availableVoices.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="mb-2 text-sm font-medium text-gray-700">Available Voices</h3>
                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                        {metadata.availableVoices.map(voice => (
                                            <button
                                                key={voice.id}
                                                className={`rounded-lg border p-3 text-left transition-colors ${
                                                    selectedVoice === voice.id
                                                        ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950'
                                                        : 'hover:border-gray-300'
                                                }`}
                                                type="button"
                                                onClick={() => setSelectedVoice(voice.id)}
                                            >
                                                <div className="text-sm font-medium">{voice.name}</div>
                                                <div className="text-xs text-gray-500">{voice.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TTS Provider Info */}
                            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                                <strong>TTS Provider:</strong> {metadata.ttsProvider} |
                                Actual audio generation requires an ElevenLabs API key configured in your Ghost settings.
                            </div>
                        </div>
                    )}

                    {/* Post List */}
                    {postList.length > 0 && (
                        <div className="rounded-lg border bg-white p-6 dark:bg-gray-950">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-medium">All Posts</h2>
                                    <p className="text-sm text-gray-500">
                                        {postList.length} posts | {withAudio} have audio versions
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {postList.map(post => (
                                    <div
                                        key={post.postId}
                                        className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:border-green-200"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">{post.title}</div>
                                            <div className="text-xs text-gray-500">
                                                {post.wordCount} words | ~{formatDuration(post.estimatedDurationMinutes)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {post.audio ? getStatusBadge(post.audio.status) : (
                                                <Badge variant="outline">No audio</Badge>
                                            )}
                                            <Button
                                                disabled={generating}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleGenerate(post.postId)}
                                            >
                                                {post.audio?.status === 'ready' ? 'Regenerate' : 'Generate'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!metadata && postList.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                            <LucideIcon.Mic className="mb-4 h-10 w-10 text-gray-300" />
                            <p className="mb-2 text-base font-medium text-gray-600">No posts checked yet</p>
                            <p className="max-w-md text-center text-sm text-gray-500">
                                Enter a post ID to generate an audio version, or list all posts to batch-generate audio narrations.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioPostView;
