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
