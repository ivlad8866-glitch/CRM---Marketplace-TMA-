import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { ChatGateway } from './chat.gateway';
import { PresenceService } from './presence.service';
import { GatewayEmitterService } from './gateway-emitter.service';

@Module({
  imports: [AuthModule, MessagesModule],
  providers: [ChatGateway, PresenceService, GatewayEmitterService],
  exports: [GatewayEmitterService, PresenceService],
})
export class GatewayModule {}
