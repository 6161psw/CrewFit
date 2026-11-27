import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrawlTrigger, UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { CrawlerService } from './crawler.service';
import { CrawlRunsQuery, RunCrawlDto } from './dto/req/run-crawl.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  /** 수집 소스 상태 */
  @Get('sources')
  async sources() {
    return { running: this.crawlerService.isRunning, sources: await this.crawlerService.sources() };
  }

  /** 수집 기록 */
  @Get('runs')
  runs(@Query() q: CrawlRunsQuery) {
    return this.crawlerService.runs(q.source);
  }

  /** 지금 수집 (최고 관리자) */
  @Post('run')
  @Roles(UserRole.SUPER_ADMIN)
  run(@GetUser() user: AuthUser, @Body() dto: RunCrawlDto) {
    return this.crawlerService.run(CrawlTrigger.MANUAL, { source: dto.source, userId: user.id });
  }
}
