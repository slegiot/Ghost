import React, {useState} from 'react';
import {Conversation} from '@hooks/useConversations';
import {cn} from '@tryghost/shade';

interface ConversationSidebarProps {
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    isCollapsed: boolean;
    onToggle: () => void;
}

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
        return 'Just now';
    }
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    if (hours < 24) {
        return `${hours}h ago`;
    }
    if (days < 7) {
        return `${days}d ago`;
    }
    return new Date(timestamp).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    conversations,
    activeId,
    onSelect,
    onNew,
    onDelete,
    isCollapsed,
    onToggle
}) => {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState('');

    const filtered = searchFilter
        ? conversations.filter(c => c.title.toLowerCase().includes(searchFilter.toLowerCase())
        )
        : conversations;

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirmDeleteId === id) {
            onDelete(id);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    return (
        <>
            {/* Toggle button (always visible) */}
            <button
                className={cn(
                    'fixed left-3 top-[72px] z-30 flex h-8 w-8 items-center justify-center rounded-lg',
                    'bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/80 dark:ring-white/10',
                    'text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-zinc-900',
                    'transition-all duration-200'
                )}
                title={isCollapsed ? 'Show conversations' : 'Hide conversations'}
                type="button"
                onClick={onToggle}
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {isCollapsed ? (
                        <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                        <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </svg>
            </button>

            {/* Sidebar panel */}
            <div className={cn(
                'flex h-full flex-col border-r border-border/50 bg-background/50 backdrop-blur-md transition-all duration-300 ease-out',
                isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-[280px] min-w-[280px] opacity-100'
            )}>
                {/* Sidebar header */}
                <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase">Conversations</span>
                    <button
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                            'bg-indigo-600 text-white shadow-sm',
                            'hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20',
                            'transition-all duration-200'
                        )}
                        type="button"
                        onClick={onNew}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        New
                    </button>
                </div>

                {/* Search */}
                {conversations.length > 3 && (
                    <div className="border-b border-border/20 px-3 py-2">
                        <input
                            className="w-full rounded-md border border-border/40 bg-white/50 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-indigo-500/40 focus:outline-none dark:bg-zinc-900/50"
                            placeholder="Search conversations..."
                            type="text"
                            value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                        />
                    </div>
                )}

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 && (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground/60">
                            {searchFilter ? 'No matching conversations' : 'No conversations yet'}
                        </div>
                    )}
                    {filtered.map(conv => (
                        <button
                            key={conv.id}
                            className={cn(
                                'group flex w-full items-start gap-2 border-b border-border/10 px-4 py-3 text-left transition-all duration-150',
                                activeId === conv.id
                                    ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500'
                                    : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                            )}
                            type="button"
                            onClick={() => onSelect(conv.id)}
                        >
                            <div className="min-w-0 flex-1">
                                <p className={cn(
                                    'truncate text-sm font-medium',
                                    activeId === conv.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-foreground'
                                )}>
                                    {conv.title}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                                    {conv.messages.length} messages · {formatTimeAgo(conv.updatedAt)}
                                </p>
                            </div>
                            <button
                                className={cn(
                                    'mt-0.5 shrink-0 rounded p-1 text-muted-foreground/40 transition-all',
                                    'opacity-0 group-hover:opacity-100',
                                    confirmDeleteId === conv.id
                                        ? 'bg-rose-500/10 text-rose-500 opacity-100'
                                        : 'hover:bg-rose-500/10 hover:text-rose-500'
                                )}
                                title={confirmDeleteId === conv.id ? 'Click again to confirm' : 'Delete conversation'}
                                type="button"
                                onClick={e => handleDelete(e, conv.id)}
                            >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default ConversationSidebar;
