import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BadgeModule } from './badge/badge.service';
import { ChatModule } from './chat/chat.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { validateEnv } from './config/env';
import { ContestModule } from './contest/contest.module';
import { InvitationModule } from './invitation/invitation.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { SchoolModule } from './school/school.module';
import { StorageModule } from './storage/storage.service';
import { SubmissionModule } from './submission/submission.module';
import { TeamModule } from './team/team.module';
import { UserModule } from './user/user.module';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    StorageModule,
    BadgeModule,
    AuthModule,
    SchoolModule,
    UserModule,
    ContestModule,
    ChatModule,
    TeamModule,
    InvitationModule,
    SubmissionModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
