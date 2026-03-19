import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { MessagesService } from '../messages/service/messages.service';
import { PresenceService } from './presence.service';

interface SocketUser {
  userId: string;
  role: string;
  workspaceId: string;
  firstName: string;
}

@WebSocketGateway({
  cors: { origin: process.env.WS_CORS_ORIGIN || '*' },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly jwtSecrets: string[];

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
    private readonly presence: PresenceService,
  ) {
    const current = this.config.getOrThrow<string>('JWT_SECRET');
    const previous = this.config.get<string>('JWT_SECRET_PREVIOUS');
    this.jwtSecrets = previous ? [current, previous] : [current];
  }

  // ─── Connection lifecycle ──────────────────────────────────────

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        socket.disconnect(true);
        return;
      }

      let payload: any;
      for (const secret of this.jwtSecrets) {
        try {
          payload = this.jwtService.verify(token, { secret });
          break;
        } catch {
          continue;
        }
      }

      if (!payload) {
        socket.disconnect(true);
        return;
      }

      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { firstName: true },
      });

      if (!dbUser) {
        socket.disconnect(true);
        return;
      }

      const user: SocketUser = {
        userId: payload.sub,
        role: payload.role,
        workspaceId: payload.wid,
        firstName: dbUser.firstName,
      };
      socket.data.user = user;

      // Join personal + workspace rooms
      socket.join(`user:${user.userId}`);
      if (user.workspaceId) {
        socket.join(`workspace:${user.workspaceId}`);
      }

      // Set presence + broadcast
      if (user.workspaceId) {
        await this.presence.setOnline(user.userId, socket.id, user.workspaceId);
        this.server.to(`workspace:${user.workspaceId}`).emit('presence:update', {
          userId: user.userId,
          status: 'online' as const,
        });
      }
    } catch (err) {
      this.logger.error('WS connection error', err);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    try {
      const user: SocketUser | undefined = socket.data?.user;
      if (!user) return;

      if (user.workspaceId) {
        await this.presence.setOffline(user.userId, user.workspaceId);
        this.server.to(`workspace:${user.workspaceId}`).emit('presence:update', {
          userId: user.userId,
          status: 'offline' as const,
        });
      }
    } catch (err) {
      this.logger.error('WS disconnect cleanup error', err);
    }
  }

  // ─── Room management ──────────────────────────────────────────

  @SubscribeMessage('join_ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string },
  ) {
    const user: SocketUser = client.data.user;
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };
    if (!payload?.ticketId || typeof payload.ticketId !== 'string') {
      return { ok: false, error: 'INVALID_PAYLOAD' };
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: payload.ticketId, isDeleted: false },
      include: { customer: { select: { userId: true } } },
    });

    if (!ticket) return { ok: false, error: 'TICKET_NOT_FOUND' };
    if (ticket.workspaceId !== user.workspaceId) return { ok: false, error: 'FORBIDDEN' };
    if (user.role === 'CUSTOMER' && ticket.customer.userId !== user.userId) {
      return { ok: false, error: 'FORBIDDEN' };
    }

    client.join(`ticket:${payload.ticketId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string },
  ) {
    client.leave(`ticket:${payload.ticketId}`);
  }

  // ─── Heartbeat ────────────────────────────────────────────────

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const user: SocketUser | undefined = client.data?.user;
    if (user) await this.presence.refreshHeartbeat(user.userId);
  }

  // ─── Messaging ────────────────────────────────────────────────

  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; text: string; type: 'TEXT' | 'NOTE'; tempId: string },
  ) {
    const user: SocketUser = client.data.user;
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };
    if (!payload?.ticketId || !payload?.text || typeof payload.text !== 'string') {
      return { ok: false, error: 'INVALID_PAYLOAD' };
    }

    if (!client.rooms.has(`ticket:${payload.ticketId}`)) {
      return { ok: false, error: 'NOT_IN_ROOM' };
    }

    try {
      const message = await this.messagesService.send(
        payload.ticketId,
        user.workspaceId,
        { text: payload.text, type: payload.type },
        user.userId,
        user.role,
      );

      // Broadcast to room (excluding sender)
      client.to(`ticket:${payload.ticketId}`).emit('message:new', message);

      return { ok: true, message };
    } catch (err: any) {
      this.logger.error(`message:send error: ${err.message}`);
      return { ok: false, error: err.response?.message ?? 'INTERNAL_ERROR' };
    }
  }

  // ─── Typing ───────────────────────────────────────────────────

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string },
  ) {
    const user: SocketUser = client.data?.user;
    if (!user || !client.rooms.has(`ticket:${payload.ticketId}`)) return;

    client.to(`ticket:${payload.ticketId}`).emit('typing:update', {
      ticketId: payload.ticketId,
      userId: user.userId,
      userName: user.firstName,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string },
  ) {
    const user: SocketUser = client.data?.user;
    if (!user || !client.rooms.has(`ticket:${payload.ticketId}`)) return;

    client.to(`ticket:${payload.ticketId}`).emit('typing:update', {
      ticketId: payload.ticketId,
      userId: user.userId,
      userName: user.firstName,
      isTyping: false,
    });
  }

  // ─── Read receipts ────────────────────────────────────────────

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; messageId: string },
  ) {
    const user: SocketUser = client.data?.user;
    if (!user) return;
    if (!client.rooms.has(`ticket:${payload.ticketId}`)) return;

    const now = new Date();
    await this.prisma.message.updateMany({
      where: { id: payload.messageId, ticketId: payload.ticketId, workspaceId: user.workspaceId, readAt: null },
      data: { readAt: now },
    });

    client.to(`ticket:${payload.ticketId}`).emit('receipt:read', {
      ticketId: payload.ticketId,
      messageId: payload.messageId,
      readAt: now.toISOString(),
      readByUserId: user.userId,
    });
  }

  // ─── Reactions ────────────────────────────────────────────────

  @SubscribeMessage('reaction:toggle')
  async handleReactionToggle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; emoji: string },
  ) {
    const user: SocketUser = client.data?.user;
    if (!user) return;

    const message = await this.prisma.message.findFirst({
      where: { id: payload.messageId, workspaceId: user.workspaceId },
      select: { ticketId: true },
    });
    if (!message) return;
    if (!client.rooms.has(`ticket:${message.ticketId}`)) return;

    // Toggle: delete if exists, create if not
    const existing = await this.prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: payload.messageId,
          userId: user.userId,
          emoji: payload.emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reaction.create({
        data: { messageId: payload.messageId, userId: user.userId, emoji: payload.emoji },
      });
    }

    // Re-fetch and aggregate reactions, broadcast to whole room
    const reactions = await this.prisma.reaction.findMany({
      where: { messageId: payload.messageId },
      select: { emoji: true, userId: true },
    });

    const map = new Map<string, string[]>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) map.set(r.emoji, []);
      map.get(r.emoji)!.push(r.userId);
    }
    const aggregated = Array.from(map.entries()).map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      userIds,
    }));

    // TODO: Add 'reaction:updated' to ServerToClientEvents in @crm/shared
    this.server.to(`ticket:${message.ticketId}`).emit('reaction:updated' as any, {
      messageId: payload.messageId,
      ticketId: message.ticketId,
      reactions: aggregated,
    });
  }
}
