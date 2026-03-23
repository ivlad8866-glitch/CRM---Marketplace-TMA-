import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { ServicesService } from '../service/services.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createServiceSchema } from '@crm/shared';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  slaMinutes: z.number().int().min(1).max(10080).optional(),
  routingMode: z.enum(['manual', 'round_robin']).optional(),
});

@Controller('workspaces/:wid/services')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list(@Param('wid') wid: string, @Query('includeInactive') includeInactive?: string) {
    return this.services.list(wid, includeInactive === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createServiceSchema)) dto: any,
  ) {
    return this.services.create(wid, dto);
  }

  @Patch(':sid')
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  update(
    @Param('wid') wid: string,
    @Param('sid') sid: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.services.update(wid, sid, dto, version);
  }

  @Delete(':sid')
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER')
  @HttpCode(204)
  async deactivate(@Param('wid') wid: string, @Param('sid') sid: string) {
    await this.services.deactivate(wid, sid);
  }
}
