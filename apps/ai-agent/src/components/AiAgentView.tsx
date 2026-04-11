import ActionCard from './ActionCard';
import ChatInput from './ChatInput';
import ConversationSidebar from './ConversationSidebar';
import MessageBubble from './MessageBubble';
import QuickActions from './QuickActions';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ChatMessage, PendingAction, useAiAgent} from '@hooks/useAiAgent';
import {
    Conversation,
    createConversation,
    deleteConversation as deleteConv,
    loadConversations,
    saveConversation
} from '@hooks/useConversations';
import {cn} from '@tryghost/shade';

const AiAgentView: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {sendMessage, executeActions} = useAiAgent();

    // Load conversations on mount
    useEffect(() => {
        const loaded = loadConversations();
        setConversations(loaded);
    }, []);

    // Auto-save when messages change
    useEffect(() => {
        if (activeConvId && messages.length > 0) {
            const conv = conversations.find(c => c.id === activeConvId);
            if (conv) {
                const updated = {
                    ...conv,
                    messages,
                    updatedAt: Date.now()
                };
                saveConversation(updated);
                setConversations(prev => prev.map(c => (c.id === activeConvId ? updated : c))
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                );
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, activeConvId]);

    const getConversationHistory = useCallback(() => {
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
        }));
    }, [messages]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, []);

    const handleNewConversation = useCallback(() => {
        setMessages([]);
        setActiveConvId(null);
    }, []);

    const handleSelectConversation = useCallback((id: string) => {
        const conv = conversations.find(c => c.id === id);
        if (conv) {
            setActiveConvId(id);
            setMessages(conv.messages || []);
        }
    }, [conversations]);

    const handleDeleteConversation = useCallback((id: string) => {
        deleteConv(id);
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConvId === id) {
            setMessages([]);
            setActiveConvId(null);
        }
    }, [activeConvId]);

    const handleSend = useCallback(async (text: string) => {
        const userMessage: ChatMessage = {
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        // Create conversation on first message if needed
        let convId = activeConvId;
        if (!convId) {
            const conv = createConversation(text);
            convId = conv.id;
            setActiveConvId(convId);
            saveConversation({...conv, messages: [userMessage]});
            setConversations(prev => [conv, ...prev]);
        }

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const conversationHistory = getConversationHistory();
            const response = await sendMessage(text, conversationHistory);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.message,
                actions: response.pendingActions.map(action => ({
                    id: action.id,
                    tool: action.tool,
                    description: `Execute ${action.tool} with provided arguments`,
                    args: action.arguments,
                    status: 'pending' as const
                })),
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `Sorry, something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setTimeout(scrollToBottom, 100);
        }
    }, [sendMessage, getConversationHistory, scrollToBottom, activeConvId]);

    const handleApproveAction = useCallback(async (action: PendingAction, messageIndex: number) => {
        setMessages(prev => prev.map((msg, i) => {
            if (i !== messageIndex || !msg.actions) {
                return msg;
            }
            return {
                ...msg,
                actions: msg.actions.map(a => (a.id === action.id ? {...a, status: 'approved' as const} : a))
            };
        }));

        try {
            const response = await executeActions([action]);
            const result = response.results[0];

            setMessages(prev => prev.map((msg, i) => {
                if (i !== messageIndex || !msg.actions) {
                    return msg;
                }
                return {
                    ...msg,
                    actions: msg.actions.map(a => (a.id === action.id
                        ? {...a, status: result.success ? 'executed' as const : 'failed' as const, result: typeof result.result === 'string' ? result.result : JSON.stringify(result.result), error: result.error}
                        : a))
                };
            }));
        } catch {
            setMessages(prev => prev.map((msg, i) => {
                if (i !== messageIndex || !msg.actions) {
                    return msg;
                }
                return {
                    ...msg,
                    actions: msg.actions.map(a => (a.id === action.id ? {...a, status: 'failed' as const, result: 'Execution failed'} : a))
                };
            }));
        }
    }, [executeActions]);

    const handleRejectAction = useCallback((action: PendingAction, messageIndex: number) => {
        setMessages(prev => prev.map((msg, i) => {
            if (i !== messageIndex || !msg.actions) {
                return msg;
            }
            return {
                ...msg,
                actions: msg.actions.map(a => (a.id === action.id ? {...a, status: 'rejected' as const} : a))
            };
        }));
    }, []);

    const handleApproveAll = useCallback(async (actionsToApprove: PendingAction[], messageIndex: number) => {
        // Mark all as approved
        setMessages(prev => prev.map((msg, i) => {
            if (i !== messageIndex || !msg.actions) {
                return msg;
            }
            return {
                ...msg,
                actions: msg.actions.map(a => (actionsToApprove.some(ap => ap.id === a.id)
                    ? {...a, status: 'approved' as const}
                    : a)
                )
            };
        }));

        try {
            const response = await executeActions(actionsToApprove);

            setMessages(prev => prev.map((msg, i) => {
                if (i !== messageIndex || !msg.actions) {
                    return msg;
                }
                return {
                    ...msg,
                    actions: msg.actions.map((a) => {
                        const resultItem = response.results.find(r => r.tool === a.tool);
                        if (!resultItem || !actionsToApprove.some(ap => ap.id === a.id)) {
                            return a;
                        }
                        return {
                            ...a,
                            status: resultItem.success ? 'executed' as const : 'failed' as const,
                            result: typeof resultItem.result === 'string' ? resultItem.result : JSON.stringify(resultItem.result),
                            error: resultItem.error
                        };
                    })
                };
            }));
        } catch {
            setMessages(prev => prev.map((msg, i) => {
                if (i !== messageIndex || !msg.actions) {
                    return msg;
                }
                return {
                    ...msg,
                    actions: msg.actions.map(a => (actionsToApprove.some(ap => ap.id === a.id)
                        ? {...a, status: 'failed' as const, result: 'Execution failed'}
                        : a)
                    )
                };
            }));
        }
    }, [executeActions]);

    return (
        <div className="flex h-full">
            {/* Conversation sidebar */}
            <ConversationSidebar
                activeId={activeConvId}
                conversations={conversations}
                isCollapsed={sidebarCollapsed}
                onDelete={handleDeleteConversation}
                onNew={handleNewConversation}
                onSelect={handleSelectConversation}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main chat area */}
            <div className="flex flex-1 flex-col bg-gradient-to-b from-background to-muted/20">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border/50 bg-background/80 px-6 py-5 backdrop-blur-md">
                    <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 shadow-inner ring-1 ring-indigo-500/20 ring-inset',
                        !sidebarCollapsed && 'ml-6'
                    )}>
                        <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold tracking-tight text-foreground">AI Agent</h1>
                        <p className="text-sm font-medium text-muted-foreground/80">Create, tag, search, optimise and manage content</p>
                    </div>
                    {messages.length > 0 && (
                        <button
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground/60 transition-colors hover:bg-muted/30 hover:text-muted-foreground"
                            type="button"
                            onClick={handleNewConversation}
                        >
                            New chat
                        </button>
                    )}
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-8">
                    {messages.length === 0 && (
                        <div className="flex h-full animate-in flex-col items-center justify-center text-center duration-700 ease-out fade-in slide-in-from-bottom-4">
                            <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] ring-1 ring-white/10 ring-inset">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-white/0 mix-blend-overlay"></div>
                                <svg className="h-8 w-8 text-indigo-600 drop-shadow-sm dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">What can I help with?</h2>
                            <p className="mb-8 max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">
                                I can create pages and posts, auto-tag content, search your site, add cross-links, optimise your content, send newsletters, and analyse your site data.
                            </p>
                            <div className="w-full max-w-2xl">
                                <QuickActions onAction={handleSend} />
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={msg.timestamp}>
                            <MessageBubble message={msg} />
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mb-4 ml-10 space-y-2">
                                    {msg.actions.length > 1 && msg.actions.some(a => a.status === 'pending') && (
                                        <div className="flex justify-end">
                                            <button
                                                className="rounded-lg bg-indigo-600/10 px-3 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-600/20 dark:text-indigo-400"
                                                type="button"
                                                onClick={() => handleApproveAll(
                                                    msg.actions!.filter(a => a.status === 'pending'),
                                                    idx
                                                )}
                                            >
                                                ✓ Approve all ({msg.actions.filter(a => a.status === 'pending').length})
                                            </button>
                                        </div>
                                    )}
                                    {msg.actions.map(action => (
                                        <ActionCard
                                            key={action.id}
                                            action={action}
                                            onApprove={() => handleApproveAction(action, idx)}
                                            onReject={() => handleRejectAction(action, idx)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="mb-6 flex animate-in items-start gap-4 duration-300 fade-in slide-in-from-bottom-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 shadow-sm ring-1 ring-indigo-500/20 ring-inset">
                                <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className={cn('rounded-2xl rounded-tl-sm bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 px-5 py-3.5')}>
                                <div className="flex h-5 items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500/60 [animation-delay:-0.3s]" />
                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500/60 [animation-delay:-0.15s]" />
                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500/60" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area — always visible */}
                <ChatInput isLoading={isLoading} onSend={handleSend} />
            </div>
        </div>
    );
};

export default AiAgentView;
