import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

export class UpdateAdminMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  /** 소속 부서 (예: 창업진흥센터) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;
}

/** 관리자 초대 코드 발급 */
export class CreateInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays = 7;

  /** SUPER_ADMIN 만: 대상 학교 */
  @IsOptional()
  @IsInt()
  schoolId?: number;
}

export class RedeemInviteDto {
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code: string;
}

export class AdminUserQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  q?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  adminSchoolId?: number;
}

export class UpdateLicenseDto {
  /** 학교 연간 라이선스 만료일 */
  @IsDateString()
  licenseExpiresAt: string;
}
