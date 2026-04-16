import React, {useCallback, useState} from 'react';
import {ChatMessage} from '@hooks/useAiAgent';
import {cn} from '@tryghost/shade';

interface MessageBubbleProps {
    message: ChatMessage;
}

/** Simple markdown-ish renderer for assistant messages */
function renderMarkdown(text: string): React.ReactNode[] {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listKey = 0;

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`list-${listKey}`} className="my-2 ml-4 list-disc space-y-1 text-[14px]">
                    {listItems.map((item, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <li key={i}>{renderInline(item)}</li>
                    ))}
                </ul>
            );
            listItems = [];
            listKey += 1;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // List items (• or - or *)
        const listMatch = line.match(/^[\s]*[•\-*]\s+(.+)/);
        if (listMatch) {
            listItems.push(listMatch[1]);
            continue;
        }

        flushList();

        // Empty line
        if (line.trim() === '') {
            elements.push(<div key={`space-${i}`} className="h-2" />);
            continue;
        }

        // Code block (inline single-line)
        if (line.startsWith('```') && line.endsWith('```') && line.length > 6) {
            const code = line.slice(3, -3);
            elements.push(
                <code key={`code-${i}`} className="my-1 block rounded bg-muted/40 px-2 py-1 font-mono text-[13px]">
                    {code}
                </code>
            );
            continue;
        }

        // Regular paragraph
        elements.push(
            <p key={`p-${i}`} className="text-[15px] leading-relaxed">
                {renderInline(line)}
            </p>
        );
    }

    flushList();
    return elements;
}

/** Render inline formatting: **bold**, `code`, [links](url) */
function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    // Match **bold**, `code`, and [text](url)
    const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = regex.exec(text)) !== null) {
        // Push text before match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        if (match[2]) {
            // Bold
            keyIdx += 1;
            parts.push(<strong key={`b-${keyIdx}`} className="font-semibold">{match[2]}</strong>);
        } else if (match[4]) {
            // Inline code
            keyIdx += 1;
            parts.push(
                <code key={`c-${keyIdx}`} className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[13px]">
                    {match[4]}
                </code>
            );
        } else if (match[6] && match[7]) {
            // Link
            keyIdx += 1;
            parts.push(
                <a
                    key={`a-${keyIdx}`}
                    className="text-indigo-600 underline decoration-indigo-500/30 hover:decoration-indigo-500 dark:text-indigo-400"
                    href={match[7]}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {match[6]}
                </a>
            );
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({message}) => {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);
    const safeContent = message.content === null || message.content === undefined
        ? ''
        : typeof message.content === 'string'
            ? message.content
            : String(message.content);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(safeContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API may fail in some contexts
        }
    }, [safeContent]);

    return (
        <div className={cn(
            'group mb-6 flex items-start gap-4 animate-in duration-300 ease-out fade-in slide-in-from-bottom-2',
            isUser && 'flex-row-reverse'
        )}>
            {/* Avatar */}
            <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset',
                isUser
                    ? 'bg-foreground/5 ring-foreground/10'
                    : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 ring-indigo-500/20'
            )}>
                {isUser ? (
                    <svg className="h-4 w-4 text-foreground/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            {/* Bubble */}
            <div className="relative max-w-[80%]">
                <div className={cn(
                    'rounded-2xl px-5 py-3.5 shadow-sm',
                    isUser
                        ? 'rounded-tr-sm bg-indigo-600 text-white shadow-indigo-500/20'
                        : 'rounded-tl-sm bg-white ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 text-foreground'
                )}>
                    {isUser ? (
                        safeContent.split('\n').map((line, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <React.Fragment key={i}>
                                {line}
                                {i < safeContent.split('\n').length - 1 && <br />}
                            </React.Fragment>
                        ))
                    ) : (
                        <div className="space-y-0.5">
                            {renderMarkdown(safeContent)}
                        </div>
                    )}
                </div>

                {/* Copy button for assistant messages */}
                {!isUser && (
                    <button
                        className={cn(
                            'absolute -bottom-6 right-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground/50',
                            'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
                            'hover:bg-muted/40 hover:text-muted-foreground'
                        )}
                        type="button"
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <>
                                <svg className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Copied
                            </>
                        ) : (
                            <>
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Copy
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
