import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTicket(workspaceId: string, ticketId: string, options: { before?: string; limit: number }, excludeNotes: boolean) {
    const where: any = { ticketId, workspaceId, isDeleted: false };
    if (excludeNotes) where.type = { not: 'NOTE' };
    if (options.before) {
      const cursor = await this.prisma.message.findUnique({ where: { id: options.before }, select: { createdAt: true } });
      if (cursor) where.createdAt = { lt: cursor.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit + 1,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        reactions: { include: { user: { select: { id: true } } } },
      },
    });

    const hasMore = messages.length > options.limit;
    if (hasMore) messages.pop();

    return { messages: messages.reverse(), hasMore };
  }

  async createWithSeq(ticketId: string, workspaceId: string, data: {
    type: string; authorType: string; text: string;
    authorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

      const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
        SELECT MAX("eventSeq") as max FROM "Message" WHERE "ticketId" = ${ticketId}
      `;
      const nextSeq = (max ?? 0) + 1;

      return tx.message.create({
        data: {
          ...data,
          ticketId,
          workspaceId,
          eventSeq: nextSeq,
        } as any,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          attachments: true,
          reactions: true,
        },
      });
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.message.findFirst({
      where: { id, workspaceId },
      include: { ticket: { select: { workspaceId: true } } },
    });
  }

  async update(id: string, text: string, version: number) {
    return this.prisma.message.update({
      where: { id, version },
      data: { text, isEdited: true, version: { increment: 1 } },
    });
  }

  async softDelete(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { isDeleted: true, text: null },
    });
  }
}
