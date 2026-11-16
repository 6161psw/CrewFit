-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SCHOOL_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "ContestScope" AS ENUM ('SCHOOL', 'REGION', 'NATIONAL');

-- CreateEnum
CREATE TYPE "ContestCategory" AS ENUM ('HACKATHON', 'STARTUP', 'RESEARCH', 'DEMO', 'IDEA', 'ETC');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('RECRUITING', 'CONFIRMED', 'SUBMITTED', 'COMPLETED', 'DISBANDED');

-- CreateEnum
CREATE TYPE "MemberOutcome" AS ENUM ('NONE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('APPLY', 'OFFER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ROSTER', 'ENROLLMENT', 'APPLICATION_FORM', 'FILE', 'CONSENT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'READY');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PREPARING', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'FORWARDED');

-- CreateEnum
CREATE TYPE "RevisionReason" AS ENUM ('OVER_LENGTH', 'FORMAT_MISMATCH', 'MISSING_SIGNATURE', 'INSUFFICIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ForwardFormat" AS ENUM ('OPERATOR', 'SCHOOL');

-- CreateEnum
CREATE TYPE "SubmissionLogType" AS ENUM ('CONFIRMED', 'FILE_UPLOADED', 'SIGNED_ALL', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'FORWARDED', 'FORWARD_REVERTED');

-- CreateEnum
CREATE TYPE "BadgeCode" AS ENUM ('FIRST_COMPLETION', 'THREE_COMPLETIONS', 'STARTUP_COMPLETION', 'HACKATHON_COMPLETION', 'AWARD');

-- CreateTable
CREATE TABLE "school" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "emailDomains" TEXT[],
    "licenseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "schoolId" INTEGER,
    "schoolEmail" TEXT,
    "schoolVerifiedAt" TIMESTAMP(3),
    "adminSchoolId" INTEGER,
    "adminDepartment" TEXT,
    "major" TEXT,
    "admissionYear" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "skills" TEXT[],
    "preferBadgeHidden" BOOLEAN NOT NULL DEFAULT false,
    "introOneLiner" TEXT,
    "introRole" TEXT,
    "introExperience" TEXT,
    "introUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "ContestCategory" NOT NULL DEFAULT 'ETC',
    "tags" TEXT[],
    "scope" "ContestScope" NOT NULL,
    "schoolId" INTEGER,
    "region" TEXT,
    "minTeamSize" INTEGER NOT NULL DEFAULT 1,
    "maxTeamSize" INTEGER NOT NULL DEFAULT 5,
    "applyStartAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3) NOT NULL,
    "submitTo" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorEmail" TEXT,
    "linkUrl" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_required_document" (
    "id" SERIAL NOT NULL,
    "contestId" INTEGER NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contest_required_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_interest" (
    "userId" UUID NOT NULL,
    "contestId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_interest_pkey" PRIMARY KEY ("userId","contestId")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "contestId" INTEGER NOT NULL,
    "leaderId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "badgeHidden" BOOLEAN NOT NULL DEFAULT false,
    "status" "TeamStatus" NOT NULL DEFAULT 'RECRUITING',
    "award" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_role" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "team_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "teamId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" INTEGER,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "MemberOutcome" NOT NULL DEFAULT 'NONE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "team_like" (
    "userId" UUID NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_like_pkey" PRIMARY KEY ("userId","teamId")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "roleId" INTEGER,
    "type" "InvitationType" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "senderId" UUID,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PREPARING',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "forwardedAt" TIMESTAMP(3),
    "reviewerId" UUID,
    "revisionReasons" "RevisionReason"[],
    "revisionMessage" TEXT,
    "revisionDeadline" TIMESTAMP(3),
    "forwardBatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_document" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "requiredDocumentId" INTEGER,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "revisionRequested" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_signature" (
    "submissionId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_signature_pkey" PRIMARY KEY ("submissionId","userId")
);

-- CreateTable
CREATE TABLE "user_badge" (
    "userId" UUID NOT NULL,
    "code" "BadgeCode" NOT NULL,
    "teamId" INTEGER,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badge_pkey" PRIMARY KEY ("userId","code")
);

-- CreateTable
CREATE TABLE "submission_log" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "type" "SubmissionLogType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forward_batch" (
    "id" SERIAL NOT NULL,
    "contestId" INTEGER NOT NULL,
    "createdById" UUID,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "format" "ForwardFormat" NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "forward_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invite" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "department" TEXT,
    "createdById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedById" UUID,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_name_key" ON "school"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_googleId_key" ON "user"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_schoolEmail_key" ON "user"("schoolEmail");

-- CreateIndex
CREATE INDEX "user_schoolId_idx" ON "user"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_tokenHash_key" ON "refresh_token"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "refresh_token"("userId");

-- CreateIndex
CREATE INDEX "contest_scope_schoolId_idx" ON "contest"("scope", "schoolId");

-- CreateIndex
CREATE INDEX "contest_deadline_idx" ON "contest"("deadline");

-- CreateIndex
CREATE INDEX "contest_interest_contestId_idx" ON "contest_interest"("contestId");

-- CreateIndex
CREATE INDEX "team_contestId_status_idx" ON "team"("contestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "team_role_teamId_name_key" ON "team_role"("teamId", "name");

-- CreateIndex
CREATE INDEX "team_member_userId_idx" ON "team_member"("userId");

-- CreateIndex
CREATE INDEX "invitation_userId_status_idx" ON "invitation"("userId", "status");

-- CreateIndex
CREATE INDEX "invitation_teamId_status_idx" ON "invitation"("teamId", "status");

-- CreateIndex
CREATE INDEX "chat_message_teamId_id_idx" ON "chat_message"("teamId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_teamId_key" ON "submission"("teamId");

-- CreateIndex
CREATE INDEX "submission_contestId_status_idx" ON "submission"("contestId", "status");

-- CreateIndex
CREATE INDEX "submission_log_submissionId_idx" ON "submission_log"("submissionId");

-- CreateIndex
CREATE INDEX "forward_batch_contestId_idx" ON "forward_batch"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invite_code_key" ON "admin_invite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invite_usedById_key" ON "admin_invite"("usedById");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_adminSchoolId_fkey" FOREIGN KEY ("adminSchoolId") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest" ADD CONSTRAINT "contest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest" ADD CONSTRAINT "contest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_required_document" ADD CONSTRAINT "contest_required_document_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_interest" ADD CONSTRAINT "contest_interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_interest" ADD CONSTRAINT "contest_interest_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role" ADD CONSTRAINT "team_role_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "team_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_like" ADD CONSTRAINT "team_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_like" ADD CONSTRAINT "team_like_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "team_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_forwardBatchId_fkey" FOREIGN KEY ("forwardBatchId") REFERENCES "forward_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_document" ADD CONSTRAINT "submission_document_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_document" ADD CONSTRAINT "submission_document_requiredDocumentId_fkey" FOREIGN KEY ("requiredDocumentId") REFERENCES "contest_required_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_signature" ADD CONSTRAINT "submission_signature_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_signature" ADD CONSTRAINT "submission_signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_log" ADD CONSTRAINT "submission_log_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_log" ADD CONSTRAINT "submission_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forward_batch" ADD CONSTRAINT "forward_batch_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forward_batch" ADD CONSTRAINT "forward_batch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invite" ADD CONSTRAINT "admin_invite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invite" ADD CONSTRAINT "admin_invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invite" ADD CONSTRAINT "admin_invite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
