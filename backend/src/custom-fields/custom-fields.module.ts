import { Module } from '@nestjs/common';
import { CustomFieldsController } from './controller/custom-fields.controller';
import { CustomFieldsService } from './service/custom-fields.service';
import { CustomFieldsRepository } from './repository/custom-fields.repository';

@Module({
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService, CustomFieldsRepository],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
