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

        const data = await response.json();
        return data.ai_agent[0] as ChatResponse;
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

        const data = await response.json();
        return data.ai_agent[0] as ExecuteResponse;
    };

    return {sendMessage, executeActions};
}

export type {ChatMessage, PendingAction, ChatResponse, ExecuteResponse};
