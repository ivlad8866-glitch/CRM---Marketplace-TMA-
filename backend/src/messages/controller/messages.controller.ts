import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { MessagesService } from '../service/messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { cursorPaginationSchema, sendMessageSchema } from '@crm/shared';

@Controller('workspaces/:wid/tickets/:tid/messages')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @Query(new ZodValidationPipe(cursorPaginationSchema)) query: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.messages.list(wid, tid, query, user.role, user.userId);
  }

  @Post()
  send(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.messages.send(tid, wid, dto, user.userId, user.role);
  }

  @Patch(':mid')
  edit(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @Body() body: { text: string },
    @Headers('if-match') ifMatch?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.messages.edit(wid, mid, body.text, user!.userId, version);
  }

  @Delete(':mid')
  @HttpCode(204)
  async remove(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.messages.delete(wid, mid, user.userId, user.role);
  }
}
