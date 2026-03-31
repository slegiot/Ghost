import React from 'react';
import {Button, cn} from '@tryghost/shade';
import {PendingAction} from '@hooks/useAiAgent';

interface ActionCardProps {
    action: PendingAction;
    onApprove: () => void;
    onReject: () => void;
}

const TOOL_LABELS: Record<string, string> = {
    create_page: 'Create Page',
    create_post: 'Create Post',
    auto_tag: 'Auto-Tag Content',
    cross_link: 'Cross-Link Content',
    optimise_content: 'Optimise Content',
    analyse_performance: 'Analyse Performance',
    send_newsletter: 'Send Newsletter',
    list_content: 'List Content',
    update_content: 'Update Content'
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent',
    approved: 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-transparent',
    executed: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent',
    rejected: 'border-muted-foreground/20 bg-muted/30 opacity-70 grayscale-[0.5]',
    failed: 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent'
};

const STATUS_BADGES: Record<string, {label: string; className: string}> = {
    pending: {label: 'Awaiting approval', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ring-1 ring-inset ring-yellow-500/20'},
    approved: {label: 'Executing...', className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20'},
    executed: {label: 'Done', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20'},
    rejected: {label: 'Rejected', className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-muted-foreground/20'},
    failed: {label: 'Failed', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20'}
};

const ActionCard: React.FC<ActionCardProps> = ({action, onApprove, onReject}) => {
    const badge = STATUS_BADGES[action.status];

    return (
        <div className={cn(
            'group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:shadow-md',
            STATUS_STYLES[action.status]
        )}>
            {/* Subtle glow effect behind card */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 to-transparent mix-blend-overlay"></div>
            
            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {TOOL_LABELS[action.tool] || action.tool}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                        {badge.label}
                    </span>
                </div>
                {action.status === 'pending' && (
                    <div className="flex items-center gap-2">
                        <Button 
                            className="bg-white/50 hover:bg-white dark:bg-zinc-800/50 dark:hover:bg-zinc-800" 
                            size="sm" 
                            variant="outline" 
                            onClick={onReject}
                        >
                            Reject
                        </Button>
                        <Button
                            className="border-0 bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20" 
                            size="sm" 
                            onClick={onApprove}
                        >
                            Approve
                        </Button>
                    </div>
                )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            {action.result && (
                <p className={cn(
                    'mt-2 rounded bg-background/50 px-2 py-1 text-xs',
                    action.status === 'failed' ? 'text-red-600' : 'text-muted-foreground'
                )}>
                    {action.result}
                </p>
            )}
        </div>
    );
};

export default ActionCard;
