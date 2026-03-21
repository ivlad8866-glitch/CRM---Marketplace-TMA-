import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GatewayModule } from '../gateway/gateway.module';
import { PresenceCleanupProcessor } from './presence-cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'presence-cleanup' }),
    GatewayModule,
  ],
  providers: [PresenceCleanupProcessor],
})
export class JobsModule implements OnModuleInit {
  constructor(
    @InjectQueue('presence-cleanup') private readonly cleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    const existing = await this.cleanupQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.cleanupQueue.removeRepeatableByKey(job.key);
    }

    await this.cleanupQueue.add('sweep', {}, {
      repeat: { every: 60_000 },
    });
  }
}
