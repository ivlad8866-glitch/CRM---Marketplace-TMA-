import { Module } from '@nestjs/common';
import { ServicesController } from './controller/services.controller';
import { ServicesService } from './service/services.service';
import { ServicesRepository } from './repository/services.repository';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
