import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { sendCsv } from '../common/utils/csv.util';
import { AdminTeamService } from './admin-team.service';
import { AdminTeamQuery } from './dto/req/admin-team-query.dto';
import { DocumentArchiveQuery } from './dto/req/document-archive-query.dto';
import { RevisionRequestDto } from './dto/req/revision-request.dto';
import { TeamOutcomeDto } from './dto/req/team-outcome.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminTeamController {
  constructor(private readonly teamService: AdminTeamService) {}

  /** W-03 대회별 지원 팀 목록 */
  @Get('contests/:id/teams')
  list(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() q: AdminTeamQuery) {
    return this.teamService.listByContest(user, id, q);
  }

  /** 엑셀로 내보내기 (학교 양식) */
  @Get('contests/:id/export.csv')
  async export(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { fileName, content } = await this.teamService.exportCsv(user, id);
    sendCsv(res, fileName, content);
  }

  /** W-04 팀 상세 (서류 확인 + 처리 기록) */
  @Get('submissions/:id')
  detail(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.detail(user, id);
  }

  /** 서류 열기 */
  @Get('submissions/:id/documents/:docId/file')
  async file(
    @GetUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Res() res: Response,
  ) {
    const f = await this.teamService.file(user, id, docId);
    res.download(f.path, f.fileName);
  }

  /** 승인하기 */
  @Post('submissions/:id/approve')
  @HttpCode(200)
  approve(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.teamService.approve(user, id);
  }

  /** W-05 보완 요청 보내기 */
  @Post('submissions/:id/revision')
  @HttpCode(200)
  revision(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RevisionRequestDto) {
    return this.teamService.requestRevision(user, id, dto);
  }

  /** 완주·수상 처리 */
  @Patch('teams/:id/outcome')
  outcome(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: TeamOutcomeDto) {
    return this.teamService.setOutcome(user, id, dto);
  }

  /** 서류 보관함 */
  @Get('documents')
  documents(@GetUser() user: AuthUser, @Query() q: DocumentArchiveQuery) {
    return this.teamService.documents(user, q);
  }
}
