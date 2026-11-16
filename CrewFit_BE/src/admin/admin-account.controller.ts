import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { AdminAccountService } from './admin-account.service';
import { AdminUserQuery, CreateInviteDto, RedeemInviteDto, UpdateAdminMeDto, UpdateLicenseDto, UpdateUserRoleDto } from './dto/req/admin-account.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminAccountController {
  constructor(private readonly accountService: AdminAccountService) {}

  /** 관리자 정보 (이름·부서·학교·라이선스) */
  @Get('me')
  me(@GetUser() user: AuthUser) {
    return this.accountService.me(user);
  }

  /** 설정 */
  @Patch('me')
  updateMe(@GetUser() user: AuthUser, @Body() dto: UpdateAdminMeDto) {
    return this.accountService.updateMe(user, dto);
  }

  /** 동료 관리자 초대 코드 발급 */
  @Post('invites')
  createInvite(@GetUser() user: AuthUser, @Body() dto: CreateInviteDto) {
    return this.accountService.createInvite(user, dto);
  }

  @Get('invites')
  invites(@GetUser() user: AuthUser) {
    return this.accountService.listInvites(user);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('users')
  users(@Query() q: AdminUserQuery) {
    return this.accountService.listUsers(q);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('users/:id/role')
  updateRole(@GetUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserRoleDto) {
    return this.accountService.updateRole(user, id, dto);
  }

  /** 학교 연간 라이선스 */
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('schools/:id/license')
  license(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLicenseDto) {
    return this.accountService.updateLicense(id, dto);
  }
}

/** 초대 코드 사용 — 아직 관리자 아닌 계정이 호출 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('admin-invites')
export class AdminInviteController {
  constructor(private readonly accountService: AdminAccountService) {}

  /** W-01 관리자 초대 코드로 시작하기 */
  @Post('redeem')
  @HttpCode(200)
  redeem(@GetUser() user: AuthUser, @Body() dto: RedeemInviteDto) {
    return this.accountService.redeem(user, dto);
  }
}
