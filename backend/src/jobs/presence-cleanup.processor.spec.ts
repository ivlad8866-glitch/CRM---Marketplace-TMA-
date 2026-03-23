import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { PresenceCleanupProcessor } from './presence-cleanup.processor';
import { RedisService } from '../infrastructure/redis/redis.service';
import { GatewayEmitterService } from '../gateway/gateway-emitter.service';

describe('PresenceCleanupProcessor', () => {
  let processor: PresenceCleanupProcessor;
  let redis: jest.Mocked<Pick<RedisService, 'scanStream' | 'smembers' | 'exists' | 'srem'>>;
  let emitter: jest.Mocked<Pick<GatewayEmitterService, 'emitToWorkspace'>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PresenceCleanupProcessor,
        {
          provide: RedisService,
          useValue: {
            scanStream: jest.fn(),
            smembers: jest.fn(),
            exists: jest.fn(),
            srem: jest.fn(),
          },
        },
        {
          provide: GatewayEmitterService,
          useValue: {
            emitToWorkspace: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get(PresenceCleanupProcessor);
    redis = module.get(RedisService) as any;
    emitter = module.get(GatewayEmitterService) as any;
  });

  it('removes stale members and broadcasts offline via GatewayEmitterService.emitToWorkspace', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield ['ws:members:w1', 'ws:members:w2'];
      },
    };
    (redis.scanStream as jest.Mock).mockReturnValue(mockStream);
    (redis.smembers as jest.Mock)
      .mockResolvedValueOnce(['user1', 'user2']) // w1 members
      .mockResolvedValueOnce(['user3']);          // w2 members
    // user1 is online (exists=1), user2 and user3 are stale (exists=0)
    (redis.exists as jest.Mock)
      .mockResolvedValueOnce(1)  // online:user1 → online
      .mockResolvedValueOnce(0)  // online:user2 → stale
      .mockResolvedValueOnce(0); // online:user3 → stale
    (redis.srem as jest.Mock).mockResolvedValue(1);

    await processor.process({} as any);

    expect(redis.srem).toHaveBeenCalledTimes(2);
    expect(redis.srem).toHaveBeenCalledWith('ws:members:w1', 'user2');
    expect(redis.srem).toHaveBeenCalledWith('ws:members:w2', 'user3');

    expect(emitter.emitToWorkspace).toHaveBeenCalledTimes(2);
    expect(emitter.emitToWorkspace).toHaveBeenCalledWith('w1', 'presence:update', {
      userId: 'user2',
      status: 'offline',
    });
    expect(emitter.emitToWorkspace).toHaveBeenCalledWith('w2', 'presence:update', {
      userId: 'user3',
      status: 'offline',
    });
  });

  it('does nothing when no workspace sets exist', async () => {
    const emptyStream = {
      [Symbol.asyncIterator]: async function* () {
        // yields nothing
      },
    };
    (redis.scanStream as jest.Mock).mockReturnValue(emptyStream);

    await processor.process({} as any);

    expect(redis.smembers).not.toHaveBeenCalled();
    expect(redis.srem).not.toHaveBeenCalled();
    expect(emitter.emitToWorkspace).not.toHaveBeenCalled();
  });
});
