import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportsService } from '../service/reports.service';
import { reportQuerySchema, ReportQueryDto } from '../dto/reports.dto';

@Controller('workspaces/:wid/reports')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
@Roles('WORKSPACE_OWNER', 'ADMIN')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * GET /workspaces/:wid/reports/kpi
   * Returns aggregated KPI metrics for the workspace within the given date range.
   * Query params: from (ISO datetime), to (ISO datetime), agentId?, serviceId?
   * Restricted to WORKSPACE_OWNER and ADMIN roles.
   */
  @Get('kpi')
  async getKpi(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQueryDto,
  ) {
    return this.reports.getKpiSummary(wid, query);
  }

  /**
   * GET /workspaces/:wid/reports/tickets/csv
   * Streams a CSV export of tickets within the given date range.
   * Query params: from (ISO datetime), to (ISO datetime), agentId?, serviceId?
   * Restricted to WORKSPACE_OWNER and ADMIN roles.
   * Max 10,000 rows per export.
   */
  @Get('tickets/csv')
  async exportCsv(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.reports.exportTicketsCsv(wid, query);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tickets-${query.from.slice(0, 10)}-${query.to.slice(0, 10)}.csv"`,
    });
    res.send(csv);
  }
}
