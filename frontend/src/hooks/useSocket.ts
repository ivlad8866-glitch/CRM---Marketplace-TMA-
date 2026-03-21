import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../lib/socket-manager';
import { useAuthStore } from '../stores/auth.store';
import { useMessagesStore } from '../stores/messages.store';
import { useTicketsStore } from '../stores/tickets.store';

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeWorkspaceId = useAuthStore((s) => s.activeWorkspaceId);

  useEffect(() => {
    if (!isAuthenticated || !activeWorkspaceId) return;

    const socket = connectSocket();

    socket.on('message:new', (message) => {
      useMessagesStore.getState().addMessage(message.ticketId, message);
    });

    socket.on('message:edited', ({ messageId, text }) => {
      const state = useMessagesStore.getState();
      for (const ticketId of Object.keys(state.messagesByTicket)) {
        state.updateMessage(ticketId, messageId, { text, isEdited: true } as any);
      }
    });

    socket.on('message:deleted', ({ messageId }) => {
      const state = useMessagesStore.getState();
      for (const ticketId of Object.keys(state.messagesByTicket)) {
        state.removeMessage(ticketId, messageId);
      }
    });

    socket.on('typing:update', ({ ticketId, userId, userName, isTyping }) => {
      useMessagesStore.getState().setTyping(ticketId, userId, userName, isTyping);
    });

    socket.on('receipt:read', ({ ticketId, messageId, readAt }) => {
      useMessagesStore.getState().updateMessage(ticketId, messageId, { readAt } as any);
    });

    socket.on('ticket:updated', ({ ticketId, changes }) => {
      useTicketsStore.getState().updateTicketInList(ticketId, changes as any);
    });

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, activeWorkspaceId]);
}
