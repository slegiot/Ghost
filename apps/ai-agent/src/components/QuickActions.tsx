import React from 'react';
import {cn} from '@tryghost/shade';

interface QuickActionsProps {
    onAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
    {label: '📝 Create a Page', prompt: 'Create a new page about our company history', icon: '📝'},
    {label: '🏷️ Auto-Tag Content', prompt: 'Auto-tag my recent posts using AI', icon: '🏷️'},
    {label: '🔗 Link Related', prompt: 'Find and suggest internal links between my related posts', icon: '🔗'},
    {label: '✨ Optimize Content', prompt: 'Optimize my latest post for better SEO and readability', icon: '✨'},
    {label: '📊 Analyze Data', prompt: 'Show me my site analytics for the last 30 days', icon: '📊'},
    {label: '📧 Send Newsletter', prompt: 'Send my most recent published post as a newsletter', icon: '📧'},
    {label: '🔍 Search Content', prompt: 'What have I written about recently?', icon: '🔍'},
    {label: '🧠 Smart Tags', prompt: 'Analyze my posts and suggest a better tag taxonomy', icon: '🧠'}
];

const QuickActions: React.FC<QuickActionsProps> = ({onAction}) => {
    return (
        <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(action => (
                <button
                    key={action.label}
                    className={cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300',
                        'border border-border/50 bg-white/60 dark:bg-zinc-900/60 shadow-sm backdrop-blur-sm',
                        'hover:-translate-y-0.5 hover:border-indigo-500/30 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-md hover:shadow-indigo-500/10',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                        'h-10 px-4 py-2'
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
