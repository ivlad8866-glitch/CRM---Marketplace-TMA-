import { z } from 'zod';
import { requestUploadSchema } from '@crm/shared';

export { requestUploadSchema };
export type RequestUploadDto = z.infer<typeof requestUploadSchema>;
