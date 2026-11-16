import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateTeamDto } from './dto/req/create-team.dto';
import { TeamListQuery } from './dto/req/team-list-query.dto';
import { UpdateTeamDto } from './dto/req/update-team.dto';
import { TeamService } from './team.service';

@ApiTags('team')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  /** H-02 모집 채팅 목록 */
  @Get()
  list(@GetUser() user: AuthUser, @Query() q: TeamListQuery) {
    return this.teamService.list(user, q);
  }

  /** E-02 채팅 탭 (내 팀 + 요청/제안 카운트) */
  @Get('me')
  mine(@GetUser() user: AuthUser) {
    return this.teamService.mine(user);
  }

  /** E-01 팀 만들기 */
  @Post()
  create(@GetUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teamService.create(user, dto);
  }

  /** T-01 팀 미리보기 */
  @Get(':id')
  detail(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.detail(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamDto) {
    return this.teamService.update(user, id, dto);
  }

  /** 팀 해산 (팀장, 모집 중) */
  @Delete(':id')
  disband(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.disband(user, id);
  }

  @Post(':id/like')
  like(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.setLike(user, id, true);
  }

  @Delete(':id/like')
  unlike(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.setLike(user, id, false);
  }

  @Post(':id/leave')
  leave(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.leave(user, id);
  }

  @Delete(':id/members/:userId')
  kick(
    @GetUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.teamService.kick(user, id, userId);
  }
}
