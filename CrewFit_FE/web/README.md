# CrewFit_FE/web — 학생용 웹 (예정)

- React + Vite + TypeScript. 모바일 우선 반응형, PWA.
- 화면: `design/README.md` 의 통합안(v3) H·T·E 흐름.
- API: `CrewFit_BE` (Swagger `/docs`). 인증: `/auth/google?client=web` → `/auth/callback` → `POST /auth/refresh` (credentials: include).
- 채팅: socket.io `/chat` 네임스페이스, `auth: { token: accessToken }`.
