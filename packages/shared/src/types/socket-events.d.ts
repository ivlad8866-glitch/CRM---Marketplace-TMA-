import { MessageResponse } from './message';
import { TicketResponse } from './ticket';
export interface ClientToServerEvents {
    join_ticket: (payload: {
        ticketId: string;
    }, ack: (res: {
        ok: boolean;
        error?: string;
    }) => void) => void;
    leave_ticket: (payload: {
        ticketId: string;
    }) => void;
    'message:send': (payload: {
        ticketId: string;
        text: string;
        type: 'TEXT' | 'NOTE';
        tempId: string;
    }, ack: (res: {
        ok: boolean;
        message?: MessageResponse;
        error?: string;
    }) => void) => void;
    'typing:start': (payload: {
        ticketId: string;
    }) => void;
    'typing:stop': (payload: {
        ticketId: string;
    }) => void;
    'message:read': (payload: {
        ticketId: string;
        messageId: string;
    }) => void;
    'reaction:toggle': (payload: {
        messageId: string;
        emoji: string;
    }) => void;
    heartbeat: () => void;
}
export interface ServerToClientEvents {
    'message:new': (payload: MessageResponse) => void;
    'message:edited': (payload: {
        messageId: string;
        text: string;
        updatedAt: string;
    }) => void;
    'message:deleted': (payload: {
        messageId: string;
    }) => void;
    'typing:update': (payload: {
        ticketId: string;
        userId: string;
        userName: string;
        isTyping: boolean;
    }) => void;
    'receipt:delivered': (payload: {
        ticketId: string;
        messageId: string;
        deliveredAt: string;
    }) => void;
    'receipt:read': (payload: {
        ticketId: string;
        messageId: string;
        readAt: string;
        readByUserId: string;
    }) => void;
    'ticket:updated': (payload: {
        ticketId: string;
        changes: Partial<TicketResponse>;
    }) => void;
    'ticket:assigned': (payload: {
        ticketId: string;
        assigneeId: string;
        assigneeName: string;
    }) => void;
    'notification:new': (payload: {
        type: string;
        title: string;
        body: string;
        ticketId?: string;
    }) => void;
    'presence:update': (payload: {
        userId: string;
        status: 'online' | 'offline';
    }) => void;
    'attachment:ready': (payload: {
        attachmentId: string;
        ticketId: string;
        scanStatus: string;
        previewUrl: string | null;
    }) => void;
}
//# sourceMappingURL=socket-events.d.ts.map