import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { TeamController } from './team.controller';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';

@Module({
  imports: [ChatModule],
  controllers: [TeamController],
  providers: [TeamService, TeamRepository],
  exports: [TeamService, TeamRepository],
})
export class TeamModule {}
