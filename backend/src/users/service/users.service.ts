import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      languageCode: user.languageCode,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt.toISOString(),
      memberships: user.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        joinedAt: m.joinedAt?.toISOString() ?? null,
      })),
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    await this.repo.update(userId, dto);
    return this.getMe(userId);
  }
}
