import { TicketStatus, TicketPriority } from './enums';
export interface TicketResponse {
    id: string;
    ticketNumber: string;
    status: TicketStatus;
    priority: TicketPriority;
    title: string | null;
    summary: string | null;
    tags: string[];
    firstResponseAt: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    slaDeadline: string | null;
    rating: number | null;
    ratingComment: string | null;
    version: number;
    serviceId: string;
    customerId: string;
    assigneeId: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface TicketListItem extends TicketResponse {
    customerName: string;
    customerNumber: string;
    serviceName: string;
    assigneeName: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
}
export interface TicketCounters {
    new: number;
    inProgress: number;
    waitingCustomer: number;
    slaOverdue: number;
}
//# sourceMappingURL=ticket.d.ts.map