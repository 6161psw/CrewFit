import { Injectable } from '@nestjs/common';
import { DocumentStatus, DocumentType, InvitationStatus, MemberOutcome, Prisma, SubmissionLogType, SubmissionStatus, TeamStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const submissionInclude = {
  contest: { select: { id: true, title: true, submitTo: true, schoolId: true, createdById: true } },
  team: {
    include: {
      leader: { select: { id: true, name: true } },
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          role: { select: { name: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              major: true,
              admissionYear: true,
              schoolEmail: true,
              schoolVerifiedAt: true,
              school: { select: { name: true, shortName: true } },
              _count: { select: { memberships: { where: { outcome: MemberOutcome.COMPLETED } } } },
            },
          },
        },
      },
    },
  },
  documents: { orderBy: { order: 'asc' } },
  signatures: true,
  reviewer: { select: { id: true, name: true } },
  logs: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.SubmissionInclude;

export type SubmissionRow = Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class SubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTeam(teamId: number): Promise<SubmissionRow | null> {
    return this.prisma.submission.findUnique({ where: { teamId }, include: submissionInclude });
  }

  findById(id: number): Promise<SubmissionRow | null> {
    return this.prisma.submission.findUnique({ where: { id }, include: submissionInclude });
  }

  findTeamForConfirm(teamId: number) {
    return this.prisma.team.findUnique({
      where: { id: teamId },
      include: { contest: { include: { requiredDocuments: { orderBy: { order: 'asc' } } } }, members: true },
    });
  }

  /** 팀 확정: 팀 상태 + 대기 초대 취소 + 제출 서류 생성 */
  confirm(
    teamId: number,
    contestId: number,
    actorId: string,
    docs: { requiredDocumentId?: number; type: DocumentType; title: string; description: string | null; order: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: teamId }, data: { status: TeamStatus.CONFIRMED, confirmedAt: new Date() } });
      await tx.invitation.updateMany({
        where: { teamId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.CANCELED, respondedAt: new Date() },
      });
      const s = await tx.submission.create({
        data: {
          teamId,
          contestId,
          documents: { create: docs },
          logs: { create: { type: SubmissionLogType.CONFIRMED, message: '팀 확정', actorId } },
        },
      });
      await this.refreshDocs(tx, s.id);
      return s;
    });
  }

  setFile(submissionId: number, docId: number, file: { filePath: string; fileName: string; fileSize: number }, actorId: string, title: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.submissionDocument.update({ where: { id: docId }, data: { ...file, revisionRequested: false } });
      await tx.submissionLog.create({ data: { submissionId, type: SubmissionLogType.FILE_UPLOADED, message: `${title} 업로드`, actorId } });
      await this.refreshDocs(tx, submissionId);
    });
  }

  sign(submissionId: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.submissionSignature.createMany({ data: [{ submissionId, userId }], skipDuplicates: true });
      await tx.submissionDocument.updateMany({ where: { submissionId, type: DocumentType.CONSENT }, data: { revisionRequested: false } });
      const { consentDone, memberCount } = await this.refreshDocs(tx, submissionId);
      if (consentDone) {
        await tx.submissionLog.create({
          data: { submissionId, type: SubmissionLogType.SIGNED_ALL, message: `팀원 전자서명 ${memberCount}/${memberCount} 완료` },
        });
      }
    });
  }

  submit(submissionId: number, teamId: number, actorId: string, docCount: number) {
    return this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.SUBMITTED, submittedAt: new Date(), reviewedAt: null, reviewerId: null },
      }),
      this.prisma.team.update({ where: { id: teamId }, data: { status: TeamStatus.SUBMITTED } }),
      this.prisma.submissionLog.create({
        data: { submissionId, type: SubmissionLogType.SUBMITTED, message: `크루핏 접수 · 서류 ${docCount}건을 학교 양식으로 자동 정리`, actorId },
      }),
    ]);
  }

  /** 자동 서류 상태 재계산. consentDone = 이번에 서명이 모두 채워짐 */
  async refreshDocs(tx: Tx, submissionId: number) {
    const s = await tx.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        documents: true,
        signatures: true,
        team: { include: { members: { include: { user: { select: { schoolVerifiedAt: true } } } } } },
      },
    });
    const members = s.team.members;
    const signed = new Set(s.signatures.map((x) => x.userId));
    let consentDone = false;
    for (const d of s.documents) {
      let ready = false;
      if (d.type === DocumentType.ROSTER || d.type === DocumentType.APPLICATION_FORM) ready = true;
      else if (d.type === DocumentType.ENROLLMENT) ready = members.every((m) => !!m.user.schoolVerifiedAt);
      else if (d.type === DocumentType.CONSENT) ready = members.every((m) => signed.has(m.userId));
      else if (d.type === DocumentType.FILE) ready = !!d.filePath && !d.revisionRequested;
      const status = ready ? DocumentStatus.READY : DocumentStatus.PENDING;
      if (status !== d.status) {
        await tx.submissionDocument.update({ where: { id: d.id }, data: { status } });
        if (d.type === DocumentType.CONSENT && ready) consentDone = true;
      }
    }
    return { consentDone, memberCount: members.length };
  }
}
