import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  botUsername: z.string().max(200).optional(),
});

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
