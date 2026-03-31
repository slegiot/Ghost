import React, {useCallback, useState} from 'react';
import {Badge, Button, Input, LucideIcon} from '@tryghost/shade';
import {useAutoTagger} from '@hooks/useAutoTagger';
import type {BatchSuggestResponse, SuggestResponse} from '@hooks/useAutoTagger';

const AutoTaggerView: React.FC = () => {
    const [postId, setPostId] = useState('');
    const [result, setResult] = useState<SuggestResponse | null>(null);
    const [batchResult, setBatchResult] = useState<BatchSuggestResponse | null>(null);
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {fetchSuggestions, applyTags, fetchBatchSuggestions} = useAutoTagger();

    const handleAnalyze = useCallback(async () => {
        if (!postId.trim()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetchSuggestions(postId.trim());
            setResult(res);
            setSelectedTags(new Set(res.suggestions.map(s => s.tagName)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setLoading(false);
        }
    }, [postId, fetchSuggestions]);

    const handleBatchAnalyze = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchBatchSuggestions(10);
            setBatchResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Batch analysis failed');
        } finally {
            setLoading(false);
        }
    }, [fetchBatchSuggestions]);

    const handleApply = useCallback(async () => {
        if (!result) {
            return;
        }
        setApplying(true);
        setError(null);
        try {
            const tagsToApply = result.suggestions.filter(s => selectedTags.has(s.tagName));
            await applyTags(result.postId, tagsToApply);
            await handleAnalyze();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply tags');
        } finally {
            setApplying(false);
        }
    }, [result, selectedTags, applyTags, handleAnalyze]);

    const toggleTag = useCallback((tagName: string) => {
        setSelectedTags((prev) => {
            const next = new Set(prev);
            if (next.has(tagName)) {
                next.delete(tagName);
            } else {
                next.add(tagName);
            }
            return next;
        });
    }, []);

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Tags className="h-5 w-5 text-blue-500" />
                <h1 className="text-xl font-semibold">Predictive Taxonomy</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Auto-Tag a Post</h2>
                        <p className="mb-4 text-sm text-gray-500">
                            Analyze a post to get AI-powered tag suggestions based on content topics and your existing tag structure.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                className="flex-1"
                                placeholder="Enter post ID"
                                value={postId}
                                onChange={e => setPostId(e.target.value)}
                            />
                            <Button disabled={loading || !postId.trim()} onClick={handleAnalyze}>
                                {loading ? 'Analyzing...' : 'Analyze Post'}
                            </Button>
                            <Button disabled={loading} variant="outline" onClick={handleBatchAnalyze}>
                                Batch Analyze
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-medium">Tag Suggestions</h2>
                                    <p className="text-sm text-gray-500">
                                        {result.wordCount} words | Complexity: {result.complexityScore}
                                        {result.deepDiveSuggestion && (
                                            <Badge className="ml-2" variant="secondary">Deep Dive Candidate</Badge>
                                        )}
                                    </p>
                                </div>
                                <Button
                                    disabled={applying || selectedTags.size === 0}
                                    onClick={handleApply}
                                >
                                    {applying ? 'Applying...' : `Apply ${selectedTags.size} Tags`}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {result.suggestions.map(suggestion => (
                                    <div
                                        key={suggestion.tagName}
                                        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                                            selectedTags.has(suggestion.tagName)
                                                ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                                                : 'hover:border-gray-300'
                                        }`}
                                        onClick={() => toggleTag(suggestion.tagName)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    checked={selectedTags.has(suggestion.tagName)}
                                                    className="rounded"
                                                    type="checkbox"
                                                    readOnly
                                                />
                                                <span className="font-medium">{suggestion.tagName}</span>
                                                <Badge variant={suggestion.isNew ? 'outline' : 'secondary'}>
                                                    {suggestion.isNew ? 'New' : 'Existing'}
                                                </Badge>
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                {(suggestion.score * 100).toFixed(1)}% relevance
                                            </span>
                                        </div>
                                        <p className="mt-1 ml-6 text-xs text-gray-500">{suggestion.reason}</p>
                                    </div>
                                ))}
                            </div>

                            {result.topics.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="mb-2 text-sm font-medium text-gray-700">Detected Topics</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {result.topics.map(topic => (
                                            <Badge key={topic.term} variant="outline">
                                                {topic.term} ({(topic.score * 100).toFixed(1)}%)
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {batchResult && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <h2 className="mb-3 text-lg font-medium">
                                Batch Analysis: {batchResult.postsAnalyzed} Posts
                            </h2>
                            <div className="space-y-3">
                                {batchResult.results.map(r => (
                                    <div key={r.postId} className="rounded border p-3">
                                        <p className="text-sm font-medium">Post {r.postId}</p>
                                        <p className="text-xs text-gray-500">
                                            {r.suggestions.length} tags suggested | {r.wordCount} words
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {r.suggestions.slice(0, 5).map(s => (
                                                <Badge key={s.tagName} variant="outline">
                                                    {s.tagName}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoTaggerView;
