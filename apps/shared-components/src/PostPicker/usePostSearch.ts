import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useEffect, useMemo, useState} from 'react';
import type {Post} from '@tryghost/admin-x-framework/api/posts';

/**
 * Summary row for post picker lists (admin posts API subset).
 */
export type PostSummary = {
    id: string;
    title: string;
    slug: string;
    publishedAt: string | null;
    status: 'published' | 'draft' | 'scheduled';
};

const escapeNql = (value: string) => '\'' + value.replace(/'/g, '\\\'') + '\'';

const buildFilter = (query: string, status: 'published' | 'draft' | 'all' | undefined) => {
    const parts = ['type:post'];
    if (status === 'published') {
        parts.push('status:published');
    } else if (status === 'draft') {
        parts.push('status:draft');
    }
    if (query.trim().length > 0) {
        parts.push(`title:~${escapeNql(query.trim())}`);
    }
    return parts.join('+');
};

const toSummary = (p: Post): PostSummary => {
    const raw = (p.status || 'draft').toLowerCase();
    let status: PostSummary['status'] = 'draft';
    if (raw === 'published') {
        status = 'published';
    } else if (raw === 'scheduled') {
        status = 'scheduled';
    }
    return {
        id: p.id,
        title: p.title || '(Untitled)',
        slug: p.slug,
        publishedAt: p.published_at ?? null,
        status
    };
};

export type UsePostSearchOptions = {
    query: string;
    status?: 'published' | 'draft' | 'all';
    /** Max results for title search (and non-recent fetches). */
    limit?: number;
    /**
     * When true, an empty debounced query loads recent posts (`updated_at desc`).
     * When false (inline picker), an empty query does not fetch — use `>= 3` chars to search.
     */
    loadRecentWhenEmpty?: boolean;
    /** Page size for the recent list when `loadRecentWhenEmpty` is true. */
    recentLimit?: number;
};

/**
 * Debounced post search against the Ghost Admin posts API using admin-x-framework auth.
 *
 * @returns Matching posts, loading state, and a user-facing error string (no throw).
 */
export function usePostSearch(options: UsePostSearchOptions): {
    posts: PostSummary[];
    isLoading: boolean;
    error: string | null;
} {
    const {query, status = 'all', limit = 10, loadRecentWhenEmpty = false, recentLimit = 20} = options;
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const handle = window.setTimeout(() => setDebouncedQuery(query), 300);
        return () => window.clearTimeout(handle);
    }, [query]);

    const trimmed = debouncedQuery.trim();
    const isRecentList = loadRecentWhenEmpty && trimmed === '';
    const needsMoreChars = trimmed.length > 0 && trimmed.length < 3;
    const canSearch = loadRecentWhenEmpty ? !needsMoreChars : trimmed.length >= 3;

    const searchParams = useMemo((): Record<string, string> => {
        const searchLim = String(limit ?? 10);
        const recentLim = String(recentLimit ?? 20);
        if (isRecentList) {
            return {
                filter: buildFilter('', status),
                fields: 'id,title,slug,published_at,status',
                limit: recentLim,
                order: 'updated_at desc'
            };
        }
        return {
            filter: buildFilter(trimmed, status),
            fields: 'id,title,slug,published_at,status',
            limit: searchLim
        };
    }, [trimmed, status, limit, recentLimit, isRecentList]);

    const {data, isLoading, isFetching, error} = useBrowsePosts({
        searchParams,
        enabled: canSearch,
        defaultErrorHandler: false
    });

    const posts = useMemo(() => {
        if (!canSearch) {
            return [];
        }
        return (data?.posts ?? []).map(toSummary);
    }, [data, canSearch]);

    const errorMessage = error
        ? error instanceof Error
            ? error.message
            : String(error)
        : null;

    return {
        posts,
        isLoading: Boolean(isLoading || isFetching),
        error: errorMessage
    };
}
