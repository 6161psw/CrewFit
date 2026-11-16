import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { AdminContestService } from './admin-contest.service';
import { CreateContestDto } from './dto/req/create-contest.dto';
import { UpdateContestDto } from './dto/req/update-contest.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/contests')
export class AdminContestController {
  constructor(private readonly contestService: AdminContestService) {}

  /** 대회 공고 목록 */
  @Get()
  list(@GetUser() user: AuthUser) {
    return this.contestService.list(user);
  }

  /** 공고 등록 */
  @Post()
  create(@GetUser() user: AuthUser, @Body() dto: CreateContestDto) {
    return this.contestService.create(user, dto);
  }

  @Patch(':id')
  update(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContestDto) {
    return this.contestService.update(user, id, dto);
  }

  /** 팀 있으면 마감, 없으면 삭제 */
  @Delete(':id')
  remove(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.contestService.remove(user, id);
  }
}
