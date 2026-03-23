import { z } from 'zod';
import { paginationSchema } from '@crm/shared';

export const customerListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isBanned: z.coerce.boolean().optional(),
});

export const updateCustomerSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  segment: z.string().max(200).nullable().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().max(500).nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
});
