import { z } from 'zod';

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  botUsername: z.string().max(200).nullable().optional(),
  brandConfig: z.record(z.unknown()).optional(),
  slaDefaults: z.record(z.number().int().min(1)).optional(),
});

export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
