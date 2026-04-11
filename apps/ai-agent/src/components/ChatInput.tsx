import React, {useEffect, useRef, useState} from 'react';
import {Button, cn} from '@tryghost/shade';

interface ChatInputProps {
    onSend: (text: string) => void;
    isLoading: boolean;
}

const MAX_CHARS = 2000;

const ChatInput: React.FC<ChatInputProps> = ({onSend, isLoading}) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [text]);

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || isLoading || trimmed.length > MAX_CHARS) {
            return;
        }
        onSend(trimmed);
        setText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const charCount = text.length;
    const isOverLimit = charCount > MAX_CHARS;

    return (
        <div className="bg-gradient-to-t from-background via-background/95 to-transparent px-6 pt-10 pb-6">
            <div className={cn(
                'relative mx-auto flex w-full max-w-4xl items-end gap-3 rounded-2xl border border-border/60 bg-white/70 px-4 py-3 pb-3 pt-4 shadow-sm backdrop-blur-xl dark:bg-zinc-900/70',
                'focus-within:border-indigo-500/40 focus-within:bg-white focus-within:shadow-[0_8px_30px_rgba(99,102,241,0.1)] focus-within:ring-1 focus-within:ring-indigo-500/20 dark:focus-within:bg-zinc-900',
                'transition-all duration-300 ease-out',
                isLoading && 'border-indigo-500/30 animate-pulse'
            )}>
                <textarea
                    ref={textareaRef}
                    className="max-h-[160px] min-h-[24px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                    disabled={isLoading}
                    placeholder="Ask the AI agent to create, tag, optimise, search or analyse content..."
                    rows={1}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    className={cn(
                        'shrink-0 rounded-xl transition-all duration-300',
                        text.trim() && !isLoading && !isOverLimit
                            ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20 text-white'
                            : 'bg-muted text-muted-foreground'
                    )}
                    disabled={!text.trim() || isLoading || isOverLimit}
                    size="sm"
                    onClick={handleSubmit}
                >
                    {isLoading ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </Button>
            </div>
            {/* Footer hints */}
            <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between px-1">
                <span className="text-[11px] text-muted-foreground/40">
                    <kbd className="rounded border border-border/30 px-1 py-0.5 font-mono text-[10px]">Shift</kbd>
                    {' + '}
                    <kbd className="rounded border border-border/30 px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
                    {' for new line'}
                </span>
                {charCount > 0 && (
                    <span className={cn(
                        'text-[11px] transition-colors',
                        isOverLimit ? 'text-rose-500 font-medium' : 'text-muted-foreground/40'
                    )}>
                        {charCount}/{MAX_CHARS}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ChatInput;
