import { create } from 'zustand';
import type { LLMProvider } from '@/lib/llm/providers';

// Define Message type locally to avoid AI SDK 5.0 import issues
export type Message = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'data';
  content: string;
  createdAt?: Date;
  toolInvocations?: any[];
};

// Re-export LLMProvider for convenience
export type { LLMProvider };

export type Conversation = {
  id: string;
  title: string;
  provider: LLMProvider;
  created_at: string;
  updated_at: string;
};

export type OrderTicket = {
  id: string;
  symbol: string;
  quantity: number;
  action: 'BUY' | 'SELL';
  order_type: 'MKT' | 'LMT' | 'STP';
  limit_price?: number;
  estimated_value: number;
  position_pct: number;
  kelly_suggested?: number;
  risk_warnings: string[];
};

type ChatState = {
  // Current conversation
  currentConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];

  // Streaming state
  isStreaming: boolean;
  activeProvider: LLMProvider;
  useExtendedThinking: boolean;

  // Order confirmation
  pendingOrderTicket: OrderTicket | null;

  // Actions
  setCurrentConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  setIsStreaming: (streaming: boolean) => void;
  setActiveProvider: (provider: LLMProvider) => void;
  setUseExtendedThinking: (useExtendedThinking: boolean) => void;

  setPendingOrderTicket: (ticket: OrderTicket | null) => void;

  // Reset
  reset: () => void;
};

const initialState = {
  currentConversationId: null,
  conversations: [],
  messages: [],
  isStreaming: false,
  activeProvider: 'claude' as LLMProvider,
  useExtendedThinking: false,
  pendingOrderTicket: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setCurrentConversation: (id) => set({ currentConversationId: id }),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations]
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
    })),

  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c
      ),
    })),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setActiveProvider: (activeProvider) => set({ activeProvider }),

  setUseExtendedThinking: (useExtendedThinking) => set({ useExtendedThinking }),

  setPendingOrderTicket: (pendingOrderTicket) => set({ pendingOrderTicket }),

  reset: () => set(initialState),
}));
