import { z } from 'zod';
import { LIMITS } from '../constants';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_MAX).default(LIMITS.PAGE_DEFAULT),
});

export const cursorPaginationSchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_MAX).default(LIMITS.MESSAGES_PAGE),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(LIMITS.MESSAGE_MAX_LENGTH),
  type: z.enum(['TEXT', 'NOTE']).default('TEXT'),
});

export const requestUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1).max(LIMITS.ATTACHMENT_MAX_SIZE),
});

export const rateTicketSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  slaMinutes: z.number().int().min(1).max(10080).default(30),
  routingMode: z.enum(['manual', 'round_robin']).default('manual'),
});

export const createMacroSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().default(0),
});

export const inviteTeamMemberSchema = z.object({
  telegramId: z.string().min(1),
  role: z.enum(['ADMIN', 'AGENT']),
});
