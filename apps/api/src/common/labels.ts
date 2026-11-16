import { BadgeCode, ContestCategory } from '@prisma/client';

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
