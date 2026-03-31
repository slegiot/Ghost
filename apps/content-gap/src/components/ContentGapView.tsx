import React, {useCallback, useState} from 'react';
import {Badge, Button, LucideIcon} from '@tryghost/shade';
import {useContentGap} from '@hooks/useContentGap';
import type {ContentGapResponse} from '@hooks/useContentGap';

const ContentGapView: React.FC = () => {
    const [analysis, setAnalysis] = useState<ContentGapResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {fetchAnalysis} = useContentGap();

    const handleAnalyze = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAnalysis();
            setAnalysis(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setLoading(false);
        }
    }, [fetchAnalysis]);

    const getBarWidth = (count: number, max: number) => {
        return `${Math.max(8, Math.round((count / max) * 100))}%`;
    };

    const getOpportunityColor = (index: number) => {
        if (index < 3) {
            return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
        }
        if (index < 6) {
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
        }
        return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
    };

    const getOpportunityLabel = (index: number) => {
        if (index < 3) {
            return 'High Priority';
        }
        if (index < 6) {
            return 'Medium Priority';
        }
        return 'Low Priority';
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Radar className="h-5 w-5 text-orange-500" />
                <h1 className="text-xl font-semibold">Content Gap Radar</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Hero Section */}
                    <div className="rounded-lg border bg-white p-6 dark:bg-gray-950">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-medium">Topical Authority Analysis</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Scan your published content to identify topic gaps, uncover underserved areas,
                                    and generate high-potential headlines to fill them.
                                </p>
                            </div>
                            <Button disabled={loading} onClick={handleAnalyze}>
                                {loading ? 'Analyzing...' : 'Scan Content'}
                            </Button>
                        </div>
                        {analysis && (
                            <div className="flex gap-4 text-sm text-gray-600">
                                <span>{analysis.totalPosts} posts analyzed</span>
                                <span>{analysis.topCategories.length} topic categories</span>
                                <span className="font-medium text-orange-600">
                                    {analysis.contentGaps.length} content gaps found
                                </span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Topic Cluster Visualization */}
                    {analysis && analysis.topCategories.length > 0 && (
                        <div className="rounded-lg border bg-white p-6 dark:bg-gray-950">
                            <h2 className="mb-4 text-lg font-medium">Topic Coverage</h2>
                            <p className="mb-4 text-sm text-gray-500">
                                Your strongest topic categories by post count.
                            </p>
                            <div className="space-y-3">
                                {analysis.topCategories.map((cat) => {
                                    const maxCount = analysis.topCategories[0]?.postCount || 1;
                                    return (
                                        <div key={cat.name} className="flex items-center gap-3">
                                            <span className="w-32 truncate text-sm font-medium">{cat.name}</span>
                                            <div className="flex-1">
                                                <div className="h-6 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                                    <div
                                                        className="flex h-full items-center rounded-full bg-orange-400 pl-2 text-xs font-medium text-white transition-all"
                                                        style={{width: getBarWidth(cat.postCount, maxCount)}}
                                                    >
                                                        {cat.postCount}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="w-16 text-right text-xs text-gray-500">
                                                {cat.postCount} posts
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Content Gaps */}
                    {analysis && analysis.contentGaps.length > 0 && (
                        <div className="rounded-lg border bg-white p-6 dark:bg-gray-950">
                            <h2 className="mb-4 text-lg font-medium">Content Gaps</h2>
                            <p className="mb-4 text-sm text-gray-500">
                                Topics mentioned frequently in your content but not covered by any dedicated tag or category.
                                These represent opportunities to build topical authority.
                            </p>
                            <div className="space-y-4">
                                {analysis.contentGaps.map((gap, index) => (
                                    <div
                                        key={gap.topic}
                                        className="rounded-lg border p-4 transition-colors hover:border-orange-200 dark:hover:border-orange-800"
                                    >
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <h3 className="text-base font-medium capitalize">{gap.topic}</h3>
                                                <p className="text-xs text-gray-500">
                                                    Mentioned {gap.frequency} times across your content
                                                </p>
                                            </div>
                                            <Badge
                                                className={getOpportunityColor(index)}
                                                variant="outline"
                                            >
                                                {getOpportunityLabel(index)}
                                            </Badge>
                                        </div>

                                        {gap.suggestedHeadlines.length > 0 && (
                                            <div className="mt-3">
                                                <span className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                                                    Suggested Headlines
                                                </span>
                                                <div className="space-y-2">
                                                    {gap.suggestedHeadlines.map(headline => (
                                                        <div
                                                            key={`${gap.topic}-${headline}`}
                                                            className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2 dark:bg-gray-900"
                                                        >
                                                            <LucideIcon.FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                                            <span className="text-sm">{headline}</span>
                                                            <Button className="ml-auto" size="sm" variant="outline">
                                                                Create
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!analysis && !loading && (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                            <LucideIcon.Radar className="mb-4 h-10 w-10 text-gray-300" />
                            <p className="mb-2 text-base font-medium text-gray-600">No analysis yet</p>
                            <p className="max-w-md text-center text-sm text-gray-500">
                                Click Scan Content to analyze your published posts, identify topic clusters,
                                and discover content gaps where you can build topical authority.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentGapView;
