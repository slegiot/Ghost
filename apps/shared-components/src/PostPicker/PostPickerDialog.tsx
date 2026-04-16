import React, {useCallback, useEffect, useId, useState} from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    LoadingIndicator,
    LucideIcon
} from '@tryghost/shade';

import {usePostSearch} from './usePostSearch';
import type {PostPickerProps} from './PostPicker';
import type {PostSummary} from './usePostSearch';

export interface PostPickerDialogProps extends PostPickerProps {
    triggerLabel?: string;
}

const relativeTime = (iso: string | null): string => {
    if (!iso) {
        return '—';
    }
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
        return '—';
    }
    const sec = Math.round((Date.now() - then) / 1000);
    if (sec < 45) {
        return 'just now';
    }
    if (sec < 3600) {
        return `${Math.floor(sec / 60)}m ago`;
    }
    if (sec < 86400) {
        return `${Math.floor(sec / 3600)}h ago`;
    }
    return `${Math.floor(sec / 86400)}d ago`;
};

/**
 * Dialog-based post picker: shows recent posts when the search box is empty, otherwise searches by title.
 */
export const PostPickerDialog: React.FC<PostPickerDialogProps> = ({
    value,
    onChange,
    placeholder = 'Search posts by title…',
    statusFilter = 'all',
    className,
    disabled = false,
    triggerLabel = 'Choose post'
}) => {
    const listId = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const [selectedPost, setSelectedPost] = useState<PostSummary | null>(null);

    useEffect(() => {
        if (!value) {
            setSelectedPost(null);
        }
    }, [value]);

    useEffect(() => {
        if (!open) {
            return;
        }
        setQuery('');
        setHighlight(0);
    }, [open]);

    const {posts, isLoading, error} = usePostSearch({
        query,
        status: statusFilter,
        limit: 10,
        recentLimit: 20,
        loadRecentWhenEmpty: true
    });

    useEffect(() => {
        setHighlight(0);
    }, [posts]);

    const selectPost = useCallback(
        (post: PostSummary) => {
            onChange(post.id, post);
            setSelectedPost(post);
            setOpen(false);
            setQuery('');
        },
        [onChange]
    );

    const clear = useCallback(() => {
        onChange(null);
        setSelectedPost(null);
    }, [onChange]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!posts.length) {
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(i => Math.min(i + 1, posts.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const post = posts[highlight];
            if (post) {
                selectPost(post);
            }
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
        }
    };

    return (
        <div className={className}>
            {value ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{selectedPost?.title ?? value}</span>
                    <Button
                        disabled={disabled}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={clear}
                    >
                        Clear
                    </Button>
                </div>
            ) : null}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button disabled={disabled} size="sm" type="button" variant="secondary">
                        <LucideIcon.FileText className="mr-1 size-4" />
                        {triggerLabel}
                    </Button>
                </DialogTrigger>
                <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>Select a post</DialogTitle>
                    </DialogHeader>
                    <InputGroup>
                        <InputGroupAddon align="inline-start">
                            <LucideIcon.Search className="size-4 text-muted-foreground" aria-hidden />
                        </InputGroupAddon>
                        <InputGroupInput
                            aria-activedescendant={posts[highlight] ? `${listId}-opt-${highlight}` : undefined}
                            aria-controls={listId}
                            placeholder={placeholder}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={onKeyDown}
                        />
                        <InputGroupAddon align="inline-end">
                            {isLoading ? <LoadingIndicator size="sm" /> : null}
                        </InputGroupAddon>
                    </InputGroup>
                    {error && (
                        <div className="text-sm text-destructive" role="alert">
                            {error}
                        </div>
                    )}
                    <div
                        className="min-h-0 flex-1 overflow-y-auto rounded-md border"
                        id={listId}
                        role="listbox"
                    >
                        {!error && !isLoading && posts.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground">No posts found</div>
                        )}
                        {!error &&
                            posts.map((post, i) => (
                                <button
                                    key={post.id}
                                    aria-selected={i === highlight}
                                    className={`flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60 ${
                                        i === highlight ? 'bg-muted/80' : ''
                                    }`}
                                    id={`${listId}-opt-${i}`}
                                    role="option"
                                    type="button"
                                    onClick={() => selectPost(post)}
                                    onMouseDown={e => e.preventDefault()}
                                    onMouseEnter={() => setHighlight(i)}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate font-medium">{post.title}</span>
                                        <Badge
                                            className={
                                                post.status === 'published'
                                                    ? 'bg-green-600/15 text-green-700 dark:text-green-400'
                                                    : 'bg-muted text-muted-foreground'
                                            }
                                            variant="secondary"
                                        >
                                            {post.status}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{relativeTime(post.publishedAt)}</span>
                                </button>
                            ))}
                    </div>
                    {query.trim().length > 0 && query.trim().length < 3 && (
                        <p className="text-xs text-muted-foreground">Type at least 3 characters to search by title.</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
