import { InvitationStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

export class InvitationListQuery {
  @IsOptional()
  @IsIn(['received', 'sent'])
  box: 'received' | 'sent' = 'received';

  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;
}
