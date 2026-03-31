import React from 'react';
import {ChatMessage} from '@hooks/useAiAgent';
import {cn} from '@tryghost/shade';

interface MessageBubbleProps {
    message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({message}) => {
    const isUser = message.role === 'user';

    return (
        <div className={cn('mb-6 flex items-start gap-4', isUser && 'flex-row-reverse')}>
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
            <div className={cn(
                'max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm',
                isUser
                    ? 'rounded-tr-sm bg-indigo-600 text-white shadow-indigo-500/20'
                    : 'rounded-tl-sm bg-white ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 text-foreground'
            )}>
                {message.content.split('\n').map((line, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default MessageBubble;
