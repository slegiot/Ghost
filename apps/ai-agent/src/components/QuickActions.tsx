import React from 'react';
import {cn} from '@tryghost/shade';

interface QuickActionsProps {
    onAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
    {label: '📝 Create a Page', prompt: 'Create a new page for me. What topic should it cover?'},
    {label: '🏷️ Auto-Tag Content', prompt: 'Analyse my existing posts and suggest tags for any untagged content.'},
    {label: '🔗 Cross-Link', prompt: 'Find opportunities to cross-link related posts and pages on my site.'},
    {label: '✨ Optimise Content', prompt: 'Review my recent posts and suggest SEO and readability improvements.'},
    {label: '📊 Analyse Data', prompt: 'Give me a summary of my site performance — top posts, member growth, and engagement.'},
    {label: '📧 Send Newsletter', prompt: 'Help me draft and send a newsletter to my subscribers.'}
];

const QuickActions: React.FC<QuickActionsProps> = ({onAction}) => {
    return (
        <div className="flex flex-wrap justify-center gap-2.5">
            {QUICK_ACTIONS.map(action => (
                <button
                    key={action.label}
                    className={cn(
                        'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300',
                        'border border-border/50 bg-white/60 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm',
                        'hover:-translate-y-0.5 hover:border-indigo-500/30 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-md hover:shadow-indigo-500/10',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                        'h-9 px-4 py-2'
                    )}
                    type="button"
                    onClick={() => onAction(action.prompt)}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
};

export default QuickActions;
