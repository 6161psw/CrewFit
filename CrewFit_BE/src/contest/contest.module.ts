import { Module } from '@nestjs/common';
import { ContestController } from './contest.controller';
import { ContestRepository } from './contest.repository';
import { ContestService } from './contest.service';

@Module({
  controllers: [ContestController],
  providers: [ContestService, ContestRepository],
  exports: [ContestService, ContestRepository],
})
export class ContestModule {}
