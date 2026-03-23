import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            role: true,
            status: true,
            workspaceId: true,
            joinedAt: true,
            workspace: { select: { name: true } },
          },
        },
      },
    });
  }

  async update(id: string, data: { firstName?: string; lastName?: string | null; languageCode?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
