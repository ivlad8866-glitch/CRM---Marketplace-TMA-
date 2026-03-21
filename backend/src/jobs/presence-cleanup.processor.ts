import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisService } from '../infrastructure/redis/redis.service';
import { GatewayEmitterService } from '../gateway/gateway-emitter.service';

@Processor('presence-cleanup')
export class PresenceCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(PresenceCleanupProcessor.name);

  constructor(
    private readonly redis: RedisService,
    private readonly emitter: GatewayEmitterService,
  ) {
    super();
  }

  async process(_job: Job) {
    const stream = this.redis.scanStream({ match: 'ws:members:*', count: 100 });

    for await (const keys of stream) {
      for (const key of keys as string[]) {
        const workspaceId = key.replace('ws:members:', '');
        const members = await this.redis.smembers(key);

        for (const userId of members) {
          const isOnline = await this.redis.exists(`online:${userId}`);
          if (!isOnline) {
            await this.redis.srem(key, userId);
            this.logger.debug(`Removed stale presence: user=${userId} workspace=${workspaceId}`);

            this.emitter.emitToWorkspace(workspaceId, 'presence:update', {
              userId,
              status: 'offline',
            });
          }
        }
      }
    }
  }
}
