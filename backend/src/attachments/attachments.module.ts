import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewayModule } from '../gateway/gateway.module';
import { AttachmentsRepository } from './repository/attachments.repository';
import { AttachmentsService } from './service/attachments.service';
import { AttachmentsController } from './controller/attachments.controller';
import { AttachmentScanConsumer } from './consumer/attachment-scan.consumer';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'attachment-scan' }),
    GatewayModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsRepository, AttachmentsService, AttachmentScanConsumer],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
