import { useCallback, useState } from "react";
import type { Ticket, Message } from "../types";
import { useAuthStore } from "../stores/auth.store";
import { apiClient } from "../lib/api-client";
import { apiTicketToLocal, apiMessageToLocal } from "../lib/adapters";
import { demoTickets, demoMessages } from "../data/demo-data";

export function useApiData() {
  const [tickets, setTickets] = useState<Ticket[]>(demoTickets);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;
    setTicketsLoading(true);
    try {
      const res = await apiClient<any>(`/workspaces/${wid}/tickets`);
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      const mapped = (Array.isArray(items) ? items : []).map(apiTicketToLocal);
      if (mapped.length > 0) {
        setTickets(mapped);
      }
    } catch {
      // fallback: keep demo data
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (ticketId: string) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;
    setMessagesLoading(true);
    try {
      const res = await apiClient<any>(
        `/workspaces/${wid}/tickets/${ticketId}/messages`
      );
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      const mapped = (Array.isArray(items) ? items : []).map(apiMessageToLocal);
      if (mapped.length > 0) {
        setMessages(mapped);
      } else {
        setMessages(demoMessages);
      }
    } catch {
      setMessages(demoMessages);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessageToApi = useCallback(async (ticketId: string, text: string) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;
    try {
      await apiClient(`/workspaces/${wid}/tickets/${ticketId}/messages`, {
        method: "POST",
        body: { type: "TEXT", text },
      });
    } catch {
      // message already added to local state
    }
  }, []);

  return {
    tickets,
    setTickets,
    ticketsLoading,
    messages,
    setMessages,
    messagesLoading,
    loadTickets,
    loadMessages,
    sendMessageToApi,
  };
}
