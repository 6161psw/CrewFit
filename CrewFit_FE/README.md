# CrewFit_FE

React 19 · Vite 6 · TypeScript · Tailwind 4 · React Router 7 · TanStack Query 5 · socket.io-client

한 앱에 학생 화면(모바일) + 학교 관리자 화면(`/admin`, PC).

## 실행

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173  (관리자: /admin)
```

백엔드(`CrewFit_BE`) 먼저 실행. 백엔드 `.env`:
```
WEB_URL=http://localhost:5173
ADMIN_URL=http://localhost:5173/admin
DEV_LOGIN_ENABLED=true
```

## 구조

```
src/
  main.tsx, App.tsx (라우트), index.css (피그마 v4 색 토큰)
  api/         client.ts (fetch + 토큰 자동 재발급), types.ts
  auth/        로그인 · useMe
  components/  ui.tsx (Button, Chip, Sheet, Modal, ScopeTabs, SortMenu …), BottomNav
  lib/         format.ts (날짜·D-day·클래스)
  features/
    login/       S-01 시작, 구글 콜백
    home/        H-01 공모전 · H-02 모집 채팅 (FAB 로 전환)
    contest/     H-03 상세 · H-04 관심 있는 사람
    profile/     H-05 프로필 · H-06 팀 제안 시트
    team/        T-01 팀 미리보기 · T-02 참여 요청 · E-01 팀 만들기
    chat/        E-02 채팅 탭(받은 제안) · T-03 채팅방(socket.io)
    submission/  T-04/05 제출 서류 · T-06 제출 완료
    me/          E-03 내 정보 · E-04 자소서 · 기본 프로필
    admin/       W-01 로그인 · W-02 대시보드 · W-03/04/05 지원 팀·상세·보완 요청 · W-06/07 운영사 전달 · 공고 · 서류 보관함 · 설정
```

## 메모

- 아이콘: lucide-react (피그마 아이콘과 같은 계열). 피그마 SVG 로 바꾸려면 `src/assets` 에 내보내 교체.
- 학교 메일 인증 화면(S-02~05): 보류. 학교 구글 계정이면 자동 인증.
- 앱: Flutter 별도 (`../CrewFit_APP`).
