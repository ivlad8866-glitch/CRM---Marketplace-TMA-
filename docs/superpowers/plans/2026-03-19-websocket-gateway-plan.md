# WebSocket Gateway (Chunk 4) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time WebSocket gateway using Socket.IO that handles chat messaging, typing indicators, read receipts, reactions, and presence tracking — matching the `ClientToServerEvents`/`ServerToClientEvents` contracts from `@crm/shared`.

**Architecture:** Single NestJS `@WebSocketGateway()` handles all Socket.IO events. JWT auth in `handleConnection` with secret rotation. Redis stores presence state (online/offline with heartbeat TTL). `GatewayEmitterService` lets HTTP controllers push events to WS rooms. Room scheme: `ticket:{id}` for conversations, `workspace:{id}` for broadcast, `user:{id}` for personal events.

**Tech Stack:** NestJS 10, Socket.IO 4, @nestjs/websockets, @nestjs/platform-socket.io, ioredis, @nestjs/jwt, Jest 29

**Out of scope:** Redis adapter for horizontal scaling (add when deploying multiple instances), attachment:ready events (Chunk 5), notification routing logic.

---

## File Structure

```
backend/src/gateway/
  gateway.module.ts           — Module registration
  chat.gateway.ts             — Main Socket.IO gateway with all handlers
  chat.gateway.spec.ts        — Unit tests
  presence.service.ts         — Redis presence tracking
  presence.service.spec.ts    — Unit tests
  gateway-emitter.service.ts  — HTTP → WS event broadcasting
```

**Modified files:**
- `backend/src/app.module.ts` — Import GatewayModule

---

## Conventions

**Room naming:**
- `ticket:{ticketId}` — ticket conversation participants
- `workspace:{workspaceId}` — all connected staff (for ticket:updated, ticket:assigned, presence)
- `user:{userId}` — personal room for targeted events (supports multi-tab)

**Socket user data:** `socket.data.user = { userId, role, workspaceId, firstName }`

**Redis presence keys:**
- `online:{userId}` — value: socketId, TTL: 30s (PRESENCE_TTL_SECONDS from `@crm/shared`)
- `ws:members:{workspaceId}` — Redis SET of online user IDs. **Known trade-off:** if a server crashes without calling `handleDisconnect`, the SET entry becomes stale while the TTL key expires naturally. `handleDisconnect` covers clean disconnects; crash recovery is deferred to Chunk 5 (periodic cleanup job).

**Error handling:**
- Connection errors → `socket.disconnect(true)`
- Event handler errors → ack `{ ok: false, error: 'CODE' }`
- `handleDisconnect` wrapped in try/catch to prevent Redis errors from crashing the process

**Access control for ticket events:** User must join room via `join_ticket` (which performs DB access check). **ALL** subsequent event handlers (`message:send`, `typing:*`, `message:read`, `reaction:toggle`) check `socket.rooms.has('ticket:...')` before proceeding.

**Input validation:** All `@SubscribeMessage` handlers validate that required payload fields are present and of correct type before processing. Invalid payloads return early or ack with error.

**Commit after each task.**

---

### Task 1: Presence Service (TDD)

**Files:**
- Create: `backend/src/gateway/presence.service.spec.ts`
- Create: `backend/src/gateway/presence.service.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/gateway/presence.service.spec.ts
import { Test } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { RedisService } from '../infrastructure/redis/redis.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let redis: any;

  const mockPipeline = {
    set: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    srem: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    // Reset mocks
    Object.values(mockPipeline).forEach((fn) => (fn as jest.Mock).mockClear());
    mockPipeline.set.mockReturnThis();
    mockPipeline.sadd.mockReturnThis();
    mockPipeline.del.mockReturnThis();
    mockPipeline.srem.mockReturnThis();

    const module = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: RedisService,
          useValue: {
            pipeline: jest.fn().mockReturnValue(mockPipeline),
            expire: jest.fn().mockResolvedValue(1),
            exists: jest.fn().mockResolvedValue(1),
            smembers: jest.fn().mockResolvedValue(['u1', 'u2']),
          },
        },
      ],
    }).compile();
    service = module.get(PresenceService);
    redis = module.get(RedisService);
  });

  it('setOnline stores user with TTL and adds to workspace set', async () => {
    await service.setOnline('u1', 'sock1', 'w1');
    expect(mockPipeline.set).toHaveBeenCalledWith('online:u1', 'sock1', 'EX', 30);
    expect(mockPipeline.sadd).toHaveBeenCalledWith('ws:members:w1', 'u1');
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('setOffline removes user and cleans workspace set', async () => {
    await service.setOffline('u1', 'w1');
    expect(mockPipeline.del).toHaveBeenCalledWith('online:u1');
    expect(mockPipeline.srem).toHaveBeenCalledWith('ws:members:w1', 'u1');
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('refreshHeartbeat extends TTL', async () => {
    await service.refreshHeartbeat('u1');
    expect(redis.expire).toHaveBeenCalledWith('online:u1', 30);
  });

  it('isOnline returns true for existing user', async () => {
    expect(await service.isOnline('u1')).toBe(true);
  });

  it('getOnlineMembers returns workspace member IDs', async () => {
    expect(await service.getOnlineMembers('w1')).toEqual(['u1', 'u2']);
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `cd backend && npx jest presence.service.spec --no-coverage`
Expected: FAIL — cannot find `./presence.service`

- [ ] **Step 3: Write implementation**

```typescript
// backend/src/gateway/presence.service.ts
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
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd backend && npx jest presence.service.spec --no-coverage`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/gateway/presence.service.ts backend/src/gateway/presence.service.spec.ts
git commit -m "feat: add presence service with Redis TTL tracking"
```

---

### Task 2: Chat Gateway — Core + Tests (TDD)

**Files:**
- Create: `backend/src/gateway/chat.gateway.spec.ts`
- Create: `backend/src/gateway/chat.gateway.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/gateway/chat.gateway.spec.ts
import { Test } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { MessagesService } from '../messages/service/messages.service';
import { PresenceService } from './presence.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: jest.Mocked<JwtService>;
  let prisma: any;
  let messagesService: jest.Mocked<MessagesService>;
  let presence: jest.Mocked<PresenceService>;

  const mockUser = { userId: 'u1', role: 'AGENT', workspaceId: 'w1', firstName: 'Alice' };

  function createMockSocket(overrides: any = {}): any {
    return {
      id: 'sock-1',
      data: {},
      handshake: { auth: { token: 'valid-jwt' }, headers: {} },
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
      disconnect: jest.fn(),
      rooms: new Set(['sock-1']),
      ...overrides,
    };
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Alice' }) },
            ticket: { findFirst: jest.fn() },
            message: { updateMany: jest.fn(), findFirst: jest.fn() },
            reaction: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
          },
        },
        {
          provide: MessagesService,
          useValue: { send: jest.fn() },
        },
        {
          provide: PresenceService,
          useValue: {
            setOnline: jest.fn(),
            setOffline: jest.fn(),
            refreshHeartbeat: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get(ChatGateway);
    jwtService = module.get(JwtService);
    prisma = module.get(PrismaService);
    messagesService = module.get(MessagesService);
    presence = module.get(PresenceService);

    // Mock the WebSocket server
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  // --- Connection ---

  it('handleConnection authenticates valid JWT and sets user data', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', role: 'AGENT', wid: 'w1' });
    const socket = createMockSocket();

    await gateway.handleConnection(socket);

    expect(socket.data.user).toMatchObject({ userId: 'u1', role: 'AGENT', workspaceId: 'w1' });
    expect(socket.join).toHaveBeenCalledWith('user:u1');
    expect(socket.join).toHaveBeenCalledWith('workspace:w1');
    expect(presence.setOnline).toHaveBeenCalledWith('u1', 'sock-1', 'w1');
  });

  it('handleConnection disconnects on missing token', async () => {
    const socket = createMockSocket({ handshake: { auth: {}, headers: {} } });

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('handleConnection disconnects on invalid JWT', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
    const socket = createMockSocket();

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('handleConnection disconnects when user not found in DB', async () => {
    jwtService.verify.mockReturnValue({ sub: 'deleted-user', role: 'AGENT', wid: 'w1' });
    prisma.user.findUnique.mockResolvedValue(null);
    const socket = createMockSocket();

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('handleConnection supports JWT secret rotation (fallback to previous)', async () => {
    jwtService.verify
      .mockImplementationOnce(() => { throw new Error('wrong secret'); })
      .mockReturnValueOnce({ sub: 'u1', role: 'AGENT', wid: 'w1' });
    const socket = createMockSocket();

    await gateway.handleConnection(socket);

    expect(socket.data.user).toMatchObject({ userId: 'u1' });
    expect(jwtService.verify).toHaveBeenCalledTimes(2);
  });

  // --- Disconnect ---

  it('handleDisconnect cleans up presence', async () => {
    const socket = createMockSocket();
    socket.data.user = mockUser;

    await gateway.handleDisconnect(socket);

    expect(presence.setOffline).toHaveBeenCalledWith('u1', 'w1');
  });

  // --- Room management ---

  it('join_ticket allows agent in same workspace', async () => {
    prisma.ticket.findFirst.mockResolvedValue({
      id: 't1', workspaceId: 'w1',
      customer: { userId: 'customer-1' },
    });
    const socket = createMockSocket();
    socket.data.user = mockUser;

    const result = await gateway.handleJoinTicket(socket, { ticketId: 't1' });

    expect(result).toEqual({ ok: true });
    expect(socket.join).toHaveBeenCalledWith('ticket:t1');
  });

  it('join_ticket rejects CUSTOMER accessing another user ticket', async () => {
    prisma.ticket.findFirst.mockResolvedValue({
      id: 't1', workspaceId: 'w1',
      customer: { userId: 'other-customer' },
    });
    const socket = createMockSocket();
    socket.data.user = { ...mockUser, role: 'CUSTOMER' };

    const result = await gateway.handleJoinTicket(socket, { ticketId: 't1' });

    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('join_ticket rejects missing ticket', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    const socket = createMockSocket();
    socket.data.user = mockUser;

    const result = await gateway.handleJoinTicket(socket, { ticketId: 'bad' });

    expect(result).toEqual({ ok: false, error: 'TICKET_NOT_FOUND' });
  });

  // --- Message send ---

  it('message:send creates message and broadcasts to room', async () => {
    const mockMessage = { id: 'm1', text: 'hello', ticketId: 't1' };
    messagesService.send.mockResolvedValue(mockMessage as any);
    const mockEmit = jest.fn();
    const socket = createMockSocket();
    socket.data.user = mockUser;
    socket.rooms = new Set(['sock-1', 'ticket:t1']);
    socket.to.mockReturnValue({ emit: mockEmit });

    const result = await gateway.handleMessageSend(socket, {
      ticketId: 't1', text: 'hello', type: 'TEXT', tempId: 'temp-1',
    });

    expect(result).toEqual({ ok: true, message: mockMessage });
    expect(socket.to).toHaveBeenCalledWith('ticket:t1');
    expect(mockEmit).toHaveBeenCalledWith('message:new', mockMessage);
  });

  it('message:send rejects if user not in ticket room', async () => {
    const socket = createMockSocket();
    socket.data.user = mockUser;
    socket.rooms = new Set(['sock-1']); // NOT in ticket room

    const result = await gateway.handleMessageSend(socket, {
      ticketId: 't1', text: 'hello', type: 'TEXT', tempId: 'temp-1',
    });

    expect(result).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
  });

  // --- Heartbeat ---

  it('heartbeat refreshes presence TTL', async () => {
    const socket = createMockSocket();
    socket.data.user = mockUser;

    await gateway.handleHeartbeat(socket);

    expect(presence.refreshHeartbeat).toHaveBeenCalledWith('u1');
  });

  // --- message:read room check ---

  it('message:read skips if user not in ticket room', async () => {
    const socket = createMockSocket();
    socket.data.user = mockUser;
    socket.rooms = new Set(['sock-1']); // NOT in ticket room

    await gateway.handleMessageRead(socket, { ticketId: 't1', messageId: 'm1' });

    expect(prisma.message.updateMany).not.toHaveBeenCalled();
  });

  // --- reaction:toggle room check ---

  it('reaction:toggle skips if user not in ticket room', async () => {
    prisma.message.findFirst.mockResolvedValue({ ticketId: 't1' });
    const socket = createMockSocket();
    socket.data.user = mockUser;
    socket.rooms = new Set(['sock-1']); // NOT in ticket room

    await gateway.handleReactionToggle(socket, { messageId: 'm1', emoji: '👍' });

    expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
  });

  // --- typing:stop room check ---

  it('typing:stop skips if user not in ticket room', () => {
    const socket = createMockSocket();
    socket.data.user = mockUser;
    socket.rooms = new Set(['sock-1']); // NOT in ticket room

    gateway.handleTypingStop(socket, { ticketId: 't1' });

    expect(socket.to).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `cd backend && npx jest chat.gateway.spec --no-coverage`
Expected: FAIL — cannot find `./chat.gateway`

- [ ] **Step 3: Write Chat Gateway implementation**

```typescript
// backend/src/gateway/chat.gateway.ts
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

    // Note: 'reaction:updated' is not yet in ServerToClientEvents — update shared types when needed
    this.server.to(`ticket:${message.ticketId}`).emit('reaction:updated' as any, {
      messageId: payload.messageId,
      ticketId: message.ticketId,
      reactions: aggregated,
    });
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd backend && npx jest chat.gateway.spec --no-coverage`
Expected: 15 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/gateway/chat.gateway.ts backend/src/gateway/chat.gateway.spec.ts
git commit -m "feat: add chat gateway with auth, rooms, messaging, typing, reactions"
```

---

### Task 3: Gateway Emitter Service

**Files:**
- Create: `backend/src/gateway/gateway-emitter.service.ts`

- [ ] **Step 1: Create emitter service**

```typescript
// backend/src/gateway/gateway-emitter.service.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/gateway/gateway-emitter.service.ts
git commit -m "feat: add gateway emitter service for HTTP-to-WS broadcasting"
```

---

### Task 4: Gateway Module + AppModule Registration + Full Tests

**Files:**
- Create: `backend/src/gateway/gateway.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create GatewayModule**

```typescript
// backend/src/gateway/gateway.module.ts
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
```

- [ ] **Step 2: Register in AppModule**

Add import line:
```typescript
import { GatewayModule } from './gateway/gateway.module';
```

Add `GatewayModule` to the `imports` array.

- [ ] **Step 3: Run all tests**

Run: `cd backend && npx jest --no-coverage`
Expected: All tests PASS (45 existing + 5 presence + 15 gateway = ~65 tests)

- [ ] **Step 4: TypeScript typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/gateway/gateway.module.ts backend/src/app.module.ts
git commit -m "feat: integrate WebSocket gateway module into AppModule"
```

---
