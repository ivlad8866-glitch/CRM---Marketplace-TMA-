import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LIMITS } from '@crm/shared';
import { AttachmentsRepository } from '../repository/attachments.repository';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { GatewayEmitterService } from '../../gateway/gateway-emitter.service';

interface ScanJobData {
  attachmentId: string;
  storageKey: string;
}

@Processor('attachment-scan')
export class AttachmentScanConsumer extends WorkerHost {
  private readonly logger = new Logger(AttachmentScanConsumer.name);

  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly minio: MinioService,
    private readonly emitter: GatewayEmitterService,
  ) {
    super();
  }

  async process(job: Job<ScanJobData>) {
    const { attachmentId, storageKey } = job.data;

    const attachment = await this.repo.findByIdInternal(attachmentId);
    if (!attachment) {
      this.logger.warn(`Attachment ${attachmentId} not found in DB, skipping scan`);
      return;
    }

    const ticketId = attachment.message.ticketId;

    try {
      const stat = await this.minio.statObject(storageKey);
      const maxAllowed = Math.min(attachment.sizeBytes * 1.1, LIMITS.ATTACHMENT_MAX_SIZE);
      const scanStatus = stat.size > maxAllowed ? 'INFECTED' : 'CLEAN';

      await this.repo.updateScanStatus(attachmentId, scanStatus as 'CLEAN' | 'INFECTED', null);

      this.emitter.emitToTicket(ticketId, 'attachment:ready', {
        attachmentId,
        ticketId,
        scanStatus,
        previewUrl: null,
      });
    } catch (err) {
      this.logger.error(`File not found in storage for attachment ${attachmentId}, removing DB record`);
      await this.repo.delete(attachmentId);
    }
  }
}
