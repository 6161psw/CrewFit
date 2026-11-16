import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { TeamModule } from '../team/team.module';
import { InvitationController } from './invitation.controller';
import { InvitationRepository } from './invitation.repository';
import { InvitationService } from './invitation.service';

@Module({
  imports: [TeamModule, ChatModule],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
