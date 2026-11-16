import { InvitationStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ApplyDto {
  /** 어떤 역할로 참여할까요? */
  @IsInt()
  roleId: number;

  /** 한 줄 소개 */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}

export class OfferDto extends ApplyDto {
  @IsUUID()
  userId: string;
}

export class InvitationListQuery {
  @IsOptional()
  @IsIn(['received', 'sent'])
  box: 'received' | 'sent' = 'received';

  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;
}
