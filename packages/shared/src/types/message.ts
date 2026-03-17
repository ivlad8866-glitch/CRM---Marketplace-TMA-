import { MessageType, MessageAuthor, ScanStatus } from './enums';

export interface MessageResponse {
  id: string;
  type: MessageType;
  authorType: MessageAuthor;
  text: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  deliveredAt: string | null;
  readAt: string | null;
  eventSeq: number;
  version: number;
  authorUserId: string | null;
  authorName: string | null;
  ticketId: string;
  attachments: AttachmentResponse[];
  reactions: ReactionResponse[];
  createdAt: string;
}

export interface AttachmentResponse {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string | null;
  scanStatus: ScanStatus;
  downloadUrl?: string;
  createdAt: string;
}

export interface ReactionResponse {
  emoji: string;
  count: number;
  userIds: string[];
  myReaction: boolean;
}

export interface UploadUrlResponse {
  attachmentId: string;
  uploadUrl: string;
  maxSize: number;
}
