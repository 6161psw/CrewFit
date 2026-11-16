# CrewFit (크루핏)

학교 인증 기반 대학생 팀빌딩 · 대학 행정 자동화 플랫폼.

## 구조

```
apps/api      NestJS + Prisma + PostgreSQL (백엔드, 웹·앱·운영자 공용 API)
apps/web      학생용 웹 (React, 모바일 반응형/PWA)        — 예정
apps/admin    학교 관계자용 운영자 웹 (React)              — 예정
apps/mobile   앱 (web 을 Capacitor 로 래핑)                — 예정
packages/shared 공용 타입                                  — 예정
design/       피그마 화면 목록 · 디자인 토큰
```

## 빠른 시작 (백엔드)

```bash
docker compose up -d db                 # PostgreSQL
cd apps/api
cp .env.example .env                    # 값 채우기 (GOOGLE_*, JWT_SECRET)
npm install
npx prisma migrate dev --name init      # 최초 1회: 마이그레이션 생성 + 적용
npm run seed                            # 학교 · 샘플 공모전
npm run start:dev                       # http://localhost:3000/docs (Swagger)
```

## 배포 · QR

- QR = URL. 고정 도메인 쓰면 재배포해도 QR 그대로.
- API: `apps/api/Dockerfile` (Render / Railway / Fly.io 등). 시작 시 `prisma migrate deploy` 자동 실행.
- 프론트(web/admin): Vercel 등. QR 은 web 고정 도메인으로 생성.
- 웹·API 도메인이 다르면 `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`.
