import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(
    workspaceId: string,
    filters: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      serviceId?: string;
      search?: string;
      customerId?: string;
      page: number;
      limit: number;
    },
  ) {
    const where: any = { workspaceId, isDeleted: false };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          customer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          service: { select: { name: true } },
          assignee: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { text: true, createdAt: true },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total };
  }

  async getCounters(workspaceId: string) {
    const [newCount, inProgress, waiting, slaOverdue] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, status: 'NEW', isDeleted: false } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'IN_PROGRESS', isDeleted: false } }),
      this.prisma.ticket.count({
        where: { workspaceId, status: 'WAITING_CUSTOMER', isDeleted: false },
      }),
      this.prisma.ticket.count({
        where: {
          workspaceId,
          isDeleted: false,
          slaDeadline: { lt: new Date() },
          status: { in: ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
        },
      }),
    ]);
    return { new: newCount, inProgress, waitingCustomer: waiting, slaOverdue };
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.ticket.findFirst({
      where: { id, workspaceId, isDeleted: false },
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                photoUrl: true,
              },
            },
          },
        },
        service: { select: { id: true, name: true } },
        assignee: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
  }

  async update(id: string, data: any, version?: number) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.ticket.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }

  async rate(id: string, rating: number, comment?: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: { rating, ratingComment: comment, status: 'CLOSED', closedAt: new Date() },
    });
  }
}
