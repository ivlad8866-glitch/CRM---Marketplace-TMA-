import { Controller, Get, Patch, Param, Query, Body, Headers, UseGuards } from '@nestjs/common';
import { CustomersService } from '../service/customers.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { customerListQuerySchema, updateCustomerSchema } from '../dto/customer.dto';

@Controller('workspaces/:wid/customers')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
@Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(customerListQuerySchema)) query: any,
  ) {
    return this.customers.list(wid, query);
  }

  @Get(':cid')
  getById(@Param('wid') wid: string, @Param('cid') cid: string) {
    return this.customers.getById(wid, cid);
  }

  @Patch(':cid')
  update(
    @Param('wid') wid: string,
    @Param('cid') cid: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.customers.update(wid, cid, dto, version);
  }
}
