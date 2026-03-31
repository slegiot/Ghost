import React, {useCallback, useState} from 'react';
import {Badge, Button, Input, LucideIcon} from '@tryghost/shade';
import {useStyleGuard} from '@hooks/useStyleGuard';
import type {StyleCheckResponse, StyleGuide} from '@hooks/useStyleGuard';

const StyleGuardView: React.FC = () => {
    const [postId, setPostId] = useState('');
    const [result, setResult] = useState<StyleCheckResponse | null>(null);
    const [guide, setGuide] = useState<StyleGuide | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingGuide, setLoadingGuide] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [forbiddenInput, setForbiddenInput] = useState('');
    const [preferredInput, setPreferredInput] = useState('');
    const {checkContent, fetchGuide, updateGuide} = useStyleGuard();

    const handleCheck = useCallback(async () => {
        if (!postId.trim()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await checkContent(postId.trim());
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Style check failed');
        } finally {
            setLoading(false);
        }
    }, [postId, checkContent]);

    const handleLoadGuide = useCallback(async () => {
        setLoadingGuide(true);
        try {
            const g = await fetchGuide();
            setGuide(g);
            setShowGuide(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load guide');
        } finally {
            setLoadingGuide(false);
        }
    }, [fetchGuide]);

    const handleAddForbidden = useCallback(async () => {
        if (!forbiddenInput.trim() || !guide) {
            return;
        }
        const updated = [...guide.forbiddenPhrases, forbiddenInput.trim()];
        const g = await updateGuide({forbiddenPhrases: updated});
        setGuide(g);
        setForbiddenInput('');
    }, [forbiddenInput, guide, updateGuide]);

    const handleAddPreferred = useCallback(async () => {
        if (!preferredInput.trim() || !guide) {
            return;
        }
        const updated = [...guide.preferredPhrases, preferredInput.trim()];
        const g = await updateGuide({preferredPhrases: updated});
        setGuide(g);
        setPreferredInput('');
    }, [preferredInput, guide, updateGuide]);

    const getSeverityColor = (severity: string) => {
        if (severity === 'warning') {
            return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
        }
        if (severity === 'info') {
            return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
        }
        return 'border-gray-200 bg-gray-50';
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Shield className="h-5 w-5 text-indigo-500" />
                <h1 className="text-xl font-semibold">AI Style Guard</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Check Content Against Style Guide</h2>
                        <p className="mb-4 text-sm text-gray-500">
                            Flag phrases that do not match your brand voice. Checks forbidden phrases, sentence length,
                            and passive voice usage.
                        </p>
                        <div className="flex gap-2">
                            <Input className="flex-1" placeholder="Enter post ID" value={postId} onChange={e => setPostId(e.target.value)} />
                            <Button disabled={loading || !postId.trim()} onClick={handleCheck}>
                                {loading ? 'Checking...' : 'Check Style'}
                            </Button>
                            <Button disabled={loadingGuide} variant="outline" onClick={handleLoadGuide}>
                                {loadingGuide ? 'Loading...' : 'Edit Guide'}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-medium">{result.title}</h2>
                                    <p className="text-sm text-gray-500">
                                        {result.summary.totalSentences} sentences checked | {result.flagCount} flags
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {result.score}%
                                    </span>
                                    <Badge variant={result.passCount ? 'default' : 'destructive'}>
                                        {result.passCount ? 'Pass' : 'Needs Work'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="mb-4 flex gap-4 text-sm text-gray-500">
                                <span>Forbidden: {result.summary.forbiddenPhrasesFound}</span>
                                <span>Long sentences: {result.summary.longSentences}</span>
                                <span>Passive: {result.summary.passiveVoice}</span>
                            </div>

                            {result.flags.length > 0 && (
                                <div className="space-y-2">
                                    {result.flags.map(flag => (
                                        <div key={`${flag.phrase}-${flag.type}`} className={`rounded-lg border p-3 ${getSeverityColor(flag.severity)}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="text-sm font-medium">{flag.phrase}</span>
                                                    <Badge className="ml-2" variant="outline">{flag.type}</Badge>
                                                </div>
                                                <Badge variant={flag.severity === 'warning' ? 'destructive' : 'secondary'}>
                                                    {flag.severity}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-600">{flag.suggestion}</p>
                                            {flag.context && (
                                                <p className="mt-1 text-xs text-gray-400 italic">{flag.context}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {showGuide && guide && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <h2 className="mb-3 text-lg font-medium">Style Guide: {guide.name}</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-2 text-sm font-medium">Forbidden Phrases</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {guide.forbiddenPhrases.map(p => (
                                            <Badge key={p} variant="destructive">{p}</Badge>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <Input className="flex-1" placeholder="Add forbidden phrase" value={forbiddenInput} onChange={e => setForbiddenInput(e.target.value)} />
                                        <Button onClick={handleAddForbidden}>Add</Button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="mb-2 text-sm font-medium">Preferred Phrases</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {guide.preferredPhrases.map(p => (
                                            <Badge key={p} variant="outline">{p}</Badge>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <Input className="flex-1" placeholder="Add preferred phrase" value={preferredInput} onChange={e => setPreferredInput(e.target.value)} />
                                        <Button onClick={handleAddPreferred}>Add</Button>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-sm text-gray-500">
                                    <span>Max sentence: {guide.maxSentenceLength}</span>
                                    <span>Reading level: {guide.minReadingLevel}</span>
                                    <span>Active voice: {guide.requireActiveVoice ? 'Required' : 'Optional'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StyleGuardView;
