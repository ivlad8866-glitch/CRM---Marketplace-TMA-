export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CursorResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ErrorResponse {
  status: number;
  code: ErrorCode;
  message: string;
  requestId: string;
  details?: { field: string; reason: string }[];
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'TICKET_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'WORKSPACE_NOT_FOUND'
  | 'SERVICE_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'INVALID_INIT_DATA'
  | 'INIT_DATA_EXPIRED'
  | 'INIT_DATA_REPLAYED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | 'FINGERPRINT_MISMATCH'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'EDIT_WINDOW_EXPIRED'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_TOO_LARGE'
  | 'IDEMPOTENCY_CONFLICT';
