import { Module } from '@nestjs/common';
import { ReportsService } from './service/reports.service';
import { ReportsController } from './controller/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
