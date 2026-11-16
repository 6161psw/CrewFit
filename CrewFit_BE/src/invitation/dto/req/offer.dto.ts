import { IsUUID } from 'class-validator';
import { ApplyDto } from './apply.dto';

export class OfferDto extends ApplyDto {
  @IsUUID()
  userId: string;
}
