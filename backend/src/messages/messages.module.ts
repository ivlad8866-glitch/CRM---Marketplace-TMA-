import { Module } from '@nestjs/common';
import { MessagesController } from './controller/messages.controller';
import { MessagesService } from './service/messages.service';
import { MessagesRepository } from './repository/messages.repository';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, MessagesRepository],
  exports: [MessagesService, MessagesRepository],
})
export class MessagesModule {}
