import { z } from 'zod';

export const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/, 'Must be snake_case identifier'),
  label: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'number', 'date', 'select']),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updateCustomFieldSchema = createCustomFieldSchema.partial().omit({ name: true });
