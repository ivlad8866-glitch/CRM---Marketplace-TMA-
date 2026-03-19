import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from '../service/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { auditQuerySchema } from '../dto/audit-query.dto';

@Controller('workspaces/:wid/audit-logs')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  list(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(auditQuerySchema)) query: any,
  ) {
    return this.audit.list(wid, query);
  }
}
