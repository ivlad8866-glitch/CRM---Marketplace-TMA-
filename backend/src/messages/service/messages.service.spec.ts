import { Test } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { MessagesRepository } from '../repository/messages.repository';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

describe('MessagesService', () => {
  let service: MessagesService;
  let repo: jest.Mocked<MessagesRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: MessagesRepository,
          useValue: {
            findByTicket: jest.fn(), createWithSeq: jest.fn(),
            findById: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(MessagesService);
    repo = module.get(MessagesRepository);
  });

  it('send rejects NOTE from CUSTOMER', async () => {
    await expect(
      service.send('t1', 'w1', { text: 'hi', type: 'NOTE' }, 'u1', 'CUSTOMER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('edit rejects after 5-minute window', async () => {
    repo.findById.mockResolvedValue({
      id: 'm1', authorUserId: 'u1', version: 1,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    } as any);
    await expect(service.edit('w1', 'm1', 'new text', 'u1', 1)).rejects.toThrow(UnprocessableEntityException);
  });

  it('edit rejects non-author', async () => {
    repo.findById.mockResolvedValue({
      id: 'm1', authorUserId: 'u1', version: 1,
      createdAt: new Date(),
    } as any);
    await expect(service.edit('w1', 'm1', 'new text', 'other-user', 1)).rejects.toThrow(ForbiddenException);
  });

  it('delete allows ADMIN to delete any message', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', authorUserId: 'u2' } as any);
    repo.softDelete.mockResolvedValue({} as any);
    await service.delete('w1', 'm1', 'admin-user', 'ADMIN');
    expect(repo.softDelete).toHaveBeenCalledWith('m1');
  });

  it('delete rejects non-author non-admin', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', authorUserId: 'u2' } as any);
    await expect(service.delete('w1', 'm1', 'u3', 'AGENT')).rejects.toThrow(ForbiddenException);
  });
});
