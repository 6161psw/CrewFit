import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class TeamRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  capacity = 1;
}

/** E-01 팀 만들기 */
export class CreateTeamDto {
  @IsInt()
  contestId: number;

  /** 모집 채팅방 이름 */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 구하는 역할 */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TeamRoleDto)
  roles: TeamRoleDto[];

  /** 내 역할 (roles 에 없으면 1자리로 추가) */
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  myRole: string;

  /** 배지 숨김 방 */
  @IsOptional()
  @IsBoolean()
  badgeHidden?: boolean;
}
