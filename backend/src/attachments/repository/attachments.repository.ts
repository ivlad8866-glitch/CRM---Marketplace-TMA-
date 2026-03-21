import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a FILE message and its Attachment in a single transaction.
   * Uses the same eventSeq serialization as MessagesRepository.createWithSeq.
   */
  async createWithMessage(
    ticketId: string,
    workspaceId: string,
    authorUserId: string,
    authorType: string,
    attachment: {
      storageKey: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lock ticket row for eventSeq serialization
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

      const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
        SELECT MAX("eventSeq") as max FROM "Message" WHERE "ticketId" = ${ticketId}
      `;
      const nextSeq = (max ?? 0) + 1;

      const message = await tx.message.create({
        data: {
          type: 'FILE',
          authorType,
          text: attachment.originalName,
          ticketId,
          workspaceId,
          authorUserId,
          eventSeq: nextSeq,
        } as any,
      });

      const att = await tx.attachment.create({
        data: {
          storageKey: attachment.storageKey,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          messageId: message.id,
          workspaceId,
        },
      });

      return { message, attachment: att };
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.attachment.findFirst({
      where: { id, workspaceId },
      include: { message: { select: { ticketId: true, authorUserId: true } } },
    });
  }

  /** For internal use by scan consumer (trusted context, no workspace filter). */
  async findByIdInternal(id: string) {
    return this.prisma.attachment.findUnique({
      where: { id },
      include: { message: { select: { ticketId: true } } },
    });
  }

  async updateScanStatus(id: string, scanStatus: 'CLEAN' | 'INFECTED', previewUrl?: string | null) {
    return this.prisma.attachment.update({
      where: { id },
      data: { scanStatus, ...(previewUrl !== undefined ? { previewUrl } : {}) },
    });
  }

  async delete(id: string) {
    return this.prisma.attachment.delete({ where: { id } });
  }

  /** Generate a safe, UUID-based storage key (no user input in path). */
  static buildStorageKey(workspaceId: string, ticketId: string): string {
    return `${workspaceId}/${ticketId}/${randomUUID()}`;
  }
}
