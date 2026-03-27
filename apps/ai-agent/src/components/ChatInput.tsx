import React, {useState, useRef, useEffect} from 'react';
import {Button, cn} from '@tryghost/shade';

interface ChatInputProps {
    onSend: (text: string) => void;
    isLoading: boolean;
}

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
        if (!trimmed || isLoading) {
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

    return (
        <div className="border-t border-border px-6 py-4">
            <div className={cn(
                'flex items-end gap-2 rounded-xl border border-border bg-background px-4 py-3',
                'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20',
                'transition-all duration-200'
            )}>
                <textarea
                    ref={textareaRef}
                    className="max-h-[160px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    disabled={isLoading}
                    placeholder="Ask the AI agent to create, tag, optimise or analyse content..."
                    rows={1}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    className="shrink-0"
                    disabled={!text.trim() || isLoading}
                    size="sm"
                    onClick={handleSubmit}
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Button>
            </div>
        </div>
    );
};

export default ChatInput;
