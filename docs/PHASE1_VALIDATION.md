# Phase 1 검증 결과

2026-11-14 · Linux x64 클라우드 · Node 22.23.5 / npm 10.9.9

## 구현 범위

npm workspaces 4패키지, React/TypeScript/Vite/Zustand 모바일 UI, Fastify/SQLite migration/WAL, 이메일·비밀번호·닉네임 가입, Argon2id, 쿠키 세션, 로그인/복구/로그아웃, 6영웅 기본 데이터·도감, 파티 추가/제거/순서 변경·서버 저장. 쓰기 요청은 actionId/revision 검증과 트랜잭션을 사용한다.

## 실행 결과

| 검사 | 결과 |
|---|---|
| npm install (작업공간 캐시) | 성공, lockfile 생성 |
| npm ci (작업공간 캐시) | 성공, 재설치 재현 |
| npm run env:init | 성공, 난수 비밀키 생성/기존 .env 보존 |
| npm run db:init | 성공, migration 반복 적용·integrity_check=ok |
| npm test | API 11 + 공통 규칙 2 = 13 통과, 실패/skip 0 |
| npm run typecheck | 성공 |
| npm run build | 웹/서버 성공, 서버 공통 패키지 번들 포함 |
| CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e | Chromium 2 통과, 실패/skip 0 |
| npm audit | 취약점 0건 |
| npm run db:backup -- /tmp/loa-phase1-backup.sqlite | online backup 성공, 백업 integrity_check=ok |
| npm run dev + HTTP 요청 | Fastify health, Vite proxy health, 웹 HTML 모두200 |

브라우저 테스트: 가로844×390에서 회원가입→영웅 추가로 비용 초과 차단→제거/정렬→서버 저장→새로고침 복구→도감→로그아웃→로그인 복구. 세로390×844에서는 회전 안내/로그인 폼/가로 넘침 없음. 브라우저 미처리 JS 오류0. 실제 모바일 기기의 터치·GPU·성능 검증은 아니다.

## 진단과 수정

- 최초 기본 npm 캐시가 쓰기 불가능해 설치 실패. `/workspace/.npm-cache`를 지정해 설치 성공.
- 최초 타입 검사 오류2개: Fastify의 unknown 오류 객체를 타입 가드로 처리해 해결.
- 최초 정적 파일 플러그인 의존성 감사3건: 수정 버전 `@fastify/static` 10.1.11 이상으로 갱신 후 감사0건 및 서버/브라우저 재검증.
- Node24의 macOS13.5 요구 조건을 확인해 MacBook2015용 기본을 Node22(macOS11 이상 지원)로 변경. 공식 HTTPS 배포의 SHA256과 대조한 Linux Node22에서 검증.
- Node22 `node:sqlite` 실험 경고와 Zod 의존성의 Rollup 주석 경고가 출력되며 위 명령들은 성공 종료했다.

## 미검증/미구현

실제 MacBook Pro, 외부 HTTPS 도메인, Cloudflare 자격증명/터널, 실기기, 백업 운영 스케줄 및 프로세스 자동 복구는 미검증. 배포 절차만 README에 작성했다.
Phase2~6의 전투·3D·100층·몬스터50종·장비·이벤트12종·영구 성장/도전 결과/기록은 미구현. 전투 없는 가짜 run이나 지급/소비 API는 만들지 않았다. 원작 IP 사용 권한 확인은 별도 과제다.

## 아이디 가입 / 공유 서버 수정 검증 (2026-11-14)

- 신규 가입/로그인 DTO 및 UI를 username으로 전환. 기존 DB의 email 열은 migration002로 rename하며 기존 이메일 계정 로그인·세션·편성 복구를 검증.
- API/공통 테스트 16개 통과, 브라우저2개 통과, 타입 검사/웹·서버 빌드 성공. 브라우저 첫 실행에서 테스트 아이디가20자를 초과해 재로그인 실패했고, 테스트 식별자를 규칙에 맞게 수정 후 가입→저장→재로그인 전체 통과.
- 실제 빌드 서버를 serve:public으로 구동하여 오래된 PUBLIC_ORIGIN 환경변수보다 전달한 HTTPS 주소가 우선함을 검증. 지정 Origin의 가입201/이전 Origin403/Secure 쿠키/잘못된 URL 거부 확인.
- 출처 검증은 끄지 않았으며 오류에 현재 허용 주소와 재시작 명령을 안내. Mac의 실제 서버는 사용자가 새 코드를 내려받고 현재 터널 URL로 재시작해야 함.
