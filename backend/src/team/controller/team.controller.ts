import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { TeamService } from '../service/team.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { inviteTeamMemberSchema } from '@crm/shared';
import { z } from 'zod';

const updateTeamMemberSchema = z.object({
  role: z.enum(['WORKSPACE_OWNER', 'ADMIN', 'AGENT']).optional(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']).optional(),
});

@Controller('workspaces/:wid/team')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  list(@Param('wid') wid: string) {
    return this.team.list(wid);
  }

  @Post('invite')
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  invite(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(inviteTeamMemberSchema)) dto: any,
  ) {
    return this.team.invite(wid, dto.telegramId, dto.role);
  }

  @Patch(':mid')
  @Roles('WORKSPACE_OWNER')
  updateMember(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) dto: any,
  ) {
    return this.team.updateMember(wid, mid, dto);
  }

  @Delete(':mid')
  @Roles('WORKSPACE_OWNER')
  @HttpCode(204)
  async remove(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.team.remove(wid, mid, user.userId);
  }
}
