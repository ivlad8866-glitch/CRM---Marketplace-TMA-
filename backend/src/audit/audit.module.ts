import { Module } from '@nestjs/common';
import { AuditController } from './controller/audit.controller';
import { AuditService } from './service/audit.service';
import { AuditRepository } from './repository/audit.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
