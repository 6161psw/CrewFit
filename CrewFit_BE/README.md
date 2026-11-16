# CrewFit_BE

NestJS 11 · Prisma 6 · PostgreSQL 16 · socket.io

## 폴더 구조

도메인별 폴더 = `module / controller / service / repository / dto`.

```
src/
  main.ts, app.module.ts
  config/       env.validation.ts         환경변수 검증
  prisma/       prisma.module, prisma.service
  common/       decorator/ dto/ filter/ interceptor/ types/ utils/
  health/       GET /health
  auth/         구글 로그인, JWT, refresh, dev-login   guard/ types/ dto/
  user/         내 정보, 자소서, 프로필(공개 범위)
  school/       학교 목록
  contest/      공모전 목록·상세·관심·관심 있는 사람
  team/         모집 채팅방(팀) 생성·목록·미리보기·좋아요
  invitation/   참여 요청 / 팀 제안 / 수락·거절
  chat/         socket.io /chat + REST, 시스템 메시지
  submission/   팀 확정 → 제출 서류 → 서명 → 제출 (학생)
  admin/        학교 관리자 사이트 (W-01~07)
                dashboard / contest / team(지원 팀·서류·승인·보완) / forward(운영사 전달) / account(초대·권한)
  badge/        완주 배지 규칙
  storage/      업로드 파일 저장 (로컬 디스크)
prisma/
  schema.prisma, seed.ts
```

요청 흐름: `controller`(라우팅·검증) → `service`(비즈니스 로직·권한) → `repository`(Prisma 쿼리).

## 실행

```bash
docker compose up -d db            # 루트에서
cp .env.example .env
npm install
npx prisma migrate dev --name init # 최초 1회 — 생성된 prisma/migrations 커밋
npm run seed
npm run start:dev                  # Swagger: http://localhost:3000/docs
```

### 구글 키 없이 테스트

`POST /auth/dev-login` `{ "email": "test@gm.gist.ac.kr" }` → accessToken → Swagger 우측 상단 Authorize.
학교 도메인 메일이면 학교 인증 자동. 관리자 테스트: `.env` `SUPER_ADMIN_EMAILS` 에 그 메일 추가.

## 구글 로그인 연결 (Google Cloud 프로젝트 `crewfit-514906`)

1. **API 및 서비스 → OAuth 동의 화면(Google 인증 플랫폼)** → 시작하기
   - 앱 이름 `CrewFit`, 지원 이메일 선택, 대상 **외부**
   - 대상 → 테스트 사용자에 팀원 구글 계정 추가 (게시 전엔 테스트 사용자만 로그인 가능)
2. **클라이언트 → 클라이언트 만들기** → 유형 **웹 애플리케이션**
   - 승인된 JavaScript 원본: `http://localhost:5173`, `http://localhost:5174` (+ 배포 웹 주소)
   - 승인된 리디렉션 URI: `http://localhost:3000/auth/google/callback` (+ `https://<API 도메인>/auth/google/callback`)
3. 발급된 **클라이언트 ID / 보안 비밀번호** → `.env` `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` → 서버 재시작
4. 확인: 브라우저로 `http://localhost:3000/auth/google?client=web`
5. 앱(iOS/Android) 클라이언트 ID 생기면 `GOOGLE_MOBILE_CLIENT_IDS` 에 추가

## 인증 흐름

- 웹: `/auth/google?client=web|admin` → 구글 → `/auth/google/callback` → refresh 쿠키 → `{WEB|ADMIN}_URL/auth/callback` → `POST /auth/refresh` (credentials: include) → accessToken
- 앱: 네이티브 구글 로그인 → `POST /auth/google/token { idToken }`
- 학교 관리자: 로그인 후 `POST /admin-invites/redeem { code }` (초대 코드) → `SCHOOL_ADMIN`
  - 피그마 W-01 '학교 계정(Microsoft) 로그인'은 추후

## 학생 API (요약)

| 화면 | API |
|---|---|
| H-01 홈(공모전) | `GET /contests?scope=school\|region\|national&sort=deadline\|popular\|recommended` |
| H-03 상세 · 하트 | `GET /contests/:id`, `POST/DELETE /contests/:id/interest` |
| H-04 관심 있는 사람 | `GET /contests/:id/interested-users?filter=all\|school\|region&skill=` |
| H-05 프로필 | `GET /users/:id` |
| H-02 모집 채팅 | `GET /teams?scope&sort&liked&openSlots` |
| T-01 팀 미리보기 | `GET /teams/:id` |
| T-02 참여 요청 / H-06 제안 | `POST /teams/:id/applications`, `POST /teams/:id/offers` |
| E-02 채팅 탭 · 받은 제안 | `GET /teams/me`, `GET /invitations?box=received\|sent`, `POST /invitations/:id/accept\|reject\|cancel` |
| T-03 채팅 | socket.io `/chat` (`join`, `send`, 수신 `message`·`team`), `GET/POST /teams/:id/messages` |
| T-04~06 확정·서류·제출 | `POST /teams/:id/confirm`, `GET /teams/:id/submission`, `POST .../documents/:docId/file`, `POST .../signature`, `POST .../submit` |
| E-01 팀 만들기 | `POST /teams` |
| E-03/04 내 정보·자소서 | `GET/PATCH /users/me`, `PATCH /users/me/intro` |

## 학교 관리자 API (`/admin/*`, SCHOOL_ADMIN·SUPER_ADMIN)

| 화면 | API |
|---|---|
| W-02 대시보드 | `GET /admin/dashboard` |
| 대회 공고 / 공고 등록 | `GET/POST /admin/contests`, `PATCH/DELETE /admin/contests/:id` |
| W-03 지원 팀 목록 | `GET /admin/contests/:id/teams?status&q&major&docStatus&size&sort` |
| 엑셀 내보내기(학교 양식) | `GET /admin/contests/:id/export.csv` |
| W-04 팀 상세(서류·처리 기록) | `GET /admin/submissions/:id`, `GET /admin/submissions/:id/documents/:docId/file` |
| 승인 | `POST /admin/submissions/:id/approve` |
| W-05 보완 요청 | `POST /admin/submissions/:id/revision` |
| W-06 운영사 전달 | `GET /admin/contests/:id/forward/preview`, `POST /admin/contests/:id/forward` |
| W-07 전달 완료 · 되돌리기 | `GET /admin/forward-batches/:id/file`, `POST /admin/forward-batches/:id/revert` |
| 서류 보관함 | `GET /admin/documents` |
| 완주·수상 → 배지 | `PATCH /admin/teams/:id/outcome` |
| 설정 · 초대 | `GET/PATCH /admin/me`, `POST/GET /admin/invites` |
| (SUPER) 사용자·권한·라이선스 | `GET /admin/users`, `PATCH /admin/users/:id/role`, `PATCH /admin/schools/:id/license` |

제출 상태: `PREPARING`(서류 준비) → `SUBMITTED`(검토 대기) → `APPROVED`(승인) → `FORWARDED`(전달 완료). 보완 요청 시 `REVISION_REQUESTED` → 팀 수정 후 재제출.

## TODO

- 임베딩 추천 (현재 키워드 매칭)
- 운영사 메일 발송 (현재 CSV 다운로드), xlsx 양식
- 관리자 Microsoft 로그인
- 파일 저장소 S3
