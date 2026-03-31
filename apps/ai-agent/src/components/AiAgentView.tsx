import ActionCard from './ActionCard';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import QuickActions from './QuickActions';
import React, {useCallback, useRef, useState} from 'react';
import {ChatMessage, PendingAction, useAiAgent} from '@hooks/useAiAgent';
import {cn} from '@tryghost/shade';

const AiAgentView: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {sendMessage, executeActions} = useAiAgent();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, []);

    const handleSend = useCallback(async (text: string) => {
        const userMessage: ChatMessage = {
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await sendMessage(text, conversationId);
            setConversationId(response.conversationId);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.reply,
                actions: response.actions,
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
    }, [sendMessage, conversationId, scrollToBottom]);

    const handleApproveAction = useCallback(async (action: PendingAction, messageIndex: number) => {
        if (!conversationId) {
            return;
        }

        // Update action status to approved
        setMessages(prev => prev.map((msg, i) => {
            if (i !== messageIndex || !msg.actions) {
                return msg;
            }
            return {
                ...msg,
                actions: msg.actions.map(a => (a.id === action.id ? {...a, status: 'approved' as const} : a)
                )
            };
        }));

        try {
            const response = await executeActions([action.id], conversationId);
            const result = response.results[0];

            setMessages(prev => prev.map((msg, i) => {
                if (i !== messageIndex || !msg.actions) {
                    return msg;
                }
                return {
                    ...msg,
                    actions: msg.actions.map(a => (a.id === action.id
                        ? {...a, status: result.success ? 'executed' as const : 'failed' as const, result: result.result}
                        : a)
                    )
                };
            }));
        } catch {
            setMessages(prev => prev.map((msg, i) => {
                if (i !== messageIndex || !msg.actions) {
                    return msg;
                }
                return {
                    ...msg,
                    actions: msg.actions.map(a => (a.id === action.id ? {...a, status: 'failed' as const, result: 'Execution failed'} : a)
                    )
                };
            }));
        }
    }, [conversationId, executeActions]);

    const handleRejectAction = useCallback((action: PendingAction, messageIndex: number) => {
        setMessages(prev => prev.map((msg, i) => {
            if (i !== messageIndex || !msg.actions) {
                return msg;
            }
            return {
                ...msg,
                actions: msg.actions.map(a => (a.id === action.id ? {...a, status: 'rejected' as const} : a)
                )
            };
        }));
    }, []);

    return (
        <div className="flex h-full flex-col bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border/50 bg-background/80 px-6 py-5 backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 shadow-inner ring-1 ring-indigo-500/20 ring-inset">
                    <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">AI Agent</h1>
                    <p className="text-sm font-medium text-muted-foreground/80">Create, tag, optimise and manage content</p>
                </div>
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
                            I can create pages and posts, auto-tag content, add cross-links, optimise your content, send newsletters, and analyse your site data.
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
    );
};

export default AiAgentView;
