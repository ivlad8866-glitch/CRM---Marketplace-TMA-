import { Injectable } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis/redis.service';
import { LIMITS } from '@crm/shared';

@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  async setOnline(userId: string, socketId: string, workspaceId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(`online:${userId}`, socketId, 'EX', LIMITS.PRESENCE_TTL_SECONDS);
    pipeline.sadd(`ws:members:${workspaceId}`, userId);
    await pipeline.exec();
  }

  async setOffline(userId: string, workspaceId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`online:${userId}`);
    pipeline.srem(`ws:members:${workspaceId}`, userId);
    await pipeline.exec();
  }

  async refreshHeartbeat(userId: string): Promise<void> {
    await this.redis.expire(`online:${userId}`, LIMITS.PRESENCE_TTL_SECONDS);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.exists(`online:${userId}`)) === 1;
  }

  async getOnlineMembers(workspaceId: string): Promise<string[]> {
    return this.redis.smembers(`ws:members:${workspaceId}`);
  }
}
