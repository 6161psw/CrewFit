import { ContestCategory, ContestScope, ContestStatus, DocumentType, SubmissionStatus, UserRole } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQuery } from '../common/pagination';

export class RequiredDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class CreateContestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(100)
  organizer: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsEnum(ContestCategory)
  category: ContestCategory;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsEnum(ContestScope)
  scope: ContestScope;

  /** SUPER_ADMIN 이 SCHOOL 공고 만들 때 */
  @IsOptional()
  @IsInt()
  schoolId?: number;

  /** SUPER_ADMIN 이 REGION 공고 만들 때 (예: 광주·전남) */
  @IsOptional()
  @IsString()
  region?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  minTeamSize: number;

  @IsInt()
  @Min(1)
  @Max(20)
  maxTeamSize: number;

  @IsOptional()
  @IsDateString()
  applyStartAt?: string;

  @IsDateString()
  deadline: string;

  /** 제출처 (예: GIST 창업진흥센터) */
  @IsString()
  @MaxLength(100)
  submitTo: string;

  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @IsOptional()
  @IsEnum(ContestStatus)
  status?: ContestStatus;

  /** 팀 확정 후 낼 서류 */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentDto)
  requiredDocuments?: RequiredDocumentDto[];
}

export class UpdateContestDto extends PartialType(CreateContestDto) {}

export class AdminSubmissionQuery extends PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contestId?: number;

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}

export class UpdateSubmissionStatusDto {
  @IsIn([SubmissionStatus.APPROVED, SubmissionStatus.REJECTED, SubmissionStatus.FORWARDED])
  status: SubmissionStatus;

  /** 반려 사유 등 */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class TeamOutcomeDto {
  /** 완주한 팀원 (나머지는 중도 이탈 처리) */
  @IsArray()
  @IsUUID('4', { each: true })
  completedUserIds: string[];

  /** 수상 (예: 우수상) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  award?: string;
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
  @IsInt()
  adminSchoolId?: number;
}
