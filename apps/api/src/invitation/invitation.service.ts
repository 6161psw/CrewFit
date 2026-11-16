import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus, InvitationType, Prisma, TeamStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/auth-user';
import { ACTIVE_TEAM_STATUSES, canViewContest } from '../common/scope';
import { toUserSummary, userSummarySelect } from '../common/user-summary';
import { PrismaService } from '../prisma/prisma.service';
import { TeamService } from '../team/team.service';
import { roleHasOpenSlot } from '../team/team.util';
import { ApplyDto, InvitationListQuery, OfferDto } from './invitation.dto';

const listInclude = {
  role: { select: { id: true, name: true } },
  user: { select: userSummarySelect },
  team: {
    select: {
      id: true,
      name: true,
      status: true,
      badgeHidden: true,
      contest: { select: { id: true, title: true } },
      leader: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.InvitationInclude;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamService: TeamService,
    private readonly chatService: ChatService,
  ) {}

  private loadTeam(id: number) {
    return this.prisma.team.findUnique({ where: { id }, include: { contest: true, roles: true, members: true } });
  }

  private async assertNoPending(teamId: number, userId: string) {
    const n = await this.prisma.invitation.count({ where: { teamId, userId, status: InvitationStatus.PENDING } });
    if (n) throw new ConflictException('이미 진행 중인 요청/제안이 있어요');
  }

  /** T-02 참여 요청 */
  async apply(user: AuthUser, teamId: number, dto: ApplyDto) {
    const t = await this.loadTeam(teamId);
    if (!t || !canViewContest(user, t.contest)) throw new NotFoundException();
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('모집이 끝난 팀');
    if (t.members.some((m) => m.userId === user.id)) throw new ConflictException('이미 팀원');
    if (!roleHasOpenSlot(t.roles, t.members, dto.roleId)) throw new BadRequestException('남은 자리가 없는 역할');
    await this.teamService.assertNoActiveTeam(user.id, t.contestId);
    await this.assertNoPending(teamId, user.id);
    const inv = await this.prisma.$transaction(async (tx) => {
      await tx.contestInterest.createMany({ data: [{ userId: user.id, contestId: t.contestId }], skipDuplicates: true });
      return tx.invitation.create({
        data: { teamId, userId: user.id, senderId: user.id, roleId: dto.roleId, type: InvitationType.APPLY, message: dto.message ?? '' },
        include: listInclude,
      });
    });
    return this.toItem(inv, user);
  }

  /** H-06 팀 제안 (관심 표시한 사람에게만) */
  async offer(user: AuthUser, teamId: number, dto: OfferDto) {
    const t = await this.loadTeam(teamId);
    if (!t) throw new NotFoundException();
    if (t.leaderId !== user.id) throw new ForbiddenException('팀장만 제안할 수 있어요');
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('모집이 끝난 팀');
    if (dto.userId === user.id || t.members.some((m) => m.userId === dto.userId)) throw new ConflictException('이미 팀원');
    const interested = await this.prisma.contestInterest.count({ where: { userId: dto.userId, contestId: t.contestId } });
    if (!interested) throw new BadRequestException('이 대회에 관심 표시한 사람에게만 제안할 수 있어요');
    if (!roleHasOpenSlot(t.roles, t.members, dto.roleId)) throw new BadRequestException('남은 자리가 없는 역할');
    await this.teamService.assertNoActiveTeam(dto.userId, t.contestId);
    await this.assertNoPending(teamId, dto.userId);
    const inv = await this.prisma.invitation.create({
      data: { teamId, userId: dto.userId, senderId: user.id, roleId: dto.roleId, type: InvitationType.OFFER, message: dto.message ?? '' },
      include: listInclude,
    });
    return this.toItem(inv, user);
  }

  /** E-02 받은 제안 / 보낸 요청 */
  async list(user: AuthUser, q: InvitationListQuery) {
    const box: Prisma.InvitationWhereInput =
      q.box === 'sent'
        ? { OR: [{ type: InvitationType.APPLY, userId: user.id }, { type: InvitationType.OFFER, senderId: user.id }] }
        : { OR: [{ type: InvitationType.OFFER, userId: user.id }, { type: InvitationType.APPLY, team: { leaderId: user.id } }] };
    const rows = await this.prisma.invitation.findMany({
      where: { AND: [box, q.status ? { status: q.status } : {}] },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: listInclude,
    });
    return rows.map((r) => this.toItem(r, user));
  }

  async accept(user: AuthUser, id: number) {
    const inv = await this.findPending(id);
    this.assertDecider(inv, user);
    const roleName = await this.prisma.$transaction(async (tx) => {
      const t = await tx.team.findUniqueOrThrow({ where: { id: inv.teamId }, include: { roles: true, members: true } });
      if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('모집이 끝난 팀');
      if (!roleHasOpenSlot(t.roles, t.members, inv.roleId)) throw new ConflictException('그 역할 자리가 이미 찼어요');
      const active = await tx.teamMember.count({
        where: { userId: inv.userId, team: { contestId: t.contestId, status: { in: ACTIVE_TEAM_STATUSES } } },
      });
      if (active) throw new ConflictException('이미 이 대회의 다른 팀에 속해 있어요');
      await tx.teamMember.create({ data: { teamId: t.id, userId: inv.userId, roleId: inv.roleId } });
      const now = new Date();
      await tx.invitation.update({ where: { id }, data: { status: InvitationStatus.ACCEPTED, respondedAt: now } });
      // 같은 대회의 다른 대기 요청/제안 정리
      await tx.invitation.updateMany({
        where: { userId: inv.userId, status: InvitationStatus.PENDING, team: { contestId: t.contestId } },
        data: { status: InvitationStatus.CANCELED, respondedAt: now },
      });
      return t.roles.find((r) => r.id === inv.roleId)?.name ?? '팀원';
    });
    await this.chatService.system(inv.teamId, `${inv.user.name}님이 ‘${roleName}’로 들어왔어요`);
    return { ok: true, teamId: inv.teamId };
  }

  async reject(user: AuthUser, id: number) {
    const inv = await this.findPending(id);
    this.assertDecider(inv, user);
    await this.prisma.invitation.update({ where: { id }, data: { status: InvitationStatus.REJECTED, respondedAt: new Date() } });
    return { ok: true };
  }

  async cancel(user: AuthUser, id: number) {
    const inv = await this.findPending(id);
    if (inv.senderId !== user.id) throw new ForbiddenException();
    await this.prisma.invitation.update({ where: { id }, data: { status: InvitationStatus.CANCELED, respondedAt: new Date() } });
    return { ok: true };
  }

  private async findPending(id: number) {
    const inv = await this.prisma.invitation.findUnique({
      where: { id },
      include: { team: { select: { leaderId: true } }, user: { select: { name: true } } },
    });
    if (!inv) throw new NotFoundException();
    if (inv.status !== InvitationStatus.PENDING) throw new BadRequestException('이미 처리된 요청');
    return inv;
  }

  /** 지원(APPLY) → 팀장이 결정, 제안(OFFER) → 받은 학생이 결정 */
  private assertDecider(inv: { type: InvitationType; userId: string; team: { leaderId: string } }, user: AuthUser) {
    const ok = inv.type === InvitationType.APPLY ? inv.team.leaderId === user.id : inv.userId === user.id;
    if (!ok) throw new ForbiddenException();
  }

  private toItem(r: Prisma.InvitationGetPayload<{ include: typeof listInclude }>, me: AuthUser) {
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
