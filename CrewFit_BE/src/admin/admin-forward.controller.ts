import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { sendCsv } from '../common/utils/csv.util';
import { AdminForwardService } from './admin-forward.service';
import { ForwardDto, ForwardPreviewQuery } from './dto/req/forward.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminForwardController {
  constructor(private readonly forwardService: AdminForwardService) {}

  /** W-06 운영사 전달 미리보기 */
  @Get('contests/:id/forward/preview')
  preview(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() q: ForwardPreviewQuery) {
    return this.forwardService.preview(user, id, q.format);
  }

  /** 승인 팀 전달하기 */
  @Post('contests/:id/forward')
  @HttpCode(200)
  forward(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ForwardDto) {
    return this.forwardService.forward(user, id, dto);
  }

  /** 전달 기록 */
  @Get('forward-batches')
  list(@GetUser() user: AuthUser) {
    return this.forwardService.list(user);
  }

  /** 전달 명단 파일 */
  @Get('forward-batches/:id/file')
  async file(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { fileName, content } = await this.forwardService.file(user, id);
    sendCsv(res, fileName, content);
  }

  /** W-07 되돌리기 */
  @Post('forward-batches/:id/revert')
  @HttpCode(200)
  revert(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.forwardService.revert(user, id);
  }
}
