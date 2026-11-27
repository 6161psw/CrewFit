# CrewFit (크루핏)

학교 인증 기반 대학생 팀빌딩 · 대학 행정 자동화 플랫폼.

```
CrewFit_BE/   백엔드 — NestJS + Prisma + PostgreSQL (학생 웹·앱·학교 관리자 사이트 공용 API)
CrewFit_FE/   프론트 — React 한 앱: 학생(모바일) + 학교 관리자(/admin)
CrewFit_APP/  안드로이드/iOS 앱 — Flutter (BLoC·freezed·get_it/injectable·auto_route·retrofit) ⏸ 보류 (코드 유지, 개발 중단)
design/       피그마 원본(.fig) · 디자인 토큰 · 화면↔API 표
docs/         기획 문서
docker-compose.yml   로컬 DB + API + FE(dev)
```

## 빠른 시작

```bash
docker compose up -d db
cd CrewFit_BE
cp .env.example .env          # JWT_SECRET 만 바꿔도 실행됨 (구글은 나중에)
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev             # http://localhost:3000/docs
```

```bash
cd CrewFit_FE
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173 · 관리자 /admin
```

윈도우 Smart App Control 이 vite(rollup) 막으면 → 도커로 FE:

```bash
docker compose up fe          # http://localhost:5173
```

앱: `CrewFit_APP/README.md` (폰 무선 디버깅)

자세한 내용: `CrewFit_BE/README.md`, `CrewFit_FE/README.md`, `CrewFit_APP/README.md`

## 외부 공고 자동 수집

- 소스: K-Startup 사업공고 API · 위비티 · GIST 공지 (`CrewFit_BE/src/crawler`)
- 매일 06:00 KST 자동 + 관리자 `/admin/crawler` 수동. 수집 공고 바로 게시.
- env: `KSTARTUP_API_KEY`, `WEVITY_PAGES`, `GIST_NOTICE_URLS` (비우면 해당 소스 꺼짐)
- 새 소스: `ContestSourceAdapter` 구현 → `crawler.module.ts` 등록 → `ContestSource` enum 추가

## 배포 · QR

- QR = URL. 고정 도메인이면 재배포해도 QR 그대로.
- 웹·API 도메인이 다르면 `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`.
