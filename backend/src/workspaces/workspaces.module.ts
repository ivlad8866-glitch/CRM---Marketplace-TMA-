import { Module } from '@nestjs/common';
import { WorkspacesController } from './controller/workspaces.controller';
import { WorkspacesService } from './service/workspaces.service';
import { WorkspacesRepository } from './repository/workspaces.repository';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService, WorkspacesRepository],
})
export class WorkspacesModule {}
