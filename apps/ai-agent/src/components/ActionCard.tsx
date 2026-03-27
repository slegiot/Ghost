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
    pending: 'border-yellow-500/30 bg-yellow-500/5',
    approved: 'border-blue-500/30 bg-blue-500/5',
    executed: 'border-green-500/30 bg-green-500/5',
    rejected: 'border-muted-foreground/20 bg-muted/50 opacity-60',
    failed: 'border-red-500/30 bg-red-500/5'
};

const STATUS_BADGES: Record<string, {label: string; className: string}> = {
    pending: {label: 'Awaiting approval', className: 'bg-yellow-500/10 text-yellow-600'},
    approved: {label: 'Executing...', className: 'bg-blue-500/10 text-blue-600'},
    executed: {label: 'Done', className: 'bg-green-500/10 text-green-600'},
    rejected: {label: 'Rejected', className: 'bg-muted text-muted-foreground'},
    failed: {label: 'Failed', className: 'bg-red-500/10 text-red-600'}
};

const ActionCard: React.FC<ActionCardProps> = ({action, onApprove, onReject}) => {
    const badge = STATUS_BADGES[action.status];

    return (
        <div className={cn(
            'rounded-lg border p-3 transition-all duration-200',
            STATUS_STYLES[action.status]
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {TOOL_LABELS[action.tool] || action.tool}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                        {badge.label}
                    </span>
                </div>
                {action.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={onReject}>
                            Reject
                        </Button>
                        <Button size="sm" onClick={onApprove}>
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
