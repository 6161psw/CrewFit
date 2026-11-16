import { Gender } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  major?: string;

  /** 학번 (예: 26) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  admissionYear?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  skills?: string[];

  /** 배지 숨김 방 우선 보기 */
  @IsOptional()
  @IsBoolean()
  preferBadgeHidden?: boolean;
}

/** E-04 자소서 */
export class UpdateIntroDto {
  /** Q1. 나를 한 줄로 소개해요 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  oneLiner?: string;

  /** Q2. 팀에서 맡고 싶은 역할 */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  role?: string;

  /** Q3. 끝까지 해낸 경험 */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  experience?: string;
}
