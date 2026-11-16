import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { SubmissionService } from './submission.service';

@ApiTags('submission')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('teams/:teamId')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  /** 팀 확정하기 (팀장) → 제출 서류 생성 */
  @Post('confirm')
  @HttpCode(200)
  confirm(@GetUser() user: AuthUser, @Param('teamId', ParseIntPipe) teamId: number) {
    return this.submissionService.confirm(user, teamId);
  }

  /** T-04/05 제출 서류 · T-06 진행 상태 */
  @Get('submission')
  get(@GetUser() user: AuthUser, @Param('teamId', ParseIntPipe) teamId: number) {
    return this.submissionService.get(user, teamId);
  }

  /** 파일 올리기 (PDF, 팀장) */
  @Post('submission/documents/:docId/file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @GetUser() user: AuthUser,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('docId', ParseIntPipe) docId: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.submissionService.uploadFile(user, teamId, docId, file);
  }

  @Get('submission/documents/:docId/file')
  async download(
    @GetUser() user: AuthUser,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Res() res: Response,
  ) {
    const f = await this.submissionService.download(user, teamId, docId);
    res.download(f.path, f.fileName);
  }

  /** 개인정보 동의서 서명 (팀원) */
  @Post('submission/signature')
  @HttpCode(200)
  sign(@GetUser() user: AuthUser, @Param('teamId', ParseIntPipe) teamId: number) {
    return this.submissionService.sign(user, teamId);
  }

  /** 학교로 제출하기 (팀장) */
  @Post('submission/submit')
  @HttpCode(200)
  submit(@GetUser() user: AuthUser, @Param('teamId', ParseIntPipe) teamId: number) {
    return this.submissionService.submit(user, teamId);
  }
}
