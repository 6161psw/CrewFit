import { ContestCategory, ContestScope, ContestSource } from '@prisma/client';

/** 외부에서 긁어온 공고 1건 (Contest 로 upsert) */
export interface CrawledContest {
  externalId: string;
  title: string;
  organizer: string;
  description?: string;
  category: ContestCategory;
  tags: string[];
  scope: ContestScope;
  schoolId?: number | null;
  region?: string | null;
  applyStartAt?: Date | null;
  deadline: Date;
  linkUrl: string;
  submitTo: string;
}

export interface SourceResult {
  items: CrawledContest[];
  /** 파싱 실패·대상 아님 등으로 버린 건수 */
  skipped: number;
}

export interface ContestSourceAdapter {
  readonly key: Exclude<ContestSource, 'MANUAL'>;
  readonly name: string;
  /** env 설정 안 되면 false → 수집 안 함 */
  enabled(): boolean;
  /** 비활성 사유 (관리자 화면 표시) */
  disabledReason?(): string | null;
  fetch(): Promise<SourceResult>;
}

export const CONTEST_SOURCE_ADAPTERS = Symbol('CONTEST_SOURCE_ADAPTERS');
