# LOA ROGUE

모바일 가로 화면을 위한 웹 로그라이크 RPG. 현재 **Phase 2: 계정 · 편성 · 도전 시작/이어하기 · 서버 턴제 전투**까지 구현했습니다. Firebase 및 원작 모델·이미지·음원을 사용하지 않습니다. 영웅 명칭 등 실제 IP의 배포 권한 확인은 별도 과제입니다.

**주소 유지/고정 및 터미널 없이 운영:** [주소·백그라운드 운영](docs/FIXED_ADDRESS.md)

**내 Mac에서 사람들에게 공유할 주소 만들기:** [Mac 서버 빠른 시작](docs/MAC_SERVER_QUICKSTART.md) — 도메인 없는 임시 HTTPS 주소와 고정 도메인 설정을 설명합니다.

제품 명세: [docs/LOA_ROGUE_CODEX_SPEC.md](docs/LOA_ROGUE_CODEX_SPEC.md) · 전체 계획/스키마/API: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

## 실행 환경

- 기본: **Node.js 22.23.5 LTS**, npm 10. Node 24도 개발 가능하지만 macOS 13.5 이상이 필요합니다.
- Node 22 공식 x64 바이너리는 macOS **11 이상**을 지원합니다. Mid 2015 MacBook Pro는 실제 `sw_vers -productVersion`을 확인하고 지원 OS에서 실행하세요. 이 작업은 Linux x64에서 검증했으며 실제 Mac 실행을 대신하지 않습니다.
- `node:sqlite` 내장 드라이버를 사용합니다. Node 22에서 ExperimentalWarning이 출력될 수 있습니다. Node 20 이하에서는 실행되지 않습니다.
- Argon2 네이티브 패키지는 보통 prebuilt를 사용합니다. 설치 시 소스 컴파일이 필요한 Mac에서는 `xcode-select --install`로 Command Line Tools를 설치하세요.
- Node 버전 관리자가 있다면 저장소 루트에서 `nvm install && nvm use`. [Node 22 공식 지원 플랫폼](https://github.com/nodejs/node/blob/v22.x/BUILDING.md#platform-list)을 확인하세요.

## 도전과 전투 사용법

파티를 저장한 뒤 **도전 시작**을 누르면1층 전투로 진입합니다. 기본 공격/영웅별 스킬2개/궁극기/회복약/교체가 작동하고 모든 결과가 서버에 자동 저장됩니다. 로비로 돌아가거나 새로고침한 뒤 **도전 이어하기**로 복구합니다. 승리하면 보상1개를 고르고 다음 층으로 이동하며, 전멸/포기/100층 클리어 시 결정과 기록이 저장됩니다.

자체 도형의3D SD 씬을 제공하며 저사양 모드 버튼으로2D 표시로 바꿀 수 있습니다. 현재는 **순차 전투 경로**이며 일반층 이벤트3후보/장비/상점은 미구현입니다. 자세한 수치·상태 중첩/지속·제한은 [전투 규칙](docs/COMBAT_RULES.md)을 참고하세요.

기존 Mac 설치를 업데이트할 때는 cloudflared는 켜둔 채 **게임 서버만** Ctrl+C로 종료하고 아래를 실행합니다. 마지막 주소는 현재 사용 중인 실제 터널 주소로 교체합니다. 기존 DB는 삭제하지 마세요.

```bash
git pull --ff-only
npm ci
npm run build
caffeinate -is npm run serve:public -- https://실제주소.trycloudflare.com
```

migration003은 기존 계정/편성을 보존하고 도전/기록 테이블을 추가합니다. 서버 시작이 migration을 자동 적용합니다.

## 아이디 가입과 공유 서버 업데이트

신규 가입은 이메일이 아닌 아이디를 사용합니다. 기존 이메일 계정은 로그인 칸에 기존 이메일을 입력하면 됩니다. migration 002가 기존 데이터를 보존합니다. 변경 API는 `email` 대신 `username`을 받습니다.

Mac 터널의 접속 주소와 서버 설정을 일치시키려면 빌드 후 `npm run serve:public -- https://실제터널주소`로 시작하세요. 터널은 켜둔 채 기존 게임 서버만 종료하고 재시작합니다. 세부 절차는 [Mac 서버 빠른 시작](docs/MAC_SERVER_QUICKSTART.md#업데이트-아이디-가입-및-출처-오류-해결)을 참고하세요. origin 검증은 계속 유지합니다.

## 로컬 개발

모든 명령은 **이 README가 있는 저장소 루트**에서 실행합니다.

```bash
npm install
npm run env:init
npm run db:init
npm run dev
```

`env:init`는 48바이트 난수 세션 비밀키를 가진 `.env`를 생성하고 기존 `.env`는 보존합니다. `.env.example`에는 사용 가능한 설정 이름만 있습니다. 비밀키를 커밋하거나 채팅에 공유하지 마세요. `db:init`는 migration을 적용하며 **기존 데이터를 삭제하지 않습니다**. 서버 시작도 migration을 자동 적용합니다.

- 웹: `http://localhost:5173`
- API: `http://127.0.0.1:3001/api/health`
- Vite가 `/api`를 Fastify에 프록시합니다. 웹에는 `localhost:5173`로 접속하세요. Origin 검증 때문에 `127.0.0.1:5173`이나 LAN 주소로 접속하려면 `.env`의 `PUBLIC_ORIGIN`을 해당 origin으로 수정하고 서버를 재시작해야 합니다.
- 회원가입: 아이디(영문·숫자·밑줄 3~20자, 대소문자 구분 없음), 비밀번호 10~128자, 닉네임 2~20자. 회원가입 시 6영웅을 모두 개방하고 결정 0개, 초기 파티 웨이/니나브/실리안/바훈투르(코스트12)를 저장합니다.
- 영웅 추가/제거, ↑/↓ 순서 변경 후 **파티 저장**을 누릅니다. 1~6명/중복 금지/합계15 이하를 서버에서 다시 검증합니다. 새로고침·로그아웃·로그인·서버 재시작 후 저장 편성이 복원됩니다.
- 실행 중 수정 자동 반영: 웹은 Vite HMR. 서버 코드 수정 후 `npm run dev`를 종료하고 재실행하세요(서버 watch 미사용).

잠금 파일이 있는 다음 설치부터는 `npm ci`를 사용하세요. 쓰기 불가능한 홈 캐시가 있는 클라우드에서는 `npm ci --cache /workspace/.npm-cache`를 사용합니다.

## 검증 명령

```bash
npm test
npm run typecheck
npm run build
npm audit
```

- `npm test`: 실제 임시 SQLite/Argon2/Fastify API·공통 규칙·시드 전투 엔진 테스트. 비용/소유 계정 분리/멱등성/revision 경합/인증/CSRF/만료·폐기/재시작 복구 등을 검증합니다.
- `npm run build`: 타입 검사 → Vite 웹 정적 빌드 → 서버 번들. 결과는 `apps/web/dist`, `apps/server/dist`입니다. 공통 패키지를 서버 번들에 포함하므로 운영 실행에 TS 로더가 필요 없습니다.
- 브라우저 E2E(선택적 개발 도구, 테스트 자체는 이번 작업에서 실행):

```bash
npx playwright install chromium
npm run test:e2e
# 시스템 Chromium을 쓰려면 (Linux 예시)
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

`test:e2e`는 빌드 후 별도 Fastify(127.0.0.1:3002)와 임시 DB를 구동합니다. 가입→비용초과 차단→편성 순서 저장→새로고침→로그인 및 3D 전투 시작→스킬→복구→승리 보상→포기 기록, 저사양2D 교체와 가로844×390/세로390×844 표시를 검사합니다. 3002 포트는 비워두세요. Chromium 설치에는 네트워크 접근이 필요합니다.

## 빌드된 앱 실행

로컬에서 정적 웹/API를 함께 확인할 때:

```bash
npm run build
PUBLIC_ORIGIN=http://localhost:3001 npm start
```

`http://localhost:3001`에서 접속합니다. 이 명령은 개발 쿠키 설정을 사용합니다. 외부 공개에는 아래의 HTTPS/production 설정을 사용하세요.

## DB 초기화 · 백업 · 복구

기본 파일 `data/loa.sqlite`는 Git에서 제외됩니다. `DATABASE_PATH`는 실행 디렉터리에 상대적이므로 항상 루트에서 명령을 실행하세요. 전체 데이터 삭제가 필요한 개발 DB 초기화는 **서버를 종료한 뒤 별도로 백업하고** `data/loa.sqlite`, `data/loa.sqlite-wal`, `data/loa.sqlite-shm`을 삭제한 후 `npm run db:init`를 실행합니다. 운영 DB에는 이 삭제 절차를 사용하지 마세요.

서버 실행 중에도 SQLite online backup API로 일관된 스냅샷을 만들 수 있습니다. 단순히 WAL 사용 중인 원본 `.sqlite`만 복사하면 안 됩니다.

```bash
mkdir -p backups
npm run db:backup -- ./backups/loa-backup.sqlite
# 아래는 스냅샷 무결성 확인; 백업 파일을 원본 대신 지정
node --input-type=module -e 'import {DatabaseSync} from "node:sqlite"; const d=new DatabaseSync("./backups/loa-backup.sqlite",{readOnly:true}); console.log(d.prepare("PRAGMA integrity_check").get()); d.close();'
```

`backups/`는 기본 .gitignore에 포함됩니다. 백업에는 계정/세션 정보가 있으므로 접근 권한을 제한하고 암호화한 외장/원격 저장소에 보관하세요. 복구는 서버를 종료하고 기존 DB와 WAL/SHM을 안전한 다른 위치로 옮긴 다음, 검증한 백업을 `DATABASE_PATH` 위치로 복사하고 재시작합니다. SQLite 파일에 직접 쓰는 관리 작업은 서버를 정지한 상태에서만 수행하세요.

## 개인 MacBook HTTPS 외부 접속

운영 준비 예시이며 실제 도메인/터널 생성·Mac 자동 시작은 이 클라우드 작업에서 실행하지 않았습니다.

1. 위 로컬 흐름을 Mac에서 먼저 검증합니다. 개인 서버의 종료·절전·인터넷 단절 시 접속도 중단됩니다.
2. `.env`의 `NODE_ENV=production`, `PUBLIC_ORIGIN=https://game.example.com`, `HOST=127.0.0.1`, `PORT=3001`을 실제 값으로 설정합니다. `SESSION_SECRET`는 생성한 난수를 유지합니다. PUBLIC_ORIGIN에는 끝 `/`나 경로를 넣지 않습니다.
3. `npm ci && npm run build && npm run db:init && npm start`로 정적 웹/API를 동일 origin으로 제공합니다. HTTPS 리버스 프록시/터널 전용으로 운영하며 production 쿠키는 Secure입니다. production 설정에서 HTTP 브라우저 로그인이 안 되는 것은 정상입니다.
4. Cloudflare가 관리하는 도메인이 있다면 [공식 cloudflared 설치 안내](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)에 따라 설치한 후:

```bash
cloudflared tunnel login
cloudflared tunnel create loa-rogue
cloudflared tunnel route dns loa-rogue game.example.com
```

`~/.cloudflared/config.yml`을 작성합니다(아래 `<TUNNEL_UUID>`, `<MAC_USERNAME>`, 도메인은 실제 값으로 교체).

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /Users/<MAC_USERNAME>/.cloudflared/<TUNNEL_UUID>.json
ingress:
  - hostname: game.example.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

```bash
cloudflared tunnel run loa-rogue
```

라우터에서 DB/3001 포트를 외부로 열지 않습니다. 원본 서버가 loopback에만 바인딩되어 있어야 합니다. 프록시 헤더를 신뢰하지 않아 IP 제한은 터널 내부 IP로 합산될 수 있습니다(개인 운영 기본값). 다중 사용자 운영 전에는 신뢰할 프록시 범위와 edge 속도 제한을 별도로 설정하세요. Cloudflare 자격증명 파일과 `.env`는 Git 밖에 둡니다.

5. 실제 HTTPS 도메인에서 회원가입/로그인/저장/재접속을 검증하고, 매일 online backup과 복구 연습을 진행합니다. `launchd` 등의 프로세스 관리자로 서버/터널 자동 재시작을 설정하고, 실행 디렉터리는 저장소 루트로 고정하세요. 로그는 stderr/stdout으로 출력되므로 관리자 로그 파일에 보관하고 로테이션을 설정하세요(세션/비밀번호/body 로깅 미사용). 초기에는 포그라운드 실행과 `caffeinate -is npm start`로 절전 중단을 방지할 수 있습니다. 실제 서비스에는 전원·네트워크 가용성과 모니터링이 필요합니다.

## 도전 API

| 메서드 | 경로 | 기능 |
|---|---|---|
| POST | /api/runs | 저장 편성으로 도전 시작(계정revision) |
| GET | /api/runs/active | 활성 도전 또는 null |
| GET | /api/runs/:id | 본인 도전 상태 |
| POST | /api/runs/:id/battle-action | action: attack / skill(skillId) / switch(heroId) / potion |
| POST | /api/runs/:id/select-reward | choice: heal / gauge / gold |
| POST | /api/runs/:id/abandon | 포기와 결정 지급 |
| GET | /api/records | 본인 최근 종료 기록30건 |

도전 쓰기는 run의 revision을 사용하며 시작만 계정 revision을 사용합니다. 보상/종료의 재화 지급까지 동일 actionId 트랜잭션에 포함됩니다. 서버가 난수와 행동 결과의 최종 권한자입니다.

## 현재 API와 안전 장치

`GET /api/health` 외에는 인증이 필요합니다. 회원가입/로그인은 인증 전 허용합니다.

| 메서드 | 경로 | 기능 |
|---|---|---|
| POST | /api/auth/register | 가입 + 세션 발급 |
| POST | /api/auth/login | 로그인 + 세션 발급 |
| POST | /api/auth/logout | 현재 세션 폐기 |
| GET | /api/auth/me | 계정, 재화, 파티, revision |
| GET | /api/heroes | 6영웅 기본 스탯/현재 코스트 |
| PUT | /api/party | 순서가 있는 편성 저장 |

모든 쓰기 요청에는 `Origin: PUBLIC_ORIGIN`, UUID `actionId`, 정수 `revision`이 필요합니다. 인증 전 쓰기는 revision=0, 파티/로그아웃은 `/auth/me`의 계정 revision입니다. 파티 저장·도전 시작·도전 종료가 계정 revision을 증가시키며, 전투/보상 선택은 도전 revision을 증가시킵니다. 같은 사용자·actionId·payload 재시도는 저장한 결과를 반환하고, 다른 payload/경로 재사용과 낡은 revision은409입니다. 클라이언트는 연결 실패 시 같은 요청을 한 번 재전송합니다. logout 재생 외의 보호 API는 유효 세션이 필요하며, 만료·폐기된 로그인 action을 재생해도 세션을 되살리지 않습니다(새 actionId로 재로그인).

비밀번호 Argon2id, 7일 HttpOnly/SameSite=Strict 세션, 운영 Secure, DB에는 세션 SHA256만 저장. 요청 스키마/크기/가입·로그인 속도 제한, Origin 검증, SQLite FK/WAL/트랜잭션을 적용합니다. 별도 CORS 허용을 하지 않고 같은 origin의 앱만 사용합니다.

## 남은 범위

- Phase3 확장: 고유 모델/세부 스킬 이펙트, 실제 모바일 GPU/성능 검증. 현재 자체3등신 도형과2D fallback은 작동합니다.
- Phase4: 일반층 이벤트3후보/저장/선택, 몬스터 일반30·정예10·보스10종 독립 데이터와 패턴. 현재는5지역 적 템플릿과 공유 보스 패턴의1~100 순차 전투 경로입니다.
- Phase5: 장비·상점·합성·제작·미지 이벤트12종.
- Phase6: 영구 강화·코스트 구매/제작법 도감/계정 삭제/운영 검증. 결정 지급/도전 결과/기록 저장은 이번에 구현했습니다.

현재 API로 영구 강화는 구매할 수 없습니다. 강화 데이터는 기본0이며 시작 파티 코스트 검증 및 스탯 스냅샷에 반영할 준비가 되어 있습니다. Mac LaunchAgent는 생성기와 설치 안내를 제공하지만 실제 Mac 서비스·Cloudflare 도메인은 클라우드에서 검증하지 않았습니다.
