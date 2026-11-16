import { ContestCategory, ContestScope, ContestStatus, DocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

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

/** 공고 등록 */
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

  /** 교내 / 연합 / 전국 */
  @IsEnum(ContestScope)
  scope: ContestScope;

  /** SUPER_ADMIN 이 교내 공고 만들 때 */
  @IsOptional()
  @IsInt()
  schoolId?: number;

  /** SUPER_ADMIN 이 연합 공고 만들 때 (예: 광주·전남) */
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

  /** 운영사 (명단 전달 받는 곳) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  operatorName?: string;

  @IsOptional()
  @IsEmail()
  operatorEmail?: string;

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
