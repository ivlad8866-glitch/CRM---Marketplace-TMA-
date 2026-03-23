import { Module } from '@nestjs/common';
import { MacrosController } from './controller/macros.controller';
import { MacrosService } from './service/macros.service';
import { MacrosRepository } from './repository/macros.repository';

@Module({
  controllers: [MacrosController],
  providers: [MacrosService, MacrosRepository],
  exports: [MacrosService],
})
export class MacrosModule {}
