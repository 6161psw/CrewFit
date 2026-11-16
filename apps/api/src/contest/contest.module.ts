import { Controller, Delete, Get, Module, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards';
import { AuthUser, GetUser } from '../common/auth-user';
import { ContestListQuery, InterestedUsersQuery } from './contest.dto';
import { ContestRepository } from './contest.repository';
import { ContestService } from './contest.service';

@ApiTags('contest')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('contests')
export class ContestController {
  constructor(private readonly contestService: ContestService) {}

  /** H-01 홈(공모전) */
  @Get()
  list(@GetUser() user: AuthUser, @Query() q: ContestListQuery) {
    return this.contestService.list(user, q);
  }

  /** H-03 공모전 상세 */
  @Get(':id')
  detail(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.contestService.detail(user, id);
  }

  /** 하트(관심 있음) */
  @Post(':id/interest')
  like(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.contestService.setInterest(user, id, true);
  }

  @Delete(':id/interest')
  unlike(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.contestService.setInterest(user, id, false);
  }

  /** H-04 관심 있는 사람 */
  @Get(':id/interested-users')
  interested(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() q: InterestedUsersQuery) {
    return this.contestService.interestedUsers(user, id, q);
  }
}

@Module({
  controllers: [ContestController],
  providers: [ContestService, ContestRepository],
  exports: [ContestService, ContestRepository],
})
export class ContestModule {}
