import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { SubmissionController } from './submission.controller';
import { SubmissionRepository } from './submission.repository';
import { SubmissionService } from './submission.service';

@Module({
  imports: [ChatModule],
  controllers: [SubmissionController],
  providers: [SubmissionService, SubmissionRepository],
  exports: [SubmissionService, SubmissionRepository],
})
export class SubmissionModule {}
