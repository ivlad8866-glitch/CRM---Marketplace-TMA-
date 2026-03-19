import { z } from 'zod';
import { paginationSchema, rateTicketSchema } from '@crm/shared';

export const createTicketSchema = z.object({
  serviceId: z.string().min(1),
  message: z.string().min(1).max(10000).optional(),
});

export const ticketListQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  serviceId: z.string().optional(),
  search: z.string().optional(),
});

export const updateTicketSchema = z.object({
  status: z
    .enum(['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'SPAM', 'DUPLICATE'])
    .optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(5000).optional(),
});

export { rateTicketSchema };
