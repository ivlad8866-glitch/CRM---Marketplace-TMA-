import { create } from 'zustand';
import type { MessageResponse, CursorResponse } from '@crm/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from './auth.store';

interface TypingUser {
  userId: string;
  userName: string;
  timeout: ReturnType<typeof setTimeout>;
}

interface MessagesState {
  messagesByTicket: Record<string, MessageResponse[]>;
  hasMore: Record<string, boolean>;
  typingUsers: Record<string, TypingUser[]>;
  isLoading: boolean;

  fetchMessages: (ticketId: string, before?: string) => Promise<void>;
  addMessage: (ticketId: string, message: MessageResponse) => void;
  updateMessage: (ticketId: string, messageId: string, changes: Partial<MessageResponse>) => void;
  removeMessage: (ticketId: string, messageId: string) => void;
  setTyping: (ticketId: string, userId: string, userName: string, isTyping: boolean) => void;
  clearTicketMessages: (ticketId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messagesByTicket: {},
  hasMore: {},
  typingUsers: {},
  isLoading: false,

  fetchMessages: async (ticketId, before) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;

    set({ isLoading: true });
    try {
      const params: Record<string, string | number | undefined> = {};
      if (before) params.before = before;

      const res = await apiClient<CursorResponse<MessageResponse>>(
        `/workspaces/${wid}/tickets/${ticketId}/messages`,
        { params },
      );

      set((state) => {
        const existing = state.messagesByTicket[ticketId] || [];
        const merged = before ? [...res.data, ...existing] : res.data;
        return {
          messagesByTicket: { ...state.messagesByTicket, [ticketId]: merged },
          hasMore: { ...state.hasMore, [ticketId]: res.hasMore },
          isLoading: false,
        };
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (ticketId, message) => {
    set((state) => {
      const existing = state.messagesByTicket[ticketId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: [...existing, message],
        },
      };
    });
  },

  updateMessage: (ticketId, messageId, changes) => {
    set((state) => {
      const msgs = state.messagesByTicket[ticketId];
      if (!msgs) return state;
      return {
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: msgs.map((m) => (m.id === messageId ? { ...m, ...changes } : m)),
        },
      };
    });
  },

  removeMessage: (ticketId, messageId) => {
    set((state) => {
      const msgs = state.messagesByTicket[ticketId];
      if (!msgs) return state;
      return {
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: msgs.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, text: null } : m,
          ),
        },
      };
    });
  },

  setTyping: (ticketId, userId, userName, isTyping) => {
    set((state) => {
      const current = state.typingUsers[ticketId] || [];

      const existing = current.find((t) => t.userId === userId);
      if (existing) clearTimeout(existing.timeout);

      if (!isTyping) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [ticketId]: current.filter((t) => t.userId !== userId),
          },
        };
      }

      const timeout = setTimeout(() => {
        get().setTyping(ticketId, userId, userName, false);
      }, 5000);

      const filtered = current.filter((t) => t.userId !== userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [ticketId]: [...filtered, { userId, userName, timeout }],
        },
      };
    });
  },

  clearTicketMessages: (ticketId) => {
    set((state) => {
      const { [ticketId]: _, ...rest } = state.messagesByTicket;
      return { messagesByTicket: rest };
    });
  },
}));
