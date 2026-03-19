import { Module } from '@nestjs/common';
import { TicketsController } from './controller/tickets.controller';
import { TicketsService } from './service/tickets.service';
import { TicketsRepository } from './repository/tickets.repository';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService, TicketsRepository],
})
export class TicketsModule {}
