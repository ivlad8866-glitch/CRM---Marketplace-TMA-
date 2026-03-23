import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string, filters: {
    search?: string; isBanned?: boolean; page: number; limit: number;
  }) {
    const where: any = { workspaceId, isDeleted: false };
    if (filters.isBanned !== undefined) where.isBanned = filters.isBanned;
    if (filters.search) {
      where.OR = [
        { clientNumber: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { username: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true } },
          _count: { select: { tickets: true } },
        },
      }),
      this.prisma.customerProfile.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.customerProfile.findFirst({
      where: { id, workspaceId, isDeleted: false },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true, telegramId: true } },
        tickets: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, ticketNumber: true, status: true, priority: true, createdAt: true },
        },
      },
    });
  }

  async update(id: string, data: any, version?: number) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.customerProfile.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }
}
