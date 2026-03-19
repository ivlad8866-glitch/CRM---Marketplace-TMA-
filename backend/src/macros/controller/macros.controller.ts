import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { MacrosService } from '../service/macros.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createMacroSchema } from '@crm/shared';
import { z } from 'zod';

const updateMacroSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

@Controller('workspaces/:wid/macros')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class MacrosController {
  constructor(private readonly macros: MacrosService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
  list(@Param('wid') wid: string) {
    return this.macros.list(wid);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createMacroSchema)) dto: any,
  ) {
    return this.macros.create(wid, dto);
  }

  @Patch(':mid')
  @Roles('ADMIN')
  update(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @Body(new ZodValidationPipe(updateMacroSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.macros.update(wid, mid, dto, version);
  }

  @Delete(':mid')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('wid') wid: string, @Param('mid') mid: string) {
    await this.macros.remove(wid, mid);
  }
}
