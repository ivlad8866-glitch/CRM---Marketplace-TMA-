import { Injectable, NotFoundException, ForbiddenException, UnprocessableEntityException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MessagesRepository } from '../repository/messages.repository';
import { LIMITS } from '@crm/shared';

@Injectable()
export class MessagesService {
  constructor(private readonly repo: MessagesRepository) {}

  async list(workspaceId: string, ticketId: string, options: { before?: string; limit: number }, userRole: string, userId?: string) {
    const excludeNotes = userRole === 'CUSTOMER';
    const { messages, hasMore } = await this.repo.findByTicket(workspaceId, ticketId, options, excludeNotes);

    return {
      data: messages.map((m) => this.formatMessage(m, userId)),
      meta: { hasMore, nextCursor: hasMore ? messages[0]?.id ?? null : null },
    };
  }

  async send(ticketId: string, workspaceId: string, dto: { text: string; type: string }, userId: string, userRole: string) {
    if (dto.type === 'NOTE' && userRole === 'CUSTOMER') {
      throw new ForbiddenException('FORBIDDEN');
    }

    const authorType = userRole === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

    const message = await this.repo.createWithSeq(ticketId, workspaceId, {
      type: dto.type,
      authorType,
      text: dto.text,
      authorUserId: userId,
    });

    return this.formatMessage(message, userId);
  }

  async edit(workspaceId: string, messageId: string, text: string, userId: string, version?: number) {
    const message = await this.repo.findById(messageId, workspaceId);
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');

    if (message.authorUserId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    const elapsed = Date.now() - message.createdAt.getTime();
    if (elapsed > LIMITS.MESSAGE_EDIT_WINDOW_MS) {
      throw new UnprocessableEntityException('EDIT_WINDOW_EXPIRED');
    }

    if (version !== undefined) {
      try {
        return await this.repo.update(messageId, text, version);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
          throw new ConflictException('CONFLICT');
        }
        throw e;
      }
    }
    return this.repo.update(messageId, text, message.version);
  }

  async delete(workspaceId: string, messageId: string, userId: string, userRole: string) {
    const message = await this.repo.findById(messageId, workspaceId);
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');

    if (message.authorUserId !== userId && !['ADMIN', 'WORKSPACE_OWNER'].includes(userRole)) {
      throw new ForbiddenException('FORBIDDEN');
    }

    await this.repo.softDelete(messageId);
  }

  private formatMessage(m: any, currentUserId?: string) {
    return {
      id: m.id,
      type: m.type,
      authorType: m.authorType,
      text: m.text,
      isEdited: m.isEdited,
      isDeleted: m.isDeleted,
      deliveredAt: m.deliveredAt?.toISOString() ?? null,
      readAt: m.readAt?.toISOString() ?? null,
      eventSeq: m.eventSeq,
      version: m.version,
      authorUserId: m.authorUserId,
      authorName: m.author ? `${m.author.firstName} ${m.author.lastName || ''}`.trim() : null,
      ticketId: m.ticketId,
      attachments: (m.attachments || []).map((a: any) => ({
        id: a.id, originalName: a.originalName, mimeType: a.mimeType,
        sizeBytes: a.sizeBytes, previewUrl: a.previewUrl, scanStatus: a.scanStatus,
        createdAt: a.createdAt.toISOString(),
      })),
      reactions: this.aggregateReactions(m.reactions || [], currentUserId),
      createdAt: m.createdAt.toISOString(),
    };
  }

  private aggregateReactions(reactions: any[], currentUserId?: string) {
    const map = new Map<string, { emoji: string; userIds: string[] }>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) map.set(r.emoji, { emoji: r.emoji, userIds: [] });
      map.get(r.emoji)!.userIds.push(r.userId);
    }
    return Array.from(map.values()).map((r) => ({
      emoji: r.emoji, count: r.userIds.length, userIds: r.userIds,
      myReaction: currentUserId ? r.userIds.includes(currentUserId) : false,
    }));
  }
}
