import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  /** W-02 대시보드 */
  @Get()
  get(@GetUser() user: AuthUser) {
    return this.dashboardService.get(user);
  }
}
