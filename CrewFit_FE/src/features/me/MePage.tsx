import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Eye, Heart, LogOut, Pencil, Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { isAdminRole, useLogout, useMe } from '../../auth/auth';
import { BottomNav } from '../../components/BottomNav';
import { Button, Card, Loading, Screen, TopBar } from '../../components/ui';
import { ProfileBadges, ProfileEssay, ProfileHead, ProfileHistory } from '../profile/ProfileView';

/** E-03 내 정보 */
export function MePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const logout = useLogout();
  const { data: me } = useMe();
  const interests = useQuery({ queryKey: ['me', 'interests'], queryFn: () => api.get<{ id: number; title: string }[]>('/users/me/interests') });
  const toggle = useMutation({
    mutationFn: (v: boolean) => api.patch('/users/me', { preferBadgeHidden: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  if (!me) return <Loading />;

  return (
    <Screen bottom={<BottomNav />}>
      <TopBar
        title="내 정보"
        back={false}
        right={
          <button onClick={() => nav('/me/edit')} aria-label="프로필 수정" className="p-1">
            <Settings size={22} />
          </button>
        }
      />
      <div className="flex flex-col gap-3 px-5">
        <ProfileHead
          p={me}
          extra={
            !me.schoolVerified && (
              <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs">학교 구글 계정으로 로그인하면 학교 인증이 자동으로 끝나요</p>
            )
          }
        />
        <ProfileEssay
          p={me}
          right={
            <Button size="sm" onClick={() => nav('/me/intro')}>
              <Pencil size={14} /> 작성하기
            </Button>
          }
        />
        <p className="-mt-1 flex items-center gap-1.5 px-1 text-xs text-muted">
          <Eye size={14} /> 관심 표시한 공모전의 사람들이 볼 수 있어요
        </p>
        <ProfileHistory p={me} />
        <Card className="flex items-center gap-2 py-3.5">
          <Heart size={18} className="fill-danger text-danger" />
          <span className="flex-1 text-sm font-semibold">관심 공모전 {interests.data?.length ?? me.interestCount}개</span>
          <ChevronRight size={16} className="text-muted" />
        </Card>
        <ProfileBadges p={me} />
        <Card className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">배지 숨김 방 우선 보기</p>
            <p className="text-xs text-sub">배지 없이 경험 쌓고 싶을 때 켜 두세요</p>
          </div>
          <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={me.preferBadgeHidden} onChange={(e) => toggle.mutate(e.target.checked)} />
        </Card>
        {isAdminRole(me) && (
          <Button variant="soft" onClick={() => nav('/admin')}>
            학교 관리자 사이트로
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={async () => {
            await logout();
            nav('/login', { replace: true });
          }}
        >
          <LogOut size={16} /> 로그아웃
        </Button>
      </div>
    </Screen>
  );
}
