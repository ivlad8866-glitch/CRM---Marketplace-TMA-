import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomersRepository } from '../repository/customers.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}

  async list(workspaceId: string, filters: any) {
    const { data, total } = await this.repo.findByWorkspace(workspaceId, filters);

    return {
      data: data.map((c) => ({
        id: c.id,
        clientNumber: c.clientNumber,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        username: c.user.username,
        photoUrl: c.user.photoUrl,
        segment: c.segment,
        isBanned: c.isBanned,
        ticketCount: c._count.tickets,
        createdAt: c.createdAt.toISOString(),
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getById(workspaceId: string, customerId: string) {
    const customer = await this.repo.findById(customerId, workspaceId);
    if (!customer) throw new NotFoundException('NOT_FOUND');

    return {
      id: customer.id,
      clientNumber: customer.clientNumber,
      userId: customer.user.id,
      telegramId: customer.user.telegramId.toString(),
      firstName: customer.user.firstName,
      lastName: customer.user.lastName,
      username: customer.user.username,
      photoUrl: customer.user.photoUrl,
      segment: customer.segment,
      notes: customer.notes,
      isBanned: customer.isBanned,
      banReason: customer.banReason,
      customFields: customer.customFields,
      version: customer.version,
      tickets: customer.tickets.map((t) => ({
        id: t.id, ticketNumber: t.ticketNumber,
        status: t.status, priority: t.priority,
        createdAt: t.createdAt.toISOString(),
      })),
      createdAt: customer.createdAt.toISOString(),
    };
  }

  async update(workspaceId: string, customerId: string, dto: any, version?: number) {
    const customer = await this.repo.findById(customerId, workspaceId);
    if (!customer) throw new NotFoundException('NOT_FOUND');

    try {
      const updated = await this.repo.update(customerId, dto, version);
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }
}
