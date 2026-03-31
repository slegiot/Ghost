import React, {useCallback, useState} from 'react';
import {Badge, Button, Input, LucideIcon} from '@tryghost/shade';
import {useSemanticLinker} from '@hooks/useSemanticLinker';
import type {IndexAllResponse, LinkSuggestion} from '@hooks/useSemanticLinker';

const SemanticLinkerView: React.FC = () => {
    const [postId, setPostId] = useState('');
    const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
    const [totalAnalyzed, setTotalAnalyzed] = useState(0);
    const [loading, setLoading] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [indexResult, setIndexResult] = useState<IndexAllResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const {fetchSuggestions, indexPost, indexAll} = useSemanticLinker();

    const handleFindSuggestions = useCallback(async () => {
        if (!postId.trim()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchSuggestions(postId.trim());
            setSuggestions(result.suggestions);
            setTotalAnalyzed(result.totalAnalyzed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
        } finally {
            setLoading(false);
        }
    }, [postId, fetchSuggestions]);

    const handleIndexPost = useCallback(async () => {
        if (!postId.trim()) {
            return;
        }
        setIndexing(true);
        setError(null);
        try {
            await indexPost(postId.trim());
            await handleFindSuggestions();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to index post');
        } finally {
            setIndexing(false);
        }
    }, [postId, indexPost, handleFindSuggestions]);

    const handleIndexAll = useCallback(async () => {
        setIndexing(true);
        setError(null);
        try {
            const result = await indexAll();
            setIndexResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to index all posts');
        } finally {
            setIndexing(false);
        }
    }, [indexAll]);

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.5) {
            return 'text-green-600';
        }
        if (similarity >= 0.3) {
            return 'text-yellow-600';
        }
        return 'text-gray-500';
    };

    const getSimilarityBadge = (similarity: number) => {
        if (similarity >= 0.5) {
            return 'High match';
        }
        if (similarity >= 0.3) {
            return 'Medium match';
        }
        return 'Low match';
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Link className="h-5 w-5 text-purple-500" />
                <h1 className="text-xl font-semibold">Semantic Linker</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* Find Suggestions Section */}
                    <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Find Internal Link Suggestions</h2>
                        <p className="mb-4 text-sm text-gray-500">
                            Enter a post ID to find semantically related content for internal linking.
                            The analyzer uses NER-based keyword extraction and vector similarity to match intent, not just words.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                className="flex-1"
                                placeholder="Enter post ID (e.g. 60f6c5e4e8c4a7001c8e4b01)"
                                value={postId}
                                onChange={e => setPostId(e.target.value)}
                            />
                            <Button
                                disabled={loading || !postId.trim()}
                                onClick={handleFindSuggestions}
                            >
                                {loading ? 'Analyzing...' : 'Find Suggestions'}
                            </Button>
                            <Button
                                disabled={indexing || !postId.trim()}
                                variant="outline"
                                onClick={handleIndexPost}
                            >
                                {indexing ? 'Indexing...' : 'Re-index Post'}
                            </Button>
                        </div>
                    </div>

                    {/* Index All Section */}
                    <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Index All Posts</h2>
                        <p className="mb-4 text-sm text-gray-500">
                            Build or rebuild the semantic index for all published posts. This enables the linking suggestions across your entire site.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                disabled={indexing}
                                variant="outline"
                                onClick={handleIndexAll}
                            >
                                {indexing ? 'Indexing...' : 'Index All Posts'}
                            </Button>
                            {indexResult && (
                                <span className="text-sm text-gray-600">
                                    Indexed {indexResult.indexed} of {indexResult.total} posts
                                    {indexResult.errors > 0 && ` (${indexResult.errors} errors)`}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Results Section */}
                    {suggestions.length > 0 && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-medium">Link Suggestions</h2>
                                <span className="text-sm text-gray-500">
                                    {suggestions.length} suggestions from {totalAnalyzed} indexed posts
                                </span>
                            </div>
                            <div className="space-y-3">
                                {suggestions.map(suggestion => (
                                    <div
                                        key={suggestion.postId}
                                        className="rounded-lg border p-4 transition-colors hover:border-purple-200 dark:hover:border-purple-800"
                                    >
                                        <div className="mb-2 flex items-start justify-between">
                                            <div>
                                                <h3 className="font-medium">{suggestion.title}</h3>
                                                <p className="mt-1 text-xs text-gray-500">{suggestion.url}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">
                                                    {getSimilarityBadge(suggestion.similarity)}
                                                </Badge>
                                                <span className={`text-sm font-medium ${getSimilarityColor(suggestion.similarity)}`}>
                                                    {(suggestion.similarity * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>

                                        {suggestion.excerpt && (
                                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                                                {suggestion.excerpt}
                                            </p>
                                        )}

                                        {suggestion.suggestedAnchors.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                <span className="mr-1 text-xs text-gray-500">Suggested anchors:</span>
                                                {suggestion.suggestedAnchors.map(anchor => (
                                                    <Badge key={anchor} className="text-xs" variant="outline">
                                                        {anchor}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-3 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(suggestion.url, '_blank')}
                                            >
                                                View Post
                                            </Button>
                                            {suggestion.suggestedAnchors.length > 0 && (
                                                <Button size="sm" variant="secondary">
                                                    Apply Link
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {suggestions.length === 0 && !loading && postId.trim() && !error && (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                            <LucideIcon.Link className="mb-3 h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-500">No suggestions found. Try indexing the post first.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SemanticLinkerView;
