-- CreateEnum
CREATE TYPE "ContestSource" AS ENUM ('MANUAL', 'KSTARTUP', 'WEVITY', 'GIST');

-- CreateEnum
CREATE TYPE "CrawlTrigger" AS ENUM ('SCHEDULE', 'MANUAL');

-- AlterTable
ALTER TABLE "contest" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" "ContestSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "crawl_run" (
    "id" SERIAL NOT NULL,
    "source" "ContestSource" NOT NULL,
    "trigger" "CrawlTrigger" NOT NULL,
    "triggeredById" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "crawl_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crawl_run_source_startedAt_idx" ON "crawl_run"("source", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "contest_source_externalId_key" ON "contest"("source", "externalId");
