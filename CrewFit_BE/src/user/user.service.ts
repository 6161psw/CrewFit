import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberOutcome, TeamStatus } from '@prisma/client';
import { AuthUser, isAdmin } from '../common/types/auth-user.type';
import { BADGE_LABEL, CATEGORY_LABEL } from '../common/utils/labels';
import { completionRate } from '../common/utils/user-summary.util';
import { UpdateIntroDto } from './dto/req/update-intro.dto';
import { UpdateMeDto } from './dto/req/update-me.dto';
import { ProfileRow, UserRepository } from './user.repository';

const HISTORY_STATUSES: TeamStatus[] = [TeamStatus.SUBMITTED, TeamStatus.COMPLETED];

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getMe(user: AuthUser) {
    const row = await this.userRepository.findProfile(user.id);
    if (!row) throw new NotFoundException();
    return {
      ...this.toProfile(row, true),
      email: row.email,
      schoolEmail: row.schoolEmail,
      gender: row.gender,
      preferBadgeHidden: row.preferBadgeHidden,
      role: row.role,
      adminSchoolId: row.adminSchoolId,
      interestCount: row._count.interests,
    };
  }

  async getProfile(viewer: AuthUser, id: string) {
    const allowed = isAdmin(viewer) || (await this.userRepository.canView(viewer.id, id));
    const row = allowed ? await this.userRepository.findProfile(id) : null;
    // 공개 범위 밖이면 존재 여부도 숨김
    if (!row) throw new NotFoundException('프로필을 볼 수 없어요');
    return this.toProfile(row, false);
  }

  async updateMe(user: AuthUser, dto: UpdateMeDto) {
    await this.userRepository.update(user.id, {
      ...dto,
      skills: dto.skills?.map((s) => s.trim()).filter(Boolean),
    });
    return this.getMe(user);
  }

  async updateIntro(user: AuthUser, dto: UpdateIntroDto) {
    await this.userRepository.update(user.id, {
      introOneLiner: dto.oneLiner,
      introRole: dto.role,
      introExperience: dto.experience,
      introUpdatedAt: new Date(),
    });
    return this.getMe(user);
  }

  interests(user: AuthUser) {
    return this.userRepository.interestedContests(user.id);
  }

  private toProfile(u: ProfileRow, self: boolean) {
    const history = u.memberships
      .filter((m) => self || HISTORY_STATUSES.includes(m.team.status) || m.outcome === MemberOutcome.COMPLETED)
      .map((m) => ({
        teamId: m.team.id,
        teamName: m.team.name,
        teamStatus: m.team.status,
        role: m.role?.name ?? null,
        outcome: m.outcome,
        award: m.team.award,
        contest: { ...m.team.contest, categoryLabel: CATEGORY_LABEL[m.team.contest.category] },
      }));
    return {
      id: u.id,
      name: u.name,
      picture: u.picture,
      school: u.school ? { id: u.school.id, name: u.school.name, shortName: u.school.shortName, region: u.school.region } : null,
      schoolVerified: !!u.schoolVerifiedAt,
      major: u.major,
      admissionYear: u.admissionYear,
      skills: u.skills,
      intro: { oneLiner: u.introOneLiner, role: u.introRole, experience: u.introExperience, updatedAt: u.introUpdatedAt },
      stats: {
        completionRate: completionRate(u.memberships),
        badgeCount: u.badges.length,
        teamCount: u.memberships.length,
        contestCount: new Set(history.map((h) => h.contest.id)).size,
        awardCount: history.filter((h) => h.award).length,
      },
      badges: u.badges.map((b) => ({ code: b.code, ...BADGE_LABEL[b.code], awardedAt: b.awardedAt })),
      history,
    };
  }
}
