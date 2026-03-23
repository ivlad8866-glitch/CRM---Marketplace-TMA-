import { Module } from '@nestjs/common';
import { TeamController } from './controller/team.controller';
import { TeamService } from './service/team.service';
import { TeamRepository } from './repository/team.repository';

@Module({
  controllers: [TeamController],
  providers: [TeamService, TeamRepository],
  exports: [TeamService],
})
export class TeamModule {}
