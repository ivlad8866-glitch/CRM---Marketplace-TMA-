import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1),
  startParam: z.string().optional(),
});

export type TelegramAuthDto = z.infer<typeof telegramAuthSchema>;
