import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { CustomFieldsService } from '../service/custom-fields.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCustomFieldSchema, updateCustomFieldSchema } from '../dto/custom-field.dto';

@Controller('workspaces/:wid/custom-fields')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class CustomFieldsController {
  constructor(private readonly fields: CustomFieldsService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
  list(@Param('wid') wid: string) {
    return this.fields.list(wid);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createCustomFieldSchema)) dto: any,
  ) {
    return this.fields.create(wid, dto);
  }

  @Patch(':fid')
  @Roles('ADMIN')
  update(
    @Param('wid') wid: string,
    @Param('fid') fid: string,
    @Body(new ZodValidationPipe(updateCustomFieldSchema)) dto: any,
  ) {
    return this.fields.update(wid, fid, dto);
  }

  @Delete(':fid')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('wid') wid: string, @Param('fid') fid: string) {
    await this.fields.remove(wid, fid);
  }
}
