import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { AttachmentsService } from '../service/attachments.service';
import { requestUploadSchema, RequestUploadDto } from '../dto/attachment.dto';

@Controller('workspaces/:wid/tickets/:tid/attachments')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('upload-url')
  async requestUpload(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(requestUploadSchema)) dto: RequestUploadDto,
  ) {
    return this.attachments.requestUpload(wid, tid, user.userId, user.role, dto);
  }

  @Get(':aid/download-url')
  async getDownloadUrl(
    @Param('wid') wid: string,
    @Param('aid') aid: string,
  ) {
    const url = await this.attachments.getDownloadUrl(aid, wid);
    return { downloadUrl: url };
  }

  @Delete(':aid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('wid') wid: string,
    @Param('aid') aid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.attachments.deleteAttachment(aid, wid, user.userId, user.role);
  }
}
