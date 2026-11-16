# 크루핏(CrewFit) MVP 설계

작성일 2026-11-13 · 시연 목표일 2026-11-23 · 상태: 검토 대기

## 1. 목적과 성공 기준

**목적:** 11/23 심사에서 "나와 가까운 사람·대외활동을 연결하고, 팀 확정까지 앱 안에서 끝나며, 학교는 명단을 자동으로 받는다"를 실제로 동작하는 모습으로 보여준다.

**성공 기준:** 심사위원이 폰으로 QR을 찍어 아래 흐름을 끝까지 따라갈 수 있다.
1. 구글 계정으로 로그인한다.
2. '우리 학교' 탭에서 교내 대회를 본다. ('연합', '전국' 탭도 있다)
3. 팀을 만들고 빈 역할을 올린다. 다른 사용자가 지원하고 팀장이 수락한다.
4. 팀 채팅방에서 대화한다.
5. 팀장이 '팀 확정'을 누르면 명단이 학교로 제출된다.
6. 학교 담당자 화면에서 제출된 명단을 확인하고 CSV로 내려받는다.

**핵심 가치(가까움):** 대회 목록의 기본 탭은 '우리 학교'이고, 연합→전국 순으로 넓어진다.

## 2. 범위

| 포함 (11/23까지) | 제외 (화면 시안 또는 후속) |
|---|---|
| 구글 로그인, 프로필(전공·기술·수상) | 마이크로소프트 학교 계정 인증 |
| 대회 목록 3탭 (우리 학교/연합/전국) | 공고 크롤러, 번역, LLM 요약 |
| 팀 만들기, 빈 역할, 지원·수락 | 푸시 알림 |
| 팀 채팅 (실시간) | 완주 배지·완주율 (화면 시안만) |
| 팀 확정 → 명단 자동 제출 | 결제, 기업(B2B) 기능 |
| 학교 담당자 대시보드 (조회, CSV) | Redis, 큐, 다중 서버 |
| PWA 설치, HTTPS 배포, 시연 데이터 | 앱스토어 배포 |

## 3. 아키텍처

- **프론트(`CrewFit_FE`):** React 19 + Vite + TanStack Router/Query + Tailwind 4 + Zustand. 구조와 규칙은 ziggle-fe를 따른다(MVVM, `features/*/{models,viewmodels,views}`, kebab-case, openapi-fetch로 타입 자동 생성). 모바일 우선 PWA이고, 학교 대시보드는 같은 앱의 `/admin` 경로에 둔다.
- **백엔드(`CrewFit_BE`):** NestJS 11 + Prisma + PostgreSQL. 지글 BE의 구조(모듈 분리, env 검증, JWT, Swagger)를 참고하되 코드는 새로 쓴다(9절 라이선스 참고).
- **서버 1대, Redis 없음.** 리프레시 토큰과 채팅 메시지는 모두 PostgreSQL에 저장한다.
- **로컬 개발:** `docker-compose.yml`로 PostgreSQL을 띄운다.

```
CrewFit/
├─ CrewFit_BE/   NestJS (src/ auth, user, school, contest, team, chat, roster, admin, health)
├─ CrewFit_FE/   React PWA (src/features/ auth, contest, team, chat, profile, admin)
└─ docs/superpowers/specs/
```

## 4. 데이터 모델 (Prisma, 초안)

- **School** `id, name, emailDomain, msTenantId?` : 시연은 GIST 1개와 연합용 시드 학교 몇 개.
- **User** `id, provider, providerSub, email, name, schoolId, major, skills[], awards[]` : `(provider, providerSub)` 유니크.
- **RefreshToken** `tokenHash, userId, expiresAt`.
- **Contest** `id, title, scope(SCHOOL|ALLIANCE|NATIONAL), schoolId?, deadline, url`.
- **Team** `id, contestId, leaderId, name, status(OPEN|CONFIRMED), confirmedAt?`.
- **TeamRole** `id, teamId, title, description` : 빈 역할(인재상).
- **Application** `id, roleId, userId, message, status(PENDING|ACCEPTED|REJECTED)`.
- **TeamMember** `teamId, userId, roleId?` : 수락 시 생성, 팀장도 멤버.
- **Message** `id, teamId, userId, body, createdAt` : 인덱스 `(teamId, createdAt)`.
- 명단은 별도 테이블 없이 `CONFIRMED` 팀의 `TeamMember`로 조회한다. 팀 확정은 트랜잭션으로 상태 변경과 `confirmedAt` 기록을 처리한다.

## 5. 인증

- 로그인 제공자를 갈아끼울 수 있게 `AuthProvider` 인터페이스(`verify(idToken) → {provider, sub, email, orgId?}`)를 둔다. MVP 구현체는 Google이다.
- 흐름: 프론트에서 구글 로그인(ID 토큰 획득) → `POST /auth/google` → 서버가 `google-auth-library`로 검증 → 사용자 조회/생성 → 자체 JWT(액세스 6시간)와 리프레시 토큰(30일, DB 저장) 발급.
- **학교 결정:** 이메일 도메인이 `School.emailDomain`과 일치하면 자동 지정하고, 아니면 가입 직후 학교를 선택한다. 구글 로그인만으로는 학교 소속이 증명되지 않으므로 시연에서는 "학교 계정 인증은 다음 단계"로 설명한다.
- **후속:** Microsoft Entra(OIDC)로 `tid`가 등록된 학교 테넌트인 경우만 허용한다. 식별 키는 `tid+oid`를 쓴다.

## 6. 채팅

- 팟쥐 방식의 순수 WebSocket (`@nestjs/platform-ws`, 경로 `/ws`).
- 연결 → 서버가 인증 요청 → 클라이언트가 액세스 토큰 전송 → 30초 안에 인증하지 않으면 종료.
- `join_team` 시 팀 멤버인지 확인하고, `send_chat`은 `Message`로 저장한 뒤 같은 팀의 접속자에게 브로드캐스트한다.
- 이전 대화는 `GET /teams/:id/messages?cursor=` (REST)로 불러온다.
- MVP에서는 ack/재전송, 이벤트 소싱, 푸시를 하지 않는다.

## 7. 주요 API (초안)

`POST /auth/google` · `POST /auth/refresh` · `GET/PATCH /me`
`GET /contests?scope=` · `POST/GET /teams` · `POST /teams/:id/roles`
`POST /roles/:id/applications` · `PATCH /applications/:id` (수락/거절)
`POST /teams/:id/confirm` · `GET /teams/:id/messages` · `WS /ws`
`GET /admin/rosters` · `GET /admin/rosters.csv` (학교 담당자 권한)

## 8. 프론트 화면 (모바일 우선)

로그인 · 프로필 · 대회(탭: 우리 학교/연합/전국) · 대회 상세 → 팀 목록 · 팀 만들기(역할 추가) · 팀 상세(지원/수락) · 채팅방 · 내 팀 · 팀 확정 확인 · `/admin` 명단 목록 + CSV.
PWA: `vite-plugin-pwa`, 매니페스트, 아이콘, HTTPS 필수.

## 9. 위험과 결정 사항

- **라이선스:** 지글 BE는 AGPL-3.0이다(package.json 기준). 코드를 복사해 상용 서비스에 넣으면 AGPL 의무가 따라올 수 있으므로, 구조와 개념만 참고하고 코드는 새로 작성한다. 팟쥐 BE는 README상 MIT다. 지글 FE와 플러터 저장소의 라이선스는 확인하지 못했다. 코드를 직접 가져오기 전에 확인한다.
- **구글 로그인 차단:** 카카오톡 인앱 브라우저에서는 구글 로그인이 막힌다. 시연 안내에 "크롬/사파리로 열기"를 넣는다.
- **네트워크:** 대회장 와이파이가 불안할 수 있어 핫스팟과 시연 영상을 준비한다.
- **일정:** 11/13~11/23 10일. 아래 순서의 앞 단계가 밀리면 6번(대시보드)을 화면 시안으로 대체한다.
- **미결정 (구현 계획 전에 확정):** 배포 위치(HTTPS 필요). 후보는 클라우드 호스팅 또는 임시 터널이고, 시연 안정성이 기준이다.

## 10. 마일스톤 (초안)

1. 11/13~15: 뼈대(BE/FE), DB, 구글 로그인, Swagger→타입 생성
2. 11/16~17: 학교·프로필·대회(3탭, 시드)
3. 11/18~19: 팀·역할·지원/수락
4. 11/20~21: 채팅, 팀 확정, 명단
5. 11/22: 학교 대시보드, PWA, 배포, 시연 데이터, 리허설
6. 11/23: 시연

## 11. 테스트

- 백엔드: 인증 검증, 권한(팀 멤버만 채팅, 팀장만 확정, 학교 담당자만 `/admin`), 팀 확정 트랜잭션을 Jest로 테스트한다.
- 전체 흐름은 위 1절의 6단계를 시연 전 리허설 체크리스트로 수동 점검한다.
