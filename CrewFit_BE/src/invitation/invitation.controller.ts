import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { ApplyDto } from './dto/req/apply.dto';
import { InvitationListQuery } from './dto/req/invitation-list-query.dto';
import { OfferDto } from './dto/req/offer.dto';
import { InvitationService } from './invitation.service';

@ApiTags('invitation')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller()
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /** T-02 참여 요청 보내기 */
  @Post('teams/:id/applications')
  apply(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ApplyDto) {
    return this.invitationService.apply(user, id, dto);
  }

  /** H-06 내 팀에 제안하기 */
  @Post('teams/:id/offers')
  offer(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: OfferDto) {
    return this.invitationService.offer(user, id, dto);
  }

  @Get('invitations')
  list(@GetUser() user: AuthUser, @Query() q: InvitationListQuery) {
    return this.invitationService.list(user, q);
  }

  @Post('invitations/:id/accept')
  @HttpCode(200)
  accept(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.invitationService.accept(user, id);
  }

  @Post('invitations/:id/reject')
  @HttpCode(200)
  reject(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.invitationService.reject(user, id);
  }

  @Post('invitations/:id/cancel')
  @HttpCode(200)
  cancel(@GetUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.invitationService.cancel(user, id);
  }
}
