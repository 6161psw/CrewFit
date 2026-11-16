import { Injectable } from '@nestjs/common';
import { ContestScope, ContestStatus, DocumentStatus, SubmissionStatus } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user.type';
import { daysAgo, dDay, startOfToday } from '../common/utils/date.util';
import { adminContestWhere } from '../common/utils/scope.util';
import { AdminRepository } from './admin.repository';

/** 학기 시작 (2월·8월 1일 기준) */
function semesterStart(now = new Date()) {
  const m = now.getMonth();
  return m >= 7 ? new Date(now.getFullYear(), 7, 1) : m >= 1 ? new Date(now.getFullYear(), 1, 1) : new Date(now.getFullYear() - 1, 7, 1);
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly adminRepository: AdminRepository) {}

  /** W-02 대시보드 */
  async get(user: AuthUser) {
    const [me, contests] = await Promise.all([
      this.adminRepository.findUser(user.id),
      this.adminRepository.dashboardContests(adminContestWhere(user)),
    ]);
    const ids = contests.map((c) => c.id);
    const [subs, latestBatch] = await Promise.all([
      this.adminRepository.submittedLight(ids),
      this.adminRepository.latestForwardBatch(ids),
    ]);
    const today = startOfToday();
    const sem = semesterStart();
    const active = contests.filter((c) => c.status === ContestStatus.PUBLISHED && c.deadline >= today);
    const review = subs.filter((s) => s.status === SubmissionStatus.SUBMITTED);
    const semSubs = subs.filter((s) => s.submittedAt && s.submittedAt >= sem);
    const docsComplete = (s: (typeof subs)[number]) => s.documents.every((d) => d.status === DocumentStatus.READY);

    return {
      admin: {
        name: me?.name,
        department: me?.adminDepartment,
        school: me?.adminSchool ? { id: me.adminSchool.id, name: me.adminSchool.name, shortName: me.adminSchool.shortName } : null,
        licenseExpiresAt: me?.adminSchool?.licenseExpiresAt ?? null,
      },
      today: {
        newSubmissions: subs.filter((s) => s.submittedAt && s.submittedAt >= today).length,
        needReview: review.length,
      },
      activeContests: {
        total: active.length,
        school: active.filter((c) => c.scope === ContestScope.SCHOOL).length,
        region: active.filter((c) => c.scope === ContestScope.REGION).length,
        national: active.filter((c) => c.scope === ContestScope.NATIONAL).length,
      },
      semester: {
        teams: semSubs.length,
        students: semSubs.reduce((n, s) => n + s.team.members.length, 0),
      },
      review: {
        count: review.length,
        oldestSubmittedAt: review.reduce<Date | null>((min, s) => (s.submittedAt && (!min || s.submittedAt < min) ? s.submittedAt : min), null),
      },
      forwarded: {
        teams: subs.filter((s) => s.status === SubmissionStatus.FORWARDED).length,
        latest: latestBatch ? { contestTitle: latestBatch.contest.title, teamCount: latestBatch.teamCount, createdAt: latestBatch.createdAt } : null,
      },
      contests: active.map((c) => {
        const cs = subs.filter((s) => s.contestId === c.id);
        return {
          id: c.id,
          title: c.title,
          organizer: c.organizer,
          scope: c.scope,
          deadline: c.deadline,
          dDay: dDay(c.deadline),
          interestCount: c._count.interests,
          recruitingTeams: c._count.teams,
          submittedTeams: cs.length,
          docsCompleteTeams: cs.filter(docsComplete).length,
        };
      }),
      recent: subs
        .filter((s) => s.submittedAt)
        .slice(0, 10)
        .map((s) => ({ submissionId: s.id, teamName: s.team.name, contestTitle: s.contest.title, memberCount: s.team.members.length, submittedAt: s.submittedAt })),
      last7Days: Array.from({ length: 7 }, (_, i) => {
        const from = daysAgo(6 - i);
        const to = daysAgo(5 - i);
        return { date: from, count: subs.filter((s) => s.submittedAt && s.submittedAt >= from && s.submittedAt < to).length };
      }),
      autoProcessed: {
        documents: semSubs.reduce((n, s) => n + s.documents.length, 0),
        enrollmentReplaced: semSubs.reduce((n, s) => n + s.team.members.filter((m) => m.user.schoolVerifiedAt).length, 0),
      },
    };
  }
}
