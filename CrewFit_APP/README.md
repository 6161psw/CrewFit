# CrewFit_APP — Flutter 학생 앱 (Android 우선)

구조 = 교육자료 · 팟쥐(pot-g-flutter) 방식.

| 항목 | 사용 |
|---|---|
| 상태관리 | flutter_bloc + freezed (sealed, `switch`) |
| DI | get_it + injectable (`lib/app/di`) |
| 라우팅 | auto_route (`lib/app/router.dart`) |
| 네트워크 | dio + retrofit, `AuthorizeInterceptor` (401 → `/auth/refresh` → 재시도) |
| 토큰 | flutter_secure_storage |
| 로그인 | google_sign_in → idToken → `POST /auth/google/token` · 개발용 `POST /auth/dev-login` |
| 채팅 | REST 기록·전송 + socket.io `/chat` 수신 |

```
lib/
  main.dart · app_bloc_observer.dart
  app/
    crewfit_app.dart   router.dart   di/   values/(env·palette·theme)
    modules/<모듈>/
      data/{data_sources/remote, models, repositories}
      domain/{entities, enums, repositories, exceptions}
      presentation/{bloc, pages, widgets}
```
모듈: `auth` `user` `contest` `team` `invitation` `chat` `submission` `core` `common`

화면: 로그인 → 홈(내 학교/지역/전국 대회·모집 팀) → 대회 상세 → 팀 만들기 / 팀 지원 → 채팅(실시간) → 팀 확정 → 제출 서류(서명·제출) · 지원·제안함 · MY(자소서)

미포함: 서류 파일 업로드(웹 사용), 학교메일 인증(S-01~05), 관리자.

## 최초 1회

Flutter 3.50+ (팟쥐와 동일).

```bash
cd CrewFit_APP
flutter create . --org kr.crewfit --project-name crewfit --platforms android,ios
flutter pub get
dart run build_runner build -d
copy env.example.json env.json        # 맥/리눅스: cp
```

- `flutter create .` = android/ios 폴더 생성. 기존 파일 안 덮어씀.
- `build_runner` = `*.g.dart` `*.freezed.dart` `router.gr.dart` `locator.config.dart` 생성 (git 제외). 모델·API·페이지 바꾸면 다시 실행 (`watch -d` 가능).

## env.json

| 키 | 값 |
|---|---|
| `API_URL` | `http://<PC IPv4>:3000` (cmd `ipconfig` → Wi-Fi IPv4). 에뮬레이터면 `http://10.0.2.2:3000` |
| `GOOGLE_SERVER_CLIENT_ID` | `CrewFit_BE/.env` 의 `GOOGLE_CLIENT_ID` (웹 클라이언트) 그대로. 비우면 구글 버튼 숨김 |
| `DEV_LOGIN` | `true` → 이메일 개발 로그인 (BE `DEV_LOGIN_ENABLED=true` 필요) |

## 폰 실행 (무선 디버깅)

1. PC 백엔드 실행 (`CrewFit_BE` → `npm run start:dev`). 폰·PC 같은 Wi-Fi.
2. 윈도우 방화벽 "Node.js 개인 네트워크 허용" (첫 실행 팝업). 폰 브라우저 `http://<PC IP>:3000/health` 열리면 OK.
3. 폰: 개발자 옵션 → 무선 디버깅 → 페어링 코드로 기기 페어링
   ```bash
   adb pair <IP>:<페어링포트>
   adb connect <IP>:<무선디버깅포트>
   flutter devices
   ```
4. 실행
   ```bash
   flutter run --dart-define-from-file=env.json
   ```
   `r` 핫리로드 · `R` 재시작.

http 접속 허용 = `android/app/src/debug/AndroidManifest.xml` (debug 빌드만).

## 구글 로그인 (Android)

Google Cloud → 클라이언트 → **클라이언트 만들기 → Android**

- 패키지 이름: `kr.crewfit.crewfit`
- SHA-1 (디버그 키):
  ```bash
  keytool -list -v -alias androiddebugkey -storepass android -keystore %USERPROFILE%\.android\debug.keystore
  ```
- 만들기만 하면 됨. 앱엔 **웹** 클라이언트 ID 를 `GOOGLE_SERVER_CLIENT_ID` 로 넣음.
- 대상 = 내부 → 조직 계정만 로그인. 그 외 = dev 로그인.

## 문제

| 증상 | 원인 |
|---|---|
| 서버 연결 실패 | API_URL IP / 같은 Wi-Fi / 방화벽 |
| 구글 `clientConfigurationError` | Android 클라이언트 패키지·SHA-1 불일치, 또는 serverClientId 가 웹 ID 아님 |
| `유효하지 않은 구글 토큰` | BE `GOOGLE_CLIENT_ID` ≠ 앱 `GOOGLE_SERVER_CLIENT_ID` |
| `locator.config.dart` 없음 | `dart run build_runner build -d` |
| adb/gradle 차단 | Smart App Control 끄기 |
