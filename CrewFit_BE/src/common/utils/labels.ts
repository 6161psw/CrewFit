import { BadgeCode, ContestCategory, RevisionReason, SubmissionStatus } from '@prisma/client';

export const CATEGORY_LABEL: Record<ContestCategory, string> = {
  HACKATHON: '해커톤',
  STARTUP: '창업',
  RESEARCH: '연구',
  DEMO: '데모',
  IDEA: '아이디어',
  ETC: '기타',
};

export const BADGE_LABEL: Record<BadgeCode, { label: string; description: string }> = {
  FIRST_COMPLETION: { label: '첫 완주', description: '처음으로 대회를 끝까지 완주' },
  THREE_COMPLETIONS: { label: '3회 완주', description: '팀 프로젝트 3회 완주' },
  STARTUP_COMPLETION: { label: '창업 완주', description: '창업경진대회 완주' },
  HACKATHON_COMPLETION: { label: '해커톤 완주', description: '해커톤 완주' },
  AWARD: { label: '수상', description: '대회 수상' },
};

export const REVISION_REASON_LABEL: Record<RevisionReason, string> = {
  OVER_LENGTH: '분량 초과',
  FORMAT_MISMATCH: '학교 양식과 다름',
  MISSING_SIGNATURE: '서명 누락',
  INSUFFICIENT: '내용 불충분',
  OTHER: '기타',
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  PREPARING: '서류 준비 중',
  SUBMITTED: '검토 대기',
  REVISION_REQUESTED: '보완 요청',
  APPROVED: '승인',
  FORWARDED: '전달 완료',
};
