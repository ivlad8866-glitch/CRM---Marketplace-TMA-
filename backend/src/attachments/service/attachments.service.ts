import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LIMITS } from '@crm/shared';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { RequestUploadDto } from '../dto/attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly minio: MinioService,
    @InjectQueue('attachment-scan') private readonly scanQueue: Queue,
  ) {}

  async requestUpload(
    workspaceId: string,
    ticketId: string,
    userId: string,
    userRole: string,
    dto: RequestUploadDto,
  ) {
    // Validate MIME type against allowlist
    if (!LIMITS.ATTACHMENT_ALLOWED_MIMES.includes(dto.mimeType as any)) {
      throw new BadRequestException('FILE_TYPE_NOT_ALLOWED');
    }

    // Validate file extension against blocklist
    const ext = dto.fileName.includes('.')
      ? '.' + dto.fileName.split('.').pop()!.toLowerCase()
      : '';
    if (LIMITS.ATTACHMENT_BLOCKED_EXTENSIONS.includes(ext as any)) {
      throw new BadRequestException('FILE_TYPE_NOT_ALLOWED');
    }

    // UUID-based storage key — no user input in path (prevents path traversal)
    const storageKey = AttachmentsRepository.buildStorageKey(workspaceId, ticketId);
    const authorType = userRole === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

    // Create FILE message + Attachment atomically
    const { attachment } = await this.repo.createWithMessage(
      ticketId,
      workspaceId,
      userId,
      authorType,
      {
        storageKey,
        originalName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    );

    // Generate presigned PUT URL
    const uploadUrl = await this.minio.presignedPutUrl(storageKey);

    // Enqueue scan job (delayed 5s to allow upload to complete)
    await this.scanQueue.add(
      'scan',
      { attachmentId: attachment.id, storageKey },
      { delay: 5000, attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );

    return {
      attachmentId: attachment.id,
      uploadUrl,
      maxSize: LIMITS.ATTACHMENT_MAX_SIZE,
    };
  }

  async getDownloadUrl(attachmentId: string, workspaceId: string): Promise<string> {
    const attachment = await this.repo.findById(attachmentId, workspaceId);
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');

    // Block downloads of unscanned or infected files
    if (attachment.scanStatus !== 'CLEAN') {
      throw new ForbiddenException(
        attachment.scanStatus === 'INFECTED' ? 'FILE_INFECTED' : 'FILE_SCAN_PENDING',
      );
    }

    return this.minio.presignedGetUrl(attachment.storageKey);
  }

  async deleteAttachment(
    attachmentId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const attachment = await this.repo.findById(attachmentId, workspaceId);
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');

    // Only author, ADMIN, or WORKSPACE_OWNER can delete
    if (attachment.message.authorUserId !== userId && !['ADMIN', 'WORKSPACE_OWNER'].includes(userRole)) {
      throw new ForbiddenException('FORBIDDEN');
    }

    await this.minio.deleteObject(attachment.storageKey);
    await this.repo.delete(attachmentId);
  }
}
