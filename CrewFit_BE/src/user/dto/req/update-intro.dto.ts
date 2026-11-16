import { IsOptional, IsString, MaxLength } from 'class-validator';

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
