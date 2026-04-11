const STORAGE_KEY = 'ghost-ai-conversations';

export interface Conversation {
    id: string;
    title: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        actions?: Array<{
            id: string;
            tool: string;
            description: string;
            args: Record<string, unknown>;
            status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
            result?: string;
        }>;
        timestamp: number;
    }>;
    createdAt: number;
    updatedAt: number;
}

function generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateTitle(firstMessage: string): string {
    const cleaned = firstMessage.replace(/\n/g, ' ').trim();
    if (cleaned.length <= 50) {
        return cleaned;
    }
    return cleaned.substring(0, 47) + '...';
}

export function loadConversations(): Conversation[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.sort((a: Conversation, b: Conversation) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
}

export function saveConversation(conversation: Conversation): void {
    const all = loadConversations();
    const idx = all.findIndex(c => c.id === conversation.id);
    if (idx >= 0) {
        all[idx] = conversation;
    } else {
        all.unshift(conversation);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteConversation(conversationId: string): void {
    const all = loadConversations().filter(c => c.id !== conversationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function createConversation(firstMessage?: string): Conversation {
    return {
        id: generateId(),
        title: firstMessage ? generateTitle(firstMessage) : 'New conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

export function getConversation(conversationId: string): Conversation | undefined {
    return loadConversations().find(c => c.id === conversationId);
}
