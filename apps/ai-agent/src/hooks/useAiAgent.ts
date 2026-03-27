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

interface ChatResponse {
    reply: string;
    actions: PendingAction[];
    conversationId: string;
}

interface ExecuteResponse {
    results: Array<{
        actionId: string;
        success: boolean;
        result: string;
    }>;
}

export function useAiAgent() {
    const {apiRoot} = getGhostPaths();

    const sendMessage = async (message: string, conversationId?: string): Promise<ChatResponse> => {
        const response = await fetch(`${apiRoot}/ai-agent/chat/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
                message,
                conversation_id: conversationId
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI Agent request failed (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data.ai_agent[0] as ChatResponse;
    };

    const executeActions = async (actionIds: string[], conversationId: string): Promise<ExecuteResponse> => {
        const response = await fetch(`${apiRoot}/ai-agent/execute/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'app-pragma': 'no-cache'
            },
            credentials: 'include',
            body: JSON.stringify({
                action_ids: actionIds,
                conversation_id: conversationId
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
