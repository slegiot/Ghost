import React from 'react';
import {Button} from '@tryghost/shade';

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
        <div className="flex flex-wrap justify-center gap-2">
            {QUICK_ACTIONS.map(action => (
                <Button
                    key={action.label}
                    className="text-sm"
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(action.prompt)}
                >
                    {action.label}
                </Button>
            ))}
        </div>
    );
};

export default QuickActions;
