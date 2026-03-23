import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class GatewayEmitterService {
  constructor(private readonly gateway: ChatGateway) {}

  emitToTicket(ticketId: string, event: string, payload: any): void {
    this.gateway.server?.to(`ticket:${ticketId}`).emit(event, payload);
  }

  emitToWorkspace(workspaceId: string, event: string, payload: any): void {
    this.gateway.server?.to(`workspace:${workspaceId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: any): void {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
  }
}
