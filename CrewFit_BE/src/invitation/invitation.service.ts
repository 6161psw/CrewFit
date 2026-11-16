import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus, InvitationType, Prisma, TeamStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/types/auth-user.type';
import { canViewContest } from '../common/utils/scope.util';
import { toUserSummary } from '../common/utils/user-summary.util';
import { TeamService } from '../team/team.service';
import { roleHasOpenSlot } from '../team/team.util';
import { ApplyDto } from './dto/req/apply.dto';
import { InvitationListQuery } from './dto/req/invitation-list-query.dto';
import { OfferDto } from './dto/req/offer.dto';
import { InvitationRepository, InvitationRow } from './invitation.repository';

@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly teamService: TeamService,
    private readonly chatService: ChatService,
  ) {}

  private async assertNoPending(teamId: number, userId: string) {
    if (await this.invitationRepository.countPending(teamId, userId)) throw new ConflictException('이미 진행 중인 요청/제안이 있어요');
  }

  /** T-02 참여 요청 */
  async apply(user: AuthUser, teamId: number, dto: ApplyDto) {
    const t = await this.invitationRepository.findTeam(teamId);
    if (!t || !canViewContest(user, t.contest)) throw new NotFoundException();
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('모집이 끝난 팀');
    if (t.members.some((m) => m.userId === user.id)) throw new ConflictException('이미 팀원');
    if (!roleHasOpenSlot(t.roles, t.members, dto.roleId)) throw new BadRequestException('남은 자리가 없는 역할');
    await this.teamService.assertNoActiveTeam(user.id, t.contestId);
    await this.assertNoPending(teamId, user.id);
    const inv = await this.invitationRepository.createApply({
      teamId,
      userId: user.id,
      roleId: dto.roleId,
      message: dto.message ?? '',
      contestId: t.contestId,
    });
    return this.toItem(inv, user);
  }

  /** H-06 팀 제안 (관심 표시한 사람에게만) */
  async offer(user: AuthUser, teamId: number, dto: OfferDto) {
    const t = await this.invitationRepository.findTeam(teamId);
    if (!t) throw new NotFoundException();
    if (t.leaderId !== user.id) throw new ForbiddenException('팀장만 제안할 수 있어요');
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('모집이 끝난 팀');
    if (dto.userId === user.id || t.members.some((m) => m.userId === dto.userId)) throw new ConflictException('이미 팀원');
    if (!(await this.invitationRepository.countInterest(dto.userId, t.contestId))) {
      throw new BadRequestException('이 대회에 관심 표시한 사람에게만 제안할 수 있어요');
    }
    if (!roleHasOpenSlot(t.roles, t.members, dto.roleId)) throw new BadRequestException('남은 자리가 없는 역할');
    await this.teamService.assertNoActiveTeam(dto.userId, t.contestId);
    await this.assertNoPending(teamId, dto.userId);
    const inv = await this.invitationRepository.createOffer({
      teamId,
      userId: dto.userId,
      senderId: user.id,
      roleId: dto.roleId,
      message: dto.message ?? '',
    });
    return this.toItem(inv, user);
  }

  /** E-02 받은 제안 / 보낸 요청 */
  async list(user: AuthUser, q: InvitationListQuery) {
    const box: Prisma.InvitationWhereInput =
      q.box === 'sent'
        ? { OR: [{ type: InvitationType.APPLY, userId: user.id }, { type: InvitationType.OFFER, senderId: user.id }] }
        : { OR: [{ type: InvitationType.OFFER, userId: user.id }, { type: InvitationType.APPLY, team: { leaderId: user.id } }] };
    const rows = await this.invitationRepository.findMany({ AND: [box, q.status ? { status: q.status } : {}] });
    return rows.map((r) => this.toItem(r, user));
  }

  async accept(user: AuthUser, id: number) {
    const inv = await this.findPending(id);
    this.assertDecider(inv, user);
    const roleName = await this.invitationRepository.accept(inv, (team, active) => {
      if (team.status !== TeamStatus.RECRUITING) throw new BadRequestException('모집이 끝난 팀');
      if (!roleHasOpenSlot(team.roles, team.members, inv.roleId)) throw new ConflictException('그 역할 자리가 이미 찼어요');
      if (active) throw new ConflictException('이미 이 대회의 다른 팀에 속해 있어요');
    });
    await this.chatService.system(inv.teamId, `${inv.user.name}님이 ‘${roleName}’로 들어왔어요`);
    return { ok: true, teamId: inv.teamId };
  }

  async reject(user: AuthUser, id: number) {
    const inv = await this.findPending(id);
    this.assertDecider(inv, user);
    await this.invitationRepository.setStatus(id, InvitationStatus.REJECTED);
    return { ok: true };
  }

  async cancel(user: AuthUser, id: number) {
    const inv = await this.findPending(id);
    if (inv.senderId !== user.id) throw new ForbiddenException();
    await this.invitationRepository.setStatus(id, InvitationStatus.CANCELED);
    return { ok: true };
  }

  private async findPending(id: number) {
    const inv = await this.invitationRepository.findById(id);
    if (!inv) throw new NotFoundException();
    if (inv.status !== InvitationStatus.PENDING) throw new BadRequestException('이미 처리된 요청');
    return inv;
  }

  /** 지원(APPLY) → 팀장이 결정, 제안(OFFER) → 받은 학생이 결정 */
  private assertDecider(inv: { type: InvitationType; userId: string; team: { leaderId: string } }, user: AuthUser) {
    const ok = inv.type === InvitationType.APPLY ? inv.team.leaderId === user.id : inv.userId === user.id;
    if (!ok) throw new ForbiddenException();
  }

  private toItem(r: InvitationRow, me: AuthUser) {
    const received = r.type === InvitationType.OFFER ? r.userId === me.id : r.team.leader.id === me.id;
    return {
      id: r.id,
      type: r.type,
      status: r.status,
      direction: received ? 'received' : 'sent',
      message: r.message,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      role: r.role,
      team: { id: r.team.id, name: r.team.name, status: r.team.status, contest: r.team.contest, leader: r.team.leader },
      user: toUserSummary(r.user, r.team.badgeHidden),
    };
  }
}
