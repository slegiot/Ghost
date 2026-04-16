import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {
    Badge,
    Button,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    LoadingIndicator,
    LucideIcon
} from '@tryghost/shade';

import {usePostSearch} from './usePostSearch';
import type {PostSummary} from './usePostSearch';

export type {PostSummary};

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

export interface PostPickerProps {
    value: string | null;
    onChange: (id: string | null, post?: PostSummary) => void;
    placeholder?: string;
    statusFilter?: 'published' | 'draft' | 'all';
    className?: string;
    disabled?: boolean;
}

/**
 * Inline searchable post picker with keyboard navigation (Arrow/Enter/Escape).
 */
export const PostPicker: React.FC<PostPickerProps> = ({
    value,
    onChange,
    placeholder = 'Search posts by title…',
    statusFilter = 'all',
    className,
    disabled = false
}) => {
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const [selectedPost, setSelectedPost] = useState<PostSummary | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!value) {
            setSelectedPost(null);
        }
    }, [value]);

    const {posts, isLoading, error} = usePostSearch({
        query,
        status: statusFilter,
        limit: 10
    });

    const showList = open && query.trim().length >= 3 && !disabled;

    useEffect(() => {
        if (!showList) {
            setHighlight(0);
        } else if (highlight >= posts.length) {
            setHighlight(Math.max(0, posts.length - 1));
        }
    }, [showList, posts.length, highlight]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const selectPost = useCallback(
        (post: PostSummary) => {
            onChange(post.id, post);
            setSelectedPost(post);
            setQuery('');
            setOpen(false);
            setHighlight(0);
        },
        [onChange]
    );

    const clear = useCallback(() => {
        onChange(null);
        setSelectedPost(null);
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
    }, [onChange]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showList || posts.length === 0) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
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
            e.preventDefault();
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className={className}>
            {value ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {selectedPost?.title ?? value}
                    </span>
                    <Button
                        aria-label="Clear selected post"
                        disabled={disabled}
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={clear}
                    >
                        <LucideIcon.X className="size-4" />
                    </Button>
                </div>
            ) : null}

            {!value && (
                <div className="relative">
                    <InputGroup>
                        <InputGroupAddon align="inline-start">
                            <LucideIcon.Search className="size-4 text-muted-foreground" aria-hidden />
                        </InputGroupAddon>
                        <InputGroupInput
                            ref={inputRef}
                            aria-activedescendant={showList && posts[highlight] ? `${listId}-opt-${highlight}` : undefined}
                            aria-autocomplete="list"
                            aria-controls={listId}
                            aria-expanded={showList}
                            disabled={disabled}
                            placeholder={placeholder}
                            role="combobox"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            onKeyDown={onKeyDown}
                        />
                        <InputGroupAddon align="inline-end">
                            {isLoading && query.trim().length >= 3 ? (
                                <LoadingIndicator size="sm" />
                            ) : null}
                        </InputGroupAddon>
                    </InputGroup>

                    {showList && (
                        <div
                            className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                            id={listId}
                            role="listbox"
                        >
                            {error && (
                                <div className="p-3 text-sm text-destructive" role="alert">
                                    {error}
                                </div>
                            )}
                            {!error && !isLoading && posts.length === 0 && (
                                <div className="p-3 text-sm text-muted-foreground">No posts found</div>
                            )}
                            {!error &&
                                posts.map((post, i) => (
                                    <button
                                        key={post.id}
                                        aria-selected={i === highlight}
                                        className={`flex w-full cursor-pointer flex-col gap-0.5 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60 ${
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
                    )}

                    {open && query.trim().length < 3 && !disabled && (
                        <p className="mt-1 text-xs text-muted-foreground">Start typing to search posts…</p>
                    )}
                </div>
            )}
        </div>
    );
};
