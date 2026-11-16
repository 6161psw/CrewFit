import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BadgeModule } from './badge/badge.module';
import { ChatModule } from './chat/chat.module';
import { AllExceptionsFilter } from './common/filter/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { validateEnv } from './config/env.validation';
import { ContestModule } from './contest/contest.module';
import { HealthModule } from './health/health.module';
import { InvitationModule } from './invitation/invitation.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolModule } from './school/school.module';
import { StorageModule } from './storage/storage.module';
import { SubmissionModule } from './submission/submission.module';
import { TeamModule } from './team/team.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    StorageModule,
    BadgeModule,
    HealthModule,
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
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
