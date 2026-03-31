import React, {useCallback, useState} from 'react';
import {Badge, Button, Input, LucideIcon} from '@tryghost/shade';
import {useEditorAI} from '@hooks/useEditorAI';
import type {EditorAITool} from '@hooks/useEditorAI';

const TOOLS: Array<{id: EditorAITool; label: string; icon: string; description: string}> = [
    {id: 'content-refresh', label: 'Content Refresh', icon: 'RefreshCw', description: 'Detect decay in older posts'},
    {id: 'content-gap', label: 'Content Gaps', icon: 'Radar', description: 'Find missing topics'},
    {id: 'audio', label: 'Audio Generation', icon: 'Mic', description: 'Generate audio version'},
    {id: 'style-check', label: 'Style Guard', icon: 'Shield', description: 'Check brand voice'},
    {id: 'repurpose', label: 'Repurpose', icon: 'Copy', description: 'Generate social content'},
    {id: 'sentiment', label: 'Sentiment', icon: 'Heart', description: 'Analyze content mood'},
    {id: 'paywall', label: 'Paywall Logic', icon: 'Lock', description: 'Optimize paywall position'},
    {id: 'alt-text', label: 'Image Alt-Text', icon: 'Image', description: 'Generate alt text'},
    {id: 'knowledge-base', label: 'Q&A Search', icon: 'MessageCircle', description: 'Search knowledge base'},
    {id: 'subject-lines', label: 'Subject Lines', icon: 'Mail', description: 'Predict email opens'},
    {id: 'image-generate', label: 'Image Gen', icon: 'Wand', description: 'Generate custom images'},
    {id: 'snippets', label: 'Snippets', icon: 'Quote', description: 'Extract quotable text'},
    {id: 'localize', label: 'Localize', icon: 'Globe', description: 'Cultural adaptation'}
];

const EditorAIView: React.FC = () => {
    const [activeTool, setActiveTool] = useState<EditorAITool | null>(null);
    const [postId, setPostId] = useState('');
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {callTool} = useEditorAI();

    const handleRun = useCallback(async () => {
        if (!activeTool) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const payload: Record<string, unknown> = {};
            if (postId.trim()) {
                payload.post_id = postId.trim();
            }
            if (activeTool === 'knowledge-base') {
                payload.question = 'What is the best approach?';
            }
            if (activeTool === 'snippets') {
                payload.max_snippets = 5;
            }
            if (activeTool === 'localize') {
                payload.locale = 'en-GB';
            }
            if (activeTool === 'alt-text') {
                payload.image_url = 'https://example.com/image.jpg';
                payload.context = 'article content';
            }
            const res = await callTool(activeTool, payload);
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Tool execution failed');
        } finally {
            setLoading(false);
        }
    }, [activeTool, postId, callTool]);

    const renderResult = () => {
        if (!result) {
            return null;
        }
        return (
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-100 p-4 text-xs dark:bg-gray-800">
                {JSON.stringify(result, null, 2)}
            </pre>
        );
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Sparkles className="h-5 w-5 text-purple-500" />
                <h1 className="text-xl font-semibold">Editor AI Tools</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Select a Tool</h2>
                        <div className="mb-4">
                            <Input
                                placeholder="Post ID (optional for some tools)"
                                value={postId}
                                onChange={e => setPostId(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                            {TOOLS.map(tool => (
                                <button
                                    key={tool.id}
                                    className={`rounded-lg border p-3 text-left transition-colors ${
                                        activeTool === tool.id
                                            ? 'border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
                                            : 'hover:border-gray-300'
                                    }`}
                                    type="button"
                                    onClick={() => setActiveTool(tool.id)}
                                >
                                    <div className="mb-1 text-sm font-medium">{tool.label}</div>
                                    <div className="text-xs text-gray-500">{tool.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTool && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-medium">
                                        {TOOLS.find(t => t.id === activeTool)?.label}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {TOOLS.find(t => t.id === activeTool)?.description}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button disabled={loading} onClick={handleRun}>
                                        {loading ? 'Running...' : 'Run Tool'}
                                    </Button>
                                    <Badge variant="outline">{activeTool}</Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <h2 className="mb-3 text-lg font-medium">Results</h2>
                            {renderResult()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditorAIView;
