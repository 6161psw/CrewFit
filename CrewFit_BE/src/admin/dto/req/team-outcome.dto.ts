import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** 대회 종료 후 완주·수상 처리 */
export class TeamOutcomeDto {
  /** 완주한 팀원 (나머지는 중도 이탈) */
  @IsArray()
  @IsUUID('4', { each: true })
  completedUserIds: string[];

  /** 수상 (예: 우수상) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  award?: string;
}
