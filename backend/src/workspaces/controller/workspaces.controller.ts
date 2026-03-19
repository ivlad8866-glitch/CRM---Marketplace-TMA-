import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { WorkspacesService } from '../service/workspaces.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWorkspaceSchema } from '../dto/create-workspace.dto';
import { updateWorkspaceSchema } from '../dto/update-workspace.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) dto: any,
  ) {
    return this.workspaces.create(dto, user.userId);
  }

  @Get(':wid')
  @UseGuards(WorkspaceScopeGuard)
  getById(@Param('wid') wid: string, @CurrentUser() user: CurrentUserData) {
    return this.workspaces.getById(wid, user.userId);
  }

  @Patch(':wid')
  @UseGuards(WorkspaceScopeGuard, RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  update(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) dto: any,
  ) {
    return this.workspaces.update(wid, dto);
  }
}
