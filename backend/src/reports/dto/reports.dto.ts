import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  agentId: z.string().optional(),
  serviceId: z.string().optional(),
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
