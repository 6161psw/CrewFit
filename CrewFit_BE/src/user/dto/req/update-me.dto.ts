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

