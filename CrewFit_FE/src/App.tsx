import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { tokenStore } from './api/client';
import { isAdminRole, useMe } from './auth/auth';
import { Loading } from './components/ui';
import { AdminContestFormPage, AdminContestsPage } from './features/admin/AdminContestsPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminDocumentsPage } from './features/admin/AdminDocumentsPage';
import { AdminForwardPage } from './features/admin/AdminForwardPage';
import { AdminLayout } from './features/admin/AdminLayout';
import { AdminLoginPage } from './features/admin/AdminLoginPage';
import { AdminSettingsPage } from './features/admin/AdminSettingsPage';
import { AdminTeamsPage } from './features/admin/AdminTeamsPage';
import { ChatListPage } from './features/chat/ChatListPage';
import { ChatRoomPage } from './features/chat/ChatRoomPage';
import { ContestDetailPage } from './features/contest/ContestDetailPage';
import { InterestedUsersPage } from './features/contest/InterestedUsersPage';
import { HomePage } from './features/home/HomePage';
import { AuthCallbackPage } from './features/login/AuthCallbackPage';
import { LoginPage } from './features/login/LoginPage';
import { IntroEditPage } from './features/me/IntroEditPage';
import { MePage } from './features/me/MePage';
import { ProfileEditPage } from './features/me/ProfileEditPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { SubmissionPage } from './features/submission/SubmissionPage';
import { CreateTeamPage } from './features/team/CreateTeamPage';
import { TeamPreviewPage } from './features/team/TeamPreviewPage';

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const loc = useLocation();
  const { data: me, isLoading, isError } = useMe();
  const loginPath = admin ? '/admin/login' : '/login';
  if (!tokenStore.get() || isError) return <Navigate to={loginPath} replace state={{ from: loc.pathname }} />;
  if (isLoading || !me) return <Loading />;
  if (admin && !isAdminRole(me)) return <Navigate to="/admin/login" replace state={{ notAdmin: true }} />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* 학생 앱 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage to="/" />} />
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/contests/:id" element={<RequireAuth><ContestDetailPage /></RequireAuth>} />
      <Route path="/contests/:id/interested" element={<RequireAuth><InterestedUsersPage /></RequireAuth>} />
      <Route path="/users/:id" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/teams/new" element={<RequireAuth><CreateTeamPage /></RequireAuth>} />
      <Route path="/teams/:id" element={<RequireAuth><TeamPreviewPage /></RequireAuth>} />
      <Route path="/teams/:id/submission" element={<RequireAuth><SubmissionPage /></RequireAuth>} />
      <Route path="/chats" element={<RequireAuth><ChatListPage /></RequireAuth>} />
      <Route path="/chats/:id" element={<RequireAuth><ChatRoomPage /></RequireAuth>} />
      <Route path="/me" element={<RequireAuth><MePage /></RequireAuth>} />
      <Route path="/me/edit" element={<RequireAuth><ProfileEditPage /></RequireAuth>} />
      <Route path="/me/intro" element={<RequireAuth><IntroEditPage /></RequireAuth>} />

      {/* 학교 관리자 (크루핏 for School) */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/auth/callback" element={<AuthCallbackPage to="/admin" />} />
      <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="contests" element={<AdminContestsPage />} />
        <Route path="contests/new" element={<AdminContestFormPage />} />
        <Route path="contests/:id/edit" element={<AdminContestFormPage />} />
        <Route path="contests/:id/teams" element={<AdminTeamsPage />} />
        <Route path="teams" element={<AdminTeamsPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
        <Route path="forward" element={<AdminForwardPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
