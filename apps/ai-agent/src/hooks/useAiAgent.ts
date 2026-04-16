import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    actions?: PendingAction[];
    timestamp: number;
}

interface PendingAction {
    id: string;
    tool: string;
    description: string;
    args: Record<string, unknown>;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
    result?: string;
}

interface BackendPendingAction {
    id: string;
    tool: string;
    arguments: Record<string, unknown>;
}

interface ChatResponse {
    message: string;
    pendingActions: BackendPendingAction[];
    status: string;
}

interface ExecuteResponse {
    results: Array<{
        tool: string;
        success: boolean;
        result: unknown;
        error?: string;
    }>;
}

interface SearchResult {
    id: string;
    title: string;
    slug: string;
    url: string;
    publishedAt: string;
    excerpt: string;
    relevanceScore: number;
    tags?: string[];
    matchedKeywords?: string[];
    content?: string;
}

interface SearchResponse {
    results: SearchResult[];
    query: string;
    method: 'semantic' | 'keyword' | 'none';
    message?: string;
}

export function useAiAgent() {
    const {apiRoot} = getGhostPaths();

    const sendMessage = async (message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> => {
        const response = await fetch(`${apiRoot}/ai-agent/chat/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
                message,
                conversation_history: conversationHistory
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI Agent request failed (${response.status}): ${errorBody}`);
        }

        const data: {ai_agent?: unknown} = await response.json();
        const row = data?.ai_agent;
        const first = Array.isArray(row) ? row[0] : row;
        if (!first || typeof first !== 'object') {
            throw new Error(`Unexpected AI Agent response shape: ${JSON.stringify(data).slice(0, 240)}`);
        }
        const r = first as Record<string, unknown>;
        const pending = r.pendingActions ?? r.pending_actions;
        const messageVal = r.message;
        return {
            message: typeof messageVal === 'string' ? messageVal : (messageVal !== null && messageVal !== undefined) ? String(messageVal) : '',
            pendingActions: Array.isArray(pending) ? (pending as BackendPendingAction[]) : [],
            status: typeof r.status === 'string' ? r.status : 'complete'
        };
    };

    const executeActions = async (actions: PendingAction[]): Promise<ExecuteResponse> => {
        const response = await fetch(`${apiRoot}/ai-agent/execute/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
                actions: actions.map(action => ({
                    id: action.id,
                    tool: action.tool,
                    arguments: action.args
                }))
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI Agent execute failed (${response.status}): ${errorBody}`);
        }

        const data: {ai_agent?: unknown} = await response.json();
        const row = data?.ai_agent;
        const first = Array.isArray(row) ? row[0] : row;
        if (!first || typeof first !== 'object') {
            throw new Error(`Unexpected AI Agent execute response: ${JSON.stringify(data).slice(0, 240)}`);
        }
        return first as ExecuteResponse;
    };

    const searchContent = async (query: string, limit = 5): Promise<SearchResponse> => {
        const response = await fetch(`${apiRoot}/ai-agent/search/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({query, limit})
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI Agent search failed (${response.status}): ${errorBody}`);
        }

        const data: {ai_agent?: unknown} = await response.json();
        const row = data?.ai_agent;
        const first = Array.isArray(row) ? row[0] : row;
        if (!first || typeof first !== 'object') {
            throw new Error(`Unexpected AI Agent search response: ${JSON.stringify(data).slice(0, 240)}`);
        }
        return first as SearchResponse;
    };

    return {sendMessage, executeActions, searchContent};
}

export type {ChatMessage, PendingAction, ChatResponse, ExecuteResponse, SearchResult, SearchResponse};

