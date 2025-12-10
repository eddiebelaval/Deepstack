import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../chat-store';
import { act } from '@testing-library/react';
import type { Message, Conversation, OrderTicket } from '../chat-store';

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useChatStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has empty conversations', () => {
      const state = useChatStore.getState();
      expect(state.conversations).toEqual([]);
    });

    it('has null current conversation', () => {
      const state = useChatStore.getState();
      expect(state.currentConversationId).toBeNull();
    });

    it('has empty messages', () => {
      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('is not streaming initially', () => {
      const state = useChatStore.getState();
      expect(state.isStreaming).toBe(false);
    });

    it('defaults to claude provider', () => {
      const state = useChatStore.getState();
      expect(state.activeProvider).toBe('claude');
    });

    it('has extended thinking disabled', () => {
      const state = useChatStore.getState();
      expect(state.useExtendedThinking).toBe(false);
    });

    it('has no pending order ticket', () => {
      const state = useChatStore.getState();
      expect(state.pendingOrderTicket).toBeNull();
    });
  });

  describe('conversation management', () => {
    describe('setCurrentConversation', () => {
      it('sets current conversation id', () => {
        act(() => {
          useChatStore.getState().setCurrentConversation('conv-123');
        });

        expect(useChatStore.getState().currentConversationId).toBe('conv-123');
      });

      it('can set to null', () => {
        act(() => {
          useChatStore.getState().setCurrentConversation('conv-123');
          useChatStore.getState().setCurrentConversation(null);
        });

        expect(useChatStore.getState().currentConversationId).toBeNull();
      });
    });

    describe('setConversations', () => {
      it('replaces all conversations', () => {
        const conversations: Conversation[] = [
          {
            id: 'conv-1',
            title: 'First Chat',
            provider: 'claude',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'conv-2',
            title: 'Second Chat',
            provider: 'openai',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        act(() => {
          useChatStore.getState().setConversations(conversations);
        });

        expect(useChatStore.getState().conversations).toEqual(conversations);
      });

      it('can set empty array', () => {
        act(() => {
          useChatStore.getState().setConversations([
            {
              id: 'conv-1',
              title: 'Test',
              provider: 'claude',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
          useChatStore.getState().setConversations([]);
        });

        expect(useChatStore.getState().conversations).toEqual([]);
      });
    });

    describe('addConversation', () => {
      it('adds conversation to beginning of list', () => {
        const conv1: Conversation = {
          id: 'conv-1',
          title: 'First',
          provider: 'claude',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const conv2: Conversation = {
          id: 'conv-2',
          title: 'Second',
          provider: 'openai',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        act(() => {
          useChatStore.getState().addConversation(conv1);
          useChatStore.getState().addConversation(conv2);
        });

        const conversations = useChatStore.getState().conversations;
        expect(conversations).toHaveLength(2);
        expect(conversations[0].id).toBe('conv-2'); // Most recent first
        expect(conversations[1].id).toBe('conv-1');
      });

      it('preserves conversation properties', () => {
        const conversation: Conversation = {
          id: 'conv-test',
          title: 'Test Conversation',
          provider: 'gemini',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        };

        act(() => {
          useChatStore.getState().addConversation(conversation);
        });

        const stored = useChatStore.getState().conversations[0];
        expect(stored).toEqual(conversation);
      });
    });

    describe('removeConversation', () => {
      beforeEach(() => {
        const conversations: Conversation[] = [
          {
            id: 'conv-1',
            title: 'First',
            provider: 'claude',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'conv-2',
            title: 'Second',
            provider: 'openai',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        act(() => {
          useChatStore.getState().setConversations(conversations);
        });
      });

      it('removes conversation by id', () => {
        act(() => {
          useChatStore.getState().removeConversation('conv-1');
        });

        const conversations = useChatStore.getState().conversations;
        expect(conversations).toHaveLength(1);
        expect(conversations[0].id).toBe('conv-2');
      });

      it('does nothing if id not found', () => {
        act(() => {
          useChatStore.getState().removeConversation('nonexistent');
        });

        expect(useChatStore.getState().conversations).toHaveLength(2);
      });

      it('clears current conversation if removed', () => {
        act(() => {
          useChatStore.getState().setCurrentConversation('conv-1');
          useChatStore.getState().removeConversation('conv-1');
        });

        expect(useChatStore.getState().currentConversationId).toBeNull();
      });

      it('preserves current conversation if different one removed', () => {
        act(() => {
          useChatStore.getState().setCurrentConversation('conv-2');
          useChatStore.getState().removeConversation('conv-1');
        });

        expect(useChatStore.getState().currentConversationId).toBe('conv-2');
      });
    });

    describe('updateConversationTitle', () => {
      beforeEach(() => {
        act(() => {
          useChatStore.getState().addConversation({
            id: 'conv-1',
            title: 'Original Title',
            provider: 'claude',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          });
        });
      });

      it('updates conversation title', () => {
        act(() => {
          useChatStore.getState().updateConversationTitle('conv-1', 'New Title');
        });

        const conversation = useChatStore.getState().conversations.find(
          (c) => c.id === 'conv-1'
        );
        expect(conversation?.title).toBe('New Title');
      });

      it('updates updated_at timestamp', async () => {
        const originalUpdatedAt = useChatStore.getState().conversations[0].updated_at;

        // Small delay to ensure different timestamp
        await new Promise((r) => setTimeout(r, 10));

        act(() => {
          useChatStore.getState().updateConversationTitle('conv-1', 'New Title');
        });

        const newUpdatedAt = useChatStore.getState().conversations[0].updated_at;
        expect(newUpdatedAt).not.toBe(originalUpdatedAt);
      });

      it('does not modify other conversations', () => {
        act(() => {
          useChatStore.getState().addConversation({
            id: 'conv-2',
            title: 'Other Title',
            provider: 'openai',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          useChatStore.getState().updateConversationTitle('conv-1', 'Updated');
        });

        const otherConversation = useChatStore.getState().conversations.find(
          (c) => c.id === 'conv-2'
        );
        expect(otherConversation?.title).toBe('Other Title');
      });

      it('does nothing if conversation not found', () => {
        act(() => {
          useChatStore.getState().updateConversationTitle('nonexistent', 'New Title');
        });

        const conversation = useChatStore.getState().conversations[0];
        expect(conversation.title).toBe('Original Title');
      });
    });
  });

  describe('message management', () => {
    describe('setMessages', () => {
      it('replaces all messages', () => {
        const messages: Message[] = [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            createdAt: new Date(),
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi there',
            createdAt: new Date(),
          },
        ];

        act(() => {
          useChatStore.getState().setMessages(messages);
        });

        expect(useChatStore.getState().messages).toEqual(messages);
      });

      it('can clear messages with empty array', () => {
        act(() => {
          useChatStore.getState().addMessage({
            id: 'msg-1',
            role: 'user',
            content: 'Test',
          });
          useChatStore.getState().setMessages([]);
        });

        expect(useChatStore.getState().messages).toEqual([]);
      });
    });

    describe('addMessage', () => {
      it('adds message to end of list', () => {
        act(() => {
          useChatStore.getState().addMessage({
            id: 'msg-1',
            role: 'user',
            content: 'First message',
          });
          useChatStore.getState().addMessage({
            id: 'msg-2',
            role: 'assistant',
            content: 'Second message',
          });
        });

        const messages = useChatStore.getState().messages;
        expect(messages).toHaveLength(2);
        expect(messages[0].id).toBe('msg-1');
        expect(messages[1].id).toBe('msg-2');
      });

      it('supports all message roles', () => {
        act(() => {
          useChatStore.getState().addMessage({
            id: 'msg-1',
            role: 'system',
            content: 'System message',
          });
          useChatStore.getState().addMessage({
            id: 'msg-2',
            role: 'user',
            content: 'User message',
          });
          useChatStore.getState().addMessage({
            id: 'msg-3',
            role: 'assistant',
            content: 'Assistant message',
          });
          useChatStore.getState().addMessage({
            id: 'msg-4',
            role: 'data',
            content: 'Data message',
          });
        });

        const messages = useChatStore.getState().messages;
        expect(messages).toHaveLength(4);
        expect(messages.map((m) => m.role)).toEqual([
          'system',
          'user',
          'assistant',
          'data',
        ]);
      });

      it('preserves optional properties', () => {
        const message: Message = {
          id: 'msg-1',
          role: 'assistant',
          content: 'Test',
          createdAt: new Date('2024-01-01'),
          toolInvocations: [{ toolName: 'search', args: {} }],
        };

        act(() => {
          useChatStore.getState().addMessage(message);
        });

        const stored = useChatStore.getState().messages[0];
        expect(stored).toEqual(message);
      });
    });
  });

  describe('streaming state', () => {
    describe('setIsStreaming', () => {
      it('sets streaming to true', () => {
        act(() => {
          useChatStore.getState().setIsStreaming(true);
        });

        expect(useChatStore.getState().isStreaming).toBe(true);
      });

      it('sets streaming to false', () => {
        act(() => {
          useChatStore.getState().setIsStreaming(true);
          useChatStore.getState().setIsStreaming(false);
        });

        expect(useChatStore.getState().isStreaming).toBe(false);
      });
    });

    describe('setActiveProvider', () => {
      it('changes to openai', () => {
        act(() => {
          useChatStore.getState().setActiveProvider('openai');
        });

        expect(useChatStore.getState().activeProvider).toBe('openai');
      });

      it('changes to gemini', () => {
        act(() => {
          useChatStore.getState().setActiveProvider('gemini');
        });

        expect(useChatStore.getState().activeProvider).toBe('gemini');
      });

      it('changes to anthropic', () => {
        act(() => {
          useChatStore.getState().setActiveProvider('anthropic');
        });

        expect(useChatStore.getState().activeProvider).toBe('anthropic');
      });

      it('stays on claude if set again', () => {
        act(() => {
          useChatStore.getState().setActiveProvider('openai');
          useChatStore.getState().setActiveProvider('claude');
        });

        expect(useChatStore.getState().activeProvider).toBe('claude');
      });
    });

    describe('setUseExtendedThinking', () => {
      it('enables extended thinking', () => {
        act(() => {
          useChatStore.getState().setUseExtendedThinking(true);
        });

        expect(useChatStore.getState().useExtendedThinking).toBe(true);
      });

      it('disables extended thinking', () => {
        act(() => {
          useChatStore.getState().setUseExtendedThinking(true);
          useChatStore.getState().setUseExtendedThinking(false);
        });

        expect(useChatStore.getState().useExtendedThinking).toBe(false);
      });
    });
  });

  describe('order ticket management', () => {
    const mockOrderTicket: OrderTicket = {
      id: 'order-123',
      symbol: 'AAPL',
      quantity: 10,
      action: 'BUY',
      order_type: 'MKT',
      estimated_value: 1750.00,
      position_pct: 5.0,
      kelly_suggested: 4.5,
      risk_warnings: ['High volatility'],
    };

    describe('setPendingOrderTicket', () => {
      it('sets pending order ticket', () => {
        act(() => {
          useChatStore.getState().setPendingOrderTicket(mockOrderTicket);
        });

        expect(useChatStore.getState().pendingOrderTicket).toEqual(mockOrderTicket);
      });

      it('clears pending order ticket with null', () => {
        act(() => {
          useChatStore.getState().setPendingOrderTicket(mockOrderTicket);
          useChatStore.getState().setPendingOrderTicket(null);
        });

        expect(useChatStore.getState().pendingOrderTicket).toBeNull();
      });

      it('handles limit orders', () => {
        const limitOrder: OrderTicket = {
          ...mockOrderTicket,
          order_type: 'LMT',
          limit_price: 175.50,
        };

        act(() => {
          useChatStore.getState().setPendingOrderTicket(limitOrder);
        });

        const ticket = useChatStore.getState().pendingOrderTicket;
        expect(ticket?.order_type).toBe('LMT');
        expect(ticket?.limit_price).toBe(175.50);
      });

      it('handles sell orders', () => {
        const sellOrder: OrderTicket = {
          ...mockOrderTicket,
          action: 'SELL',
        };

        act(() => {
          useChatStore.getState().setPendingOrderTicket(sellOrder);
        });

        expect(useChatStore.getState().pendingOrderTicket?.action).toBe('SELL');
      });

      it('replaces existing order ticket', () => {
        const order1: OrderTicket = {
          ...mockOrderTicket,
          id: 'order-1',
          symbol: 'AAPL',
        };

        const order2: OrderTicket = {
          ...mockOrderTicket,
          id: 'order-2',
          symbol: 'MSFT',
        };

        act(() => {
          useChatStore.getState().setPendingOrderTicket(order1);
          useChatStore.getState().setPendingOrderTicket(order2);
        });

        const ticket = useChatStore.getState().pendingOrderTicket;
        expect(ticket?.id).toBe('order-2');
        expect(ticket?.symbol).toBe('MSFT');
      });
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      act(() => {
        // Modify all state
        useChatStore.getState().setCurrentConversation('conv-123');
        useChatStore.getState().addConversation({
          id: 'conv-123',
          title: 'Test',
          provider: 'openai',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        useChatStore.getState().addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Test',
        });
        useChatStore.getState().setIsStreaming(true);
        useChatStore.getState().setActiveProvider('openai');
        useChatStore.getState().setUseExtendedThinking(true);
        useChatStore.getState().setPendingOrderTicket({
          id: 'order-1',
          symbol: 'AAPL',
          quantity: 10,
          action: 'BUY',
          order_type: 'MKT',
          estimated_value: 1750.00,
          position_pct: 5.0,
          risk_warnings: [],
        });

        // Reset
        useChatStore.getState().reset();
      });

      const state = useChatStore.getState();
      expect(state.currentConversationId).toBeNull();
      expect(state.conversations).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.isStreaming).toBe(false);
      expect(state.activeProvider).toBe('claude');
      expect(state.useExtendedThinking).toBe(false);
      expect(state.pendingOrderTicket).toBeNull();
    });
  });
});
