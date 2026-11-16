import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { JwtGuard, RolesGuard } from '../auth/guards';
import { ChatModule } from '../chat/chat.module';
import { AuthUser, GetUser, Roles } from '../common/auth-user';
import { SubmissionModule } from '../submission/submission.module';
import {
  AdminSubmissionQuery,
  AdminUserQuery,
  CreateContestDto,
  TeamOutcomeDto,
  UpdateContestDto,
  UpdateSubmissionStatusDto,
  UpdateUserRoleDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** 대시보드: 관심 → 팀 결성 → 신청 → 수상 */
  @Get('dashboard')
  dashboard(@GetUser() user: AuthUser) {
    return this.adminService.dashboard(user);
  }

  @Get('contests')
  listContests(@GetUser() user: AuthUser) {
    return this.adminService.listContests(user);
  }

  @Post('contests')
  createContest(@GetUser() user: AuthUser, @Body() dto: CreateContestDto) {
    return this.adminService.createContest(user, dto);
  }

  @Patch('contests/:id')
  updateContest(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContestDto) {
    return this.adminService.updateContest(user, id, dto);
  }

  @Delete('contests/:id')
  removeContest(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.removeContest(user, id);
  }

  /** 제출 명단 CSV 다운로드 */
  @Get('contests/:id/roster.csv')
  async roster(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { fileName, content } = await this.adminService.rosterCsv(user, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(content);
  }

  @Get('submissions')
  listSubmissions(@GetUser() user: AuthUser, @Query() q: AdminSubmissionQuery) {
    return this.adminService.listSubmissions(user, q);
  }

  @Get('submissions/:id')
  submission(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.submissionDetail(user, id);
  }

  /** 승인 / 반려 / 주최 전달 */
  @Patch('submissions/:id/status')
  updateStatus(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubmissionStatusDto) {
    return this.adminService.updateSubmissionStatus(user, id, dto);
  }

  /** 완주·수상 처리 */
  @Patch('teams/:id/outcome')
  outcome(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: TeamOutcomeDto) {
    return this.adminService.setTeamOutcome(user, id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('users')
  users(@Query() q: AdminUserQuery) {
    return this.adminService.listUsers(q);
  }

  /** 학교 담당자 지정 */
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('users/:id/role')
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto);
  }
}

@Module({
  imports: [SubmissionModule, ChatModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
