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
    // Simulate having two secrets (current + previous)
    (gateway as any).jwtSecrets = ['current-secret', 'previous-secret'];
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
