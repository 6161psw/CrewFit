import type { SubmissionStatus } from '../../api/types';

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  PREPARING: '서류 준비',
  SUBMITTED: '검토 대기',
  REVISION_REQUESTED: '보완 요청',
  APPROVED: '승인',
  FORWARDED: '전달 완료',
};

export const STATUS_TONE: Record<SubmissionStatus, 'amber' | 'red' | 'green' | 'gray' | 'dark'> = {
  PREPARING: 'gray',
  SUBMITTED: 'amber',
  REVISION_REQUESTED: 'red',
  APPROVED: 'green',
  FORWARDED: 'dark',
};

export interface Dashboard {
  admin: { name?: string; department?: string | null; school: { id: number; name: string; shortName: string } | null; licenseExpiresAt: string | null };
  today: { newSubmissions: number; needReview: number };
  activeContests: { total: number; school: number; region: number; national: number };
  semester: { teams: number; students: number };
  review: { count: number; oldestSubmittedAt: string | null };
  forwarded: { teams: number; latest: { contestTitle: string; teamCount: number; createdAt: string } | null };
  contests: {
    id: number;
    title: string;
    organizer: string;
    scope: string;
    deadline: string;
    dDay: number;
    interestCount: number;
    recruitingTeams: number;
    submittedTeams: number;
    docsCompleteTeams: number;
  }[];
  recent: { submissionId: number; teamName: string; contestTitle: string; memberCount: number; submittedAt: string }[];
  last7Days: { date: string; count: number }[];
  autoProcessed: { documents: number; enrollmentReplaced: number };
}

export interface AdminContest {
  id: number;
  title: string;
  organizer: string;
  description: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  scope: 'SCHOOL' | 'REGION' | 'NATIONAL';
  region: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  deadline: string;
  submitTo: string;
  operatorName: string | null;
  operatorEmail: string | null;
  linkUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  source: 'MANUAL' | 'KSTARTUP' | 'WEVITY' | 'GIST';
  school: { shortName: string } | null;
  requiredDocuments: { id: number; type: string; title: string; description: string | null }[];
  _count: { interests: number; teams: number };
}

export interface TeamRow {
  submissionId: number;
  teamId: number;
  teamName: string;
  leader: { name: string; major: string | null; admissionYear: number | null } | null;
  memberCount: number;
  majors: string[];
  docs: { ready: number; total: number; complete: boolean; label: string };
  submittedAt: string | null;
  status: SubmissionStatus;
  statusLabel: string;
  award: string | null;
}

export interface TeamList {
  contest: { id: number; title: string; open: boolean; deadline: string; documentTypeCount: number | null };
  counts: Record<'all' | SubmissionStatus, number>;
  majors: string[];
  items: TeamRow[];
  total: number;
  page: number;
  limit: number;
}

export interface ForwardPreview {
  contest: { id: number; title: string };
  recipient: { name: string; email: string | null };
  format: 'OPERATOR' | 'SCHOOL';
  teamCount: number;
  studentCount: number;
  teams: { submissionId: number; teamName: string; leaderName: string | null; contact: string | null; memberCount: number; documentCount: number }[];
  moreTeams: number;
}

export interface ForwardBatch {
  id: number;
  contestId: number;
  recipientName: string;
  recipientEmail: string | null;
  format: 'OPERATOR' | 'SCHOOL';
  teamCount: number;
  studentCount: number;
  createdAt: string;
  revertedAt: string | null;
  contest?: { id: number; title: string };
  createdBy?: { name: string } | null;
}

export interface AdminMe {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  school: { id: number; name: string; shortName: string } | null;
  licenseExpiresAt: string | null;
}
