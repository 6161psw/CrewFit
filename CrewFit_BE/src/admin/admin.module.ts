import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { SubmissionModule } from '../submission/submission.module';
import { AdminAccessService } from './admin-access.service';
import { AdminAccountController, AdminInviteController } from './admin-account.controller';
import { AdminAccountService } from './admin-account.service';
import { AdminContestController } from './admin-contest.controller';
import { AdminContestService } from './admin-contest.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminForwardController } from './admin-forward.controller';
import { AdminForwardService } from './admin-forward.service';
import { AdminTeamController } from './admin-team.controller';
import { AdminTeamService } from './admin-team.service';
import { AdminRepository } from './admin.repository';

/** 학교 관리자 사이트 (크루핏 for School) */
@Module({
  imports: [SubmissionModule, ChatModule],
  controllers: [
    AdminDashboardController,
    AdminContestController,
    AdminTeamController,
    AdminForwardController,
    AdminAccountController,
    AdminInviteController,
  ],
  providers: [
    AdminRepository,
    AdminAccessService,
    AdminDashboardService,
    AdminContestService,
    AdminTeamService,
    AdminForwardService,
    AdminAccountService,
  ],
})
export class AdminModule {}
