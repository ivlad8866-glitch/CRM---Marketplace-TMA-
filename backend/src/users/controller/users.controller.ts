import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from '../service/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateUserSchema } from '../dto/update-user.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: CurrentUserData) {
    return this.users.getMe(user.userId);
  }

  @Patch()
  updateMe(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: any,
  ) {
    return this.users.updateMe(user.userId, dto);
  }
}
