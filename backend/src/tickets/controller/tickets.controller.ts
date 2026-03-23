import { Controller, Get, Patch, Post, Param, Query, Body, Headers, UseGuards } from '@nestjs/common';
import { TicketsService } from '../service/tickets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ticketListQuerySchema, updateTicketSchema, createTicketSchema, rateTicketSchema } from '../dto/ticket.dto';

@Controller('workspaces/:wid/tickets')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createTicketSchema)) dto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tickets.create(wid, dto, user.userId);
  }

  @Get()
  list(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(ticketListQuerySchema)) query: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tickets.list(wid, query, user.role, user.userId);
  }

  @Get(':tid')
  getById(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tickets.getById(wid, tid, user.role, user.userId);
  }

  @Patch(':tid')
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
  update(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @Body(new ZodValidationPipe(updateTicketSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.tickets.update(wid, tid, dto, version);
  }

  @Post(':tid/rate')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  rate(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(rateTicketSchema)) dto: any,
  ) {
    return this.tickets.rate(wid, tid, user.userId, dto.rating, dto.comment);
  }
}
