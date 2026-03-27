import React, {useState, useRef, useCallback} from 'react';
import {useAiAgent, ChatMessage, PendingAction} from '@hooks/useAiAgent';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import ActionCard from './ActionCard';
import QuickActions from './QuickActions';
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
                actions: msg.actions.map(a =>
                    (a.id === action.id ? {...a, status: 'approved' as const} : a)
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
                    actions: msg.actions.map(a =>
                        (a.id === action.id
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
                    actions: msg.actions.map(a =>
                        (a.id === action.id ? {...a, status: 'failed' as const, result: 'Execution failed'} : a)
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
                actions: msg.actions.map(a =>
                    (a.id === action.id ? {...a, status: 'rejected' as const} : a)
                )
            };
        }));
    }, []);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-semibold text-foreground">AI Agent</h1>
                    <p className="text-sm text-muted-foreground">Create, tag, optimise and manage content</p>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                            <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-foreground">What can I help with?</h2>
                        <p className="mb-6 max-w-md text-sm text-muted-foreground">
                            I can create pages and posts, auto-tag content, add cross-links, optimise your content, send newsletters, and analyse your site data.
                        </p>
                        <QuickActions onAction={handleSend} />
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
                    <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className={cn('rounded-xl bg-muted px-4 py-3')}>
                            <div className="flex items-center gap-1">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
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
