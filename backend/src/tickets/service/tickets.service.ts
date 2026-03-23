import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TicketsRepository } from '../repository/tickets.repository';
import { TicketStateMachine } from '../state-machine/ticket-state-machine';

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(workspaceId: string, dto: { serviceId: string; message?: string }, userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!profile) throw new ForbiddenException('FORBIDDEN');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, workspaceId, isActive: true },
    });
    if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');

    return this.prisma.$transaction(async (tx) => {
      const [counter] = await tx.$queryRaw<{ lastValue: number }[]>`
        SELECT "lastValue" FROM "WorkspaceCounter"
        WHERE "workspaceId" = ${workspaceId} AND "counterType" = 'ticket'
        FOR UPDATE
      `;
      const nextTicket = (counter?.lastValue ?? 0) + 1;
      await tx.$queryRaw`
        UPDATE "WorkspaceCounter" SET "lastValue" = ${nextTicket}
        WHERE "workspaceId" = ${workspaceId} AND "counterType" = 'ticket'
      `;
      const year = new Date().getFullYear();
      const ticketNumber = `T-${year}-${String(nextTicket).padStart(6, '0')}`;

      const ticket = await tx.ticket.create({
        data: {
          workspaceId,
          serviceId: service.id,
          customerId: profile.id,
          ticketNumber,
          slaDeadline: new Date(Date.now() + service.slaMinutes * 60 * 1000),
        },
      });

      return ticket;
    });
  }

  async list(workspaceId: string, filters: any, userRole: string, userId?: string) {
    if (userRole === 'CUSTOMER' && userId) {
      const profile = await this.prisma.customerProfile.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        select: { id: true },
      });
      if (!profile) {
        return {
          data: [],
          meta: { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 },
          counters: { new: 0, inProgress: 0, waitingCustomer: 0, slaOverdue: 0 },
        };
      }
      filters.customerId = profile.id;
    }

    const { data, total } = await this.repo.findByWorkspace(workspaceId, filters);
    const counters = await this.repo.getCounters(workspaceId);

    return {
      data: data.map((t) => this.formatListItem(t)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
      counters,
    };
  }

  async getById(workspaceId: string, ticketId: string, userRole: string, userId?: string) {
    const ticket = await this.repo.findById(ticketId, workspaceId);
    if (!ticket) throw new NotFoundException('TICKET_NOT_FOUND');

    if (userRole === 'CUSTOMER' && ticket.customer.userId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return this.formatDetail(ticket);
  }

  async update(workspaceId: string, ticketId: string, dto: any, version?: number) {
    const ticket = await this.repo.findById(ticketId, workspaceId);
    if (!ticket) throw new NotFoundException('TICKET_NOT_FOUND');

    if (dto.status && dto.status !== ticket.status) {
      TicketStateMachine.assertTransition(ticket.status, dto.status);

      if (ticket.status === 'RESOLVED' && dto.status === 'IN_PROGRESS' && ticket.resolvedAt) {
        const daysSinceResolved =
          (Date.now() - new Date(ticket.resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceResolved > 7) {
          throw new UnprocessableEntityException('INVALID_STATE_TRANSITION');
        }
      }
    }

    const data: any = { ...dto };
    if (dto.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
      data.resolvedAt = new Date();
    }
    if (dto.status === 'CLOSED' && ticket.status !== 'CLOSED') {
      data.closedAt = new Date();
    }

    try {
      const updated = await this.repo.update(ticketId, data, version);
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }

  async rate(
    workspaceId: string,
    ticketId: string,
    userId: string,
    rating: number,
    comment?: string,
  ) {
    const ticket = await this.repo.findById(ticketId, workspaceId);
    if (!ticket) throw new NotFoundException('TICKET_NOT_FOUND');

    if (ticket.customer.userId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new UnprocessableEntityException('INVALID_STATE_TRANSITION');
    }

    return this.repo.rate(ticketId, rating, comment);
  }

  private formatListItem(t: any) {
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      priority: t.priority,
      title: t.title,
      tags: t.tags,
      slaDeadline: t.slaDeadline?.toISOString() ?? null,
      version: t.version,
      customerName: `${t.customer.user.firstName} ${t.customer.user.lastName || ''}`.trim(),
      customerNumber: t.customer.clientNumber,
      serviceName: t.service.name,
      assigneeName: t.assignee
        ? `${t.assignee.user.firstName} ${t.assignee.user.lastName || ''}`.trim()
        : null,
      lastMessage: t.messages[0]?.text ?? null,
      lastMessageAt: t.messages[0]?.createdAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private formatDetail(t: any) {
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      priority: t.priority,
      title: t.title,
      summary: t.summary,
      tags: t.tags,
      firstResponseAt: t.firstResponseAt?.toISOString() ?? null,
      resolvedAt: t.resolvedAt?.toISOString() ?? null,
      closedAt: t.closedAt?.toISOString() ?? null,
      slaDeadline: t.slaDeadline?.toISOString() ?? null,
      rating: t.rating,
      ratingComment: t.ratingComment,
      version: t.version,
      service: t.service,
      customer: {
        id: t.customer.id,
        clientNumber: t.customer.clientNumber,
        userId: t.customer.user.id,
        firstName: t.customer.user.firstName,
        lastName: t.customer.user.lastName,
        username: t.customer.user.username,
        photoUrl: t.customer.user.photoUrl,
      },
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            userId: t.assignee.user.id,
            firstName: t.assignee.user.firstName,
            lastName: t.assignee.user.lastName,
          }
        : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
