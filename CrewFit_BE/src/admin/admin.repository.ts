import { Injectable } from '@nestjs/common';
import { ContestStatus, DocumentType, ForwardFormat, MemberOutcome, Prisma, RevisionReason, SubmissionLogType, SubmissionStatus, TeamStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionRepository } from '../submission/submission.repository';

type Tx = Prisma.TransactionClient;

/** W-03 / W-06 / CSV 공용: 제출 + 팀원 */
export const adminSubmissionInclude = {
  contest: { select: { id: true, title: true } },
  documents: { select: { id: true, type: true, title: true, status: true, fileName: true }, orderBy: { order: 'asc' } },
  team: {
    select: {
      id: true,
      name: true,
      award: true,
      leaderId: true,
      members: {
        orderBy: { joinedAt: 'asc' },
        select: {
          isLeader: true,
          role: { select: { name: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              schoolEmail: true,
              major: true,
              admissionYear: true,
              school: { select: { name: true, shortName: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SubmissionInclude;

export type AdminSubmissionRow = Prisma.SubmissionGetPayload<{ include: typeof adminSubmissionInclude }>;

@Injectable()
export class AdminRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  // ---------- 공고 ----------

  findContests(where: Prisma.ContestWhereInput) {
    return this.prisma.contest.findMany({
      where,
      orderBy: { deadline: 'desc' },
      include: {
        school: { select: { shortName: true } },
        requiredDocuments: { orderBy: { order: 'asc' } },
        _count: { select: { interests: true, teams: { where: { status: { not: TeamStatus.DISBANDED } } } } },
      },
    });
  }

  findContest(id: number) {
    return this.prisma.contest.findUnique({ where: { id } });
  }

  findSchool(id: number) {
    return this.prisma.school.findUnique({ where: { id } });
  }

  createContest(data: Prisma.ContestUncheckedCreateInput) {
    return this.prisma.contest.create({ data, include: { requiredDocuments: true } });
  }

  updateContest(id: number, data: Prisma.ContestUncheckedUpdateInput, docs?: { type: DocumentType; title: string; description?: string }[]) {
    return this.prisma.$transaction(async (tx) => {
      if (docs) {
        await tx.contestRequiredDocument.deleteMany({ where: { contestId: id } });
        await tx.contestRequiredDocument.createMany({ data: docs.map((d, order) => ({ ...d, order, contestId: id })) });
      }
      return tx.contest.update({ where: { id }, data, include: { requiredDocuments: { orderBy: { order: 'asc' } } } });
    });
  }

  countTeams(contestId: number) {
    return this.prisma.team.count({ where: { contestId } });
  }

  closeContest(id: number) {
    return this.prisma.contest.update({ where: { id }, data: { status: ContestStatus.CLOSED } });
  }

  deleteContest(id: number) {
    return this.prisma.contest.delete({ where: { id } });
  }

  // ---------- 대시보드 ----------

  dashboardContests(where: Prisma.ContestWhereInput) {
    return this.prisma.contest.findMany({
      where,
      orderBy: { deadline: 'asc' },
      select: {
        id: true,
        title: true,
        organizer: true,
        scope: true,
        status: true,
        deadline: true,
        _count: { select: { interests: true, teams: { where: { status: TeamStatus.RECRUITING } } } },
      },
    });
  }

  /** 제출된(준비 중 제외) 제출 건 요약 */
  submittedLight(contestIds: number[]) {
    return this.prisma.submission.findMany({
      where: { contestId: { in: contestIds }, status: { not: SubmissionStatus.PREPARING } },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        contestId: true,
        status: true,
        submittedAt: true,
        documents: { select: { status: true } },
        contest: { select: { title: true } },
        team: {
          select: {
            name: true,
            members: { select: { user: { select: { schoolVerifiedAt: true } } } },
          },
        },
      },
    });
  }

  latestForwardBatch(contestIds: number[]) {
    return this.prisma.forwardBatch.findFirst({
      where: { contestId: { in: contestIds }, revertedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { contest: { select: { title: true } } },
    });
  }

  // ---------- 지원 팀 / 제출 ----------

  findSubmissionsByContest(contestId: number, statuses: SubmissionStatus[]): Promise<AdminSubmissionRow[]> {
    return this.prisma.submission.findMany({
      where: { contestId, status: { in: statuses } },
      orderBy: { submittedAt: 'desc' },
      include: adminSubmissionInclude,
    });
  }

  findSubmission(id: number) {
    return this.submissionRepository.findById(id);
  }

  approve(id: number, teamId: number, actorId: string) {
    return this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id },
        data: { status: SubmissionStatus.APPROVED, reviewedAt: new Date(), reviewerId: actorId, revisionReasons: [], revisionMessage: null, revisionDeadline: null },
      }),
      this.prisma.submissionLog.create({ data: { submissionId: id, type: SubmissionLogType.APPROVED, message: '학교 승인', actorId } }),
    ]);
  }

  /** 보완 요청: 서류 표시 + (동의서면 서명 초기화) + 팀은 다시 수정 가능 상태 */
  requestRevision(
    s: { id: number; teamId: number },
    d: { documentIds: number[]; consentDocIds: number[]; reasons: RevisionReason[]; message: string; deadline: Date | null; actorId: string; logMessage: string },
  ) {
    return this.prisma.$transaction(async (tx: Tx) => {
      await tx.submissionDocument.updateMany({ where: { id: { in: d.documentIds }, submissionId: s.id }, data: { revisionRequested: true } });
      if (d.consentDocIds.length) await tx.submissionSignature.deleteMany({ where: { submissionId: s.id } });
      await tx.submission.update({
        where: { id: s.id },
        data: {
          status: SubmissionStatus.REVISION_REQUESTED,
          reviewedAt: new Date(),
          reviewerId: d.actorId,
          revisionReasons: d.reasons,
          revisionMessage: d.message,
          revisionDeadline: d.deadline,
        },
      });
      await tx.team.update({ where: { id: s.teamId }, data: { status: TeamStatus.CONFIRMED } });
      await tx.submissionLog.create({ data: { submissionId: s.id, type: SubmissionLogType.REVISION_REQUESTED, message: d.logMessage, actorId: d.actorId } });
      await this.submissionRepository.refreshDocs(tx, s.id);
    });
  }

  /** 완주·수상 처리 + 배지 평가 콜백 */
  setOutcome(teamId: number, memberIds: string[], completed: Set<string>, award: string | null, evaluate: (tx: Tx, userId: string) => Promise<void>) {
    return this.prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: teamId }, data: { status: TeamStatus.COMPLETED, completedAt: new Date(), award } });
      for (const userId of memberIds) {
        await tx.teamMember.update({
          where: { teamId_userId: { teamId, userId } },
          data: { outcome: completed.has(userId) ? MemberOutcome.COMPLETED : MemberOutcome.DROPPED },
        });
      }
      for (const userId of memberIds) if (completed.has(userId)) await evaluate(tx, userId);
    });
  }

  findTeamForOutcome(id: number) {
    return this.prisma.team.findUnique({ where: { id }, include: { contest: true, members: true, submission: true } });
  }

  // ---------- 운영사 전달 ----------

  createForwardBatch(
    contestId: number,
    submissionIds: number[],
    d: { actorId: string; recipientName: string; recipientEmail: string | null; format: ForwardFormat; teamCount: number; studentCount: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.forwardBatch.create({
        data: {
          contestId,
          createdById: d.actorId,
          recipientName: d.recipientName,
          recipientEmail: d.recipientEmail,
          format: d.format,
          teamCount: d.teamCount,
          studentCount: d.studentCount,
        },
      });
      const now = new Date();
      await tx.submission.updateMany({
        where: { id: { in: submissionIds }, status: SubmissionStatus.APPROVED },
        data: { status: SubmissionStatus.FORWARDED, forwardedAt: now, forwardBatchId: batch.id },
      });
      await tx.submissionLog.createMany({
        data: submissionIds.map((submissionId) => ({
          submissionId,
          type: SubmissionLogType.FORWARDED,
          message: `운영사 ${d.recipientName}에 명단 전달`,
          actorId: d.actorId,
        })),
      });
      return batch;
    });
  }

  findBatch(id: number) {
    return this.prisma.forwardBatch.findUnique({
      where: { id },
      include: { contest: true, submissions: { include: adminSubmissionInclude } },
    });
  }

  listBatches(contestIds: number[]) {
    return this.prisma.forwardBatch.findMany({
      where: { contestId: { in: contestIds } },
      orderBy: { createdAt: 'desc' },
      include: { contest: { select: { id: true, title: true } }, createdBy: { select: { name: true } } },
    });
  }

  revertBatch(id: number, submissionIds: number[], actorId: string) {
    return this.prisma.$transaction([
      this.prisma.submission.updateMany({
        where: { forwardBatchId: id, status: SubmissionStatus.FORWARDED },
        data: { status: SubmissionStatus.APPROVED, forwardedAt: null, forwardBatchId: null },
      }),
      this.prisma.forwardBatch.update({ where: { id }, data: { revertedAt: new Date() } }),
      this.prisma.submissionLog.createMany({
        data: submissionIds.map((submissionId) => ({ submissionId, type: SubmissionLogType.FORWARD_REVERTED, message: '운영사 전달 되돌림', actorId })),
      }),
    ]);
  }

  // ---------- 서류 보관함 ----------

  findDocuments(where: Prisma.SubmissionDocumentWhereInput, skip: number, take: number) {
    return Promise.all([
      this.prisma.submissionDocument.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { submission: { select: { id: true, status: true, team: { select: { id: true, name: true } }, contest: { select: { id: true, title: true } } } } },
      }),
      this.prisma.submissionDocument.count({ where }),
    ]);
  }

  // ---------- 계정 ----------

  findUser(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { adminSchool: true } });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  createInvite(data: Prisma.AdminInviteUncheckedCreateInput) {
    return this.prisma.adminInvite.create({ data });
  }

  listInvites(where: Prisma.AdminInviteWhereInput) {
    return this.prisma.adminInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { school: { select: { shortName: true } }, usedBy: { select: { name: true, email: true } } },
    });
  }

  findInvite(code: string) {
    return this.prisma.adminInvite.findUnique({ where: { code } });
  }

  redeemInvite(inviteId: number, userId: string, schoolId: number, department: string | null) {
    return this.prisma.$transaction([
      this.prisma.adminInvite.update({ where: { id: inviteId }, data: { usedById: userId, usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.SCHOOL_ADMIN, adminSchoolId: schoolId, adminDepartment: department },
      }),
    ]);
  }

  listUsers(where: Prisma.UserWhereInput, skip: number, take: number) {
    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminSchoolId: true,
          adminDepartment: true,
          school: { select: { shortName: true } },
          schoolVerifiedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  updateSchool(id: number, data: Prisma.SchoolUpdateInput) {
    return this.prisma.school.update({ where: { id }, data });
  }
}
