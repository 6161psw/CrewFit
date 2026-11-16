/** 백엔드 응답 타입 (CrewFit_BE Swagger 기준, 필요한 필드만) */

export type Scope = 'school' | 'region' | 'national';
export type Role = 'USER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN';
export type TeamStatus = 'RECRUITING' | 'CONFIRMED' | 'SUBMITTED' | 'COMPLETED' | 'DISBANDED';
export type SubmissionStatus = 'PREPARING' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'FORWARDED';
export type DocumentType = 'ROSTER' | 'ENROLLMENT' | 'APPLICATION_FORM' | 'FILE' | 'CONSENT';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface School {
  id: number;
  name?: string;
  shortName: string;
  region: string;
}

export interface UserSummary {
  id: string;
  name: string;
  picture: string | null;
  school: School | null;
  schoolVerified: boolean;
  major: string | null;
  admissionYear: number | null;
  skills: string[];
  completionRate: number | null;
  badgeCount: number | null;
}

export interface Badge {
  code: string;
  label: string;
  description: string;
  awardedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  picture: string | null;
  school: School | null;
  schoolVerified: boolean;
  major: string | null;
  admissionYear: number | null;
  skills: string[];
  intro: { oneLiner: string | null; role: string | null; experience: string | null; updatedAt: string | null };
  stats: { completionRate: number | null; badgeCount: number; teamCount: number; contestCount: number; awardCount: number };
  badges: Badge[];
  history: {
    teamId: number;
    teamName: string;
    teamStatus: TeamStatus;
    role: string | null;
    outcome: string;
    award: string | null;
    contest: { id: number; title: string; categoryLabel: string };
  }[];
}

export interface Me extends Profile {
  email: string;
  gender: 'MALE' | 'FEMALE' | 'UNDISCLOSED';
  preferBadgeHidden: boolean;
  role: Role;
  adminSchoolId: number | null;
  interestCount: number;
}

export interface ContestCard {
  id: number;
  title: string;
  organizer: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  scope: 'SCHOOL' | 'REGION' | 'NATIONAL';
  school: { id: number; shortName: string } | null;
  region: string | null;
  deadline: string;
  dDay: number;
  minTeamSize: number;
  maxTeamSize: number;
  interestCount: number;
  recruitingTeamCount: number;
  isInterested: boolean;
}

export interface ContestDetail extends ContestCard {
  description: string;
  submitTo: string;
  linkUrl: string | null;
  requiredDocuments: { id: number; type: DocumentType; title: string; description: string | null }[];
  myTeam: { id: number; name: string; status: TeamStatus } | null;
}

export interface LastMessage {
  content: string;
  createdAt: string;
  senderName: string | null;
}

export interface TeamCard {
  id: number;
  name: string;
  description: string;
  badgeHidden: boolean;
  status: TeamStatus;
  contest: { id: number; title: string; categoryLabel: string; deadline: string };
  leader: UserSummary;
  memberCount: number;
  capacity: number;
  openCount: number;
  openRoles: { id: number; name: string; open: number }[];
  likeCount: number;
  isLiked: boolean;
  lastMessage: LastMessage | null;
  isLeader?: boolean;
}

export interface TeamDetail {
  id: number;
  name: string;
  description: string;
  badgeHidden: boolean;
  status: TeamStatus;
  leaderId: string;
  contest: { id: number; title: string; categoryLabel: string; deadline: string; submitTo: string; minTeamSize: number; maxTeamSize: number };
  roles: { id: number; name: string; capacity: number; filled: number; open: number; members: { id: string; name: string; isLeader: boolean }[] }[];
  members: (UserSummary & { role: { id: number; name: string } | null; isLeader: boolean })[];
  memberCount: number;
  capacity: number;
  openCount: number;
  likeCount: number;
  isLiked: boolean;
  recentMessage: LastMessage | null;
  submission: { id: number; status: SubmissionStatus } | null;
  me: { isMember: boolean; isLeader: boolean; pendingInvitation: { id: number; type: 'APPLY' | 'OFFER'; roleId: number | null } | null };
}

export interface Invitation {
  id: number;
  type: 'APPLY' | 'OFFER';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
  direction: 'received' | 'sent';
  message: string;
  createdAt: string;
  role: { id: number; name: string } | null;
  team: { id: number; name: string; status: TeamStatus; contest: { id: number; title: string }; leader: { id: string; name: string } };
  user: UserSummary;
}

export interface ChatMessage {
  id: number;
  teamId: number;
  type: 'TEXT' | 'SYSTEM';
  content: string;
  createdAt: string;
  sender: { id: string; name: string; picture: string | null } | null;
}

export interface SubmissionView {
  id: number;
  teamId: number;
  teamName: string;
  leader: { id: string; name: string };
  status: SubmissionStatus;
  contest: { id: number; title: string; submitTo: string };
  members: {
    id: string;
    name: string;
    role: string | null;
    isLeader: boolean;
    school: string | null;
    major: string | null;
    admissionYear: number | null;
    schoolVerified: boolean;
    signed: boolean;
    firstTime: boolean;
    contact?: string;
  }[];
  allSchoolVerified: boolean;
  documents: {
    id: number;
    type: DocumentType;
    title: string;
    description: string | null;
    status: 'PENDING' | 'READY';
    auto: boolean;
    fileName: string | null;
    fileSize: number | null;
    revisionRequested: boolean;
    signedCount?: number;
  }[];
  readyCount: number;
  totalCount: number;
  canSubmit: boolean;
  mySigned?: boolean;
  submittedAt: string | null;
  revision: { reasons: { code: string; label: string }[]; message: string | null; deadline: string | null } | null;
  timeline: { step: string; label: string; at: string | null; done: boolean; revision?: boolean }[];
  logs?: { type: string; message: string; at: string }[];
}
