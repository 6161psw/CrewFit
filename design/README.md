# design

원본: `크루핏 앱 화면 시안_Figma.fig` (이 폴더). 구현 기준 = **v4 학생 앱 + v4 학교 관리자 사이트**.
Figma 에서 열기: 파일 → 가져오기(Import) → .fig 선택.
프론트 단계에서 피그마 공유 링크 → Figma 커넥터로 화면별 구조/토큰 추출.

## 토큰 (시안 기준, 확정 전)

| 이름 | 값 |
|---|---|
| primary (크루핏 그린) | `#1E6B52` |
| mint | `#4FA383` |
| amber (나/방장 강조) | `#F5A524` |
| 폰트 | IBM Plex Sans KR Bold, 영문 Inter |

## 화면 ↔ API

| 화면 | API |
|---|---|
| S-01~05 시작·학교 인증 | (보류) 구글 로그인 + 학교 도메인 자동 인증 |
| H-01 홈(공모전) 탭: 내 학교/내 지역/전국, 정렬: 마감임박/인기순/AI추천순 | `GET /contests?scope&sort` |
| H-02 홈(모집 채팅) 정렬 + 내 좋아요/모집 인원 | `GET /teams?scope&sort&openSlots` |
| H-03 공모전 상세, 하트 | `GET /contests/:id`, `POST/DELETE /contests/:id/interest` |
| H-04 관심 있는 사람 (전체/우리 학교/내 지역, 기술 검색) | `GET /contests/:id/interested-users` |
| H-05 / T-07 프로필 상세 | `GET /users/:id` |
| H-06 팀 제안 시트 | `POST /teams/:id/offers` |
| T-01 팀 미리보기 | `GET /teams/:id` |
| T-02 참여 요청 시트 | `POST /teams/:id/applications` |
| T-03 채팅방 | socket.io `/chat`, `GET/POST /teams/:id/messages` |
| T-04/05 제출 서류 | `POST /teams/:id/confirm`, `GET /teams/:id/submission`, 파일 업로드, 서명 |
| T-06 제출 완료 · 진행 상태 | `POST /teams/:id/submission/submit` |
| E-01 팀 만들기 | `POST /teams` |
| E-02 채팅 탭 · 받은 제안 | `GET /teams/me`, `GET /invitations?box=received`, accept/reject |
| E-03 내 정보 / E-04 자소서 | `GET/PATCH /users/me`, `PATCH /users/me/intro` |

## 학교 관리자 사이트 (W) ↔ API

| 화면 | API |
|---|---|
| W-01 로그인 | 구글 로그인(`/auth/google?client=admin`) + `POST /admin-invites/redeem` (Microsoft 로그인은 추후) |
| W-02 대시보드 | `GET /admin/dashboard` |
| W-03 지원 팀 목록 | `GET /admin/contests/:id/teams` |
| W-04 팀 상세 | `GET /admin/submissions/:id` |
| W-05 보완 요청 | `POST /admin/submissions/:id/revision` |
| W-06 운영사 전달 | `GET /admin/contests/:id/forward/preview`, `POST /admin/contests/:id/forward` |
| W-07 전달 완료 | `POST /admin/forward-batches/:id/revert` (되돌리기) |
