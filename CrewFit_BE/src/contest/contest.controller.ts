import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { ContestService } from './contest.service';
import { ContestListQuery } from './dto/req/contest-list-query.dto';
import { InterestedUsersQuery } from './dto/req/interested-users-query.dto';

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
