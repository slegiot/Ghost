import React, {useCallback, useState} from 'react';
import {Badge, Button, LucideIcon} from '@tryghost/shade';
import {PostPicker} from '@tryghost/shared-components';
import {useContentRepurpose} from '@hooks/useContentRepurpose';
import type {RepurposePost, RepurposeResponse} from '@hooks/useContentRepurpose';

type ActiveTab = 'linkedin' | 'twitter' | 'newsletter';

const ContentRepurposeView: React.FC = () => {
    const [postId, setPostId] = useState('');
    const [result, setResult] = useState<RepurposeResponse | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('linkedin');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const {repurpose} = useContentRepurpose();

    const handleRepurpose = useCallback(async () => {
        if (!postId.trim()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await repurpose(postId.trim());
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Repurpose failed');
        } finally {
            setLoading(false);
        }
    }, [postId, repurpose]);

    const handleCopy = useCallback(async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    }, []);

    const renderPostCard = (post: RepurposePost, index: number) => (
        <div key={index} className="rounded-lg border p-4 transition-colors hover:border-blue-200">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Post {post.position} | {post.charCount} chars</span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(post.content, index)}
                >
                    {copiedIndex === index ? 'Copied!' : 'Copy'}
                </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-6 py-4">
                <LucideIcon.Copy className="h-5 w-5 text-blue-500" />
                <h1 className="text-xl font-semibold">Content Repurposer</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    <div className="rounded-lg border bg-white p-4 dark:bg-gray-950">
                        <h2 className="mb-3 text-lg font-medium">Repurpose Your Post</h2>
                        <p className="mb-4 text-sm text-gray-500">
                            Generate a LinkedIn thread, Twitter thread, and newsletter summary from a single post.
                            Each format uses platform-specific constraints and conventions.
                        </p>
                        <div className="flex flex-wrap items-start gap-2">
                            <PostPicker
                                className="min-w-0 flex-1"
                                placeholder="Search posts by title…"
                                value={postId || null}
                                onChange={id => setPostId(id ?? '')}
                            />
                            <Button disabled={loading || !postId.trim()} onClick={handleRepurpose}>
                                {loading ? 'Generating...' : 'Repurpose'}
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
                            <h2 className="mb-3 text-lg font-medium">{result.title}</h2>
                            <div className="mb-4 flex gap-2">
                                {(['linkedin', 'twitter', 'newsletter'] as ActiveTab[]).map(tab => (
                                    <Button
                                        key={tab}
                                        size="sm"
                                        variant={activeTab === tab ? 'default' : 'outline'}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab === 'linkedin' && <LucideIcon.Linkedin className="mr-1 h-3.5 w-3.5" />}
                                        {tab === 'twitter' && <LucideIcon.Twitter className="mr-1 h-3.5 w-3.5" />}
                                        {tab === 'newsletter' && <LucideIcon.Mail className="mr-1 h-3.5 w-3.5" />}
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </Button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                {activeTab === 'linkedin' && result.formats.linkedin && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>{result.formats.linkedin.totalPosts} posts</span>
                                            <Badge variant="outline">Thread format</Badge>
                                        </div>
                                        {result.formats.linkedin.posts.map((post, i) => renderPostCard(post, i))}
                                        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                            <strong>Tips:</strong> {result.formats.linkedin.tips.join(' | ')}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'twitter' && result.formats.twitter && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>{result.formats.twitter.totalTweets} tweets</span>
                                            <Badge variant="outline">Thread format</Badge>
                                        </div>
                                        {result.formats.twitter.thread.map((tweet, i) => renderPostCard(tweet, i))}
                                        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                            <strong>Tips:</strong> {result.formats.twitter.tips.join(' | ')}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'newsletter' && result.formats.newsletter && (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border p-4">
                                            <div className="mb-2 text-xs text-gray-500">Subject Line</div>
                                            <div className="text-base font-medium">{result.formats.newsletter.subject}</div>
                                            <div className="mt-1 text-xs text-gray-400">Preview: {result.formats.newsletter.previewText}</div>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <div className="mb-2 text-xs text-gray-500">Introduction</div>
                                            <div className="text-sm">{result.formats.newsletter.intro}</div>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <div className="mb-2 text-xs text-gray-500">Key Points</div>
                                            <pre className="text-sm whitespace-pre-wrap">{result.formats.newsletter.summary}</pre>
                                            <Button className="mt-2" size="sm" variant="outline" onClick={() => handleCopy(result.formats.newsletter!.summary, 999)}>
                                                {copiedIndex === 999 ? 'Copied!' : 'Copy Summary'}
                                            </Button>
                                        </div>
                                        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                            <strong>Design Tips:</strong> {result.formats.newsletter.designTips.join(' | ')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentRepurposeView;
