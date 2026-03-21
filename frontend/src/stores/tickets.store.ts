import { create } from 'zustand';
import type { TicketListItem, TicketResponse, TicketCounters, PaginatedResponse } from '@crm/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from './auth.store';

interface TicketsState {
  tickets: TicketListItem[];
  activeTicket: TicketResponse | null;
  counters: TicketCounters;
  page: number;
  totalPages: number;
  isLoading: boolean;

  fetchTickets: (params?: { status?: string; search?: string; page?: number }) => Promise<void>;
  fetchTicket: (ticketId: string) => Promise<void>;
  updateTicketInList: (ticketId: string, changes: Partial<TicketListItem>) => void;
  clearActive: () => void;
}

const defaultCounters: TicketCounters = { new: 0, inProgress: 0, waitingCustomer: 0, slaOverdue: 0 };

export const useTicketsStore = create<TicketsState>((set) => ({
  tickets: [],
  activeTicket: null,
  counters: defaultCounters,
  page: 1,
  totalPages: 1,
  isLoading: false,

  fetchTickets: async (params) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;

    set({ isLoading: true });
    try {
      const res = await apiClient<PaginatedResponse<TicketListItem>>(
        `/workspaces/${wid}/tickets`,
        { params: params as Record<string, string | number | undefined> },
      );
      set({
        tickets: res.data,
        page: res.meta.page,
        totalPages: res.meta.totalPages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTicket: async (ticketId: string) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;

    try {
      const ticket = await apiClient<TicketResponse>(`/workspaces/${wid}/tickets/${ticketId}`);
      set({ activeTicket: ticket });
    } catch {
      // handled by caller
    }
  },

  updateTicketInList: (ticketId, changes) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, ...changes } : t,
      ),
    }));
  },

  clearActive: () => set({ activeTicket: null }),
}));
