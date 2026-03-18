import { z } from 'zod';

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().max(200).nullable().optional(),
  languageCode: z.string().max(10).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
