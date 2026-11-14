# LOA ROGUE 구현 계획

제품 기준: `docs/LOA_ROGUE_CODEX_SPEC.md`. 단계 순서는 사용자의 시작 요청을 따른다.
기존 구현 없는 저장소에서 시작한다. Firebase와 원작 에셋은 사용하지 않는다.

## 단계와 인수 조건
1. **Phase 1 (이번 작업)**: npm workspaces, React/TS/Vite 모바일 가로 UI, Fastify/SQLite WAL, migration, Argon2id 회원가입, 세션 인증/복구/로그아웃, 로비, 6영웅 도감, 파티 1~6명/중복 금지/총 코스트 15/순서 편성 및 서버 저장. DB 초기화, 테스트, 빌드, 실행 문서 제공. 전투 없는 상태에서 run을 만들거나 시작 버튼을 완성으로 표시하지 않는다.
2. **Phase 2**: 순수 TS 시드 전투 엔진, 영웅별 공격/스킬2/궁극기/패시브, 서버 판정, AI, HP/무력화/상태이상, 자발/강제 교체, 멱등 행동/재접속 복구. 수치와 난수 재현 테스트.
3. **Phase 3**: Three.js/React Three Fiber 3등신 SD 자체 도형, 1대1 씬, 이벤트 로그 애니메이션, 품질 설정. 실제 전투 엔진과 연결하고 모바일 성능 검증.
4. **Phase 4**: 1~100층, 일반 층 후보 3개 영구 저장, 10층마다 보스, 일반30/정예10/보스10종 데이터, 보스 패턴, 자동 저장. 새로고침 불변/층 주기 검증.
5. **Phase 5**: 장비 3슬롯/공유 유물2, 60칸 인벤토리, 획득/장착/동급3개 합성/특수 레시피/상점, 미지의 균열12종. 소유권/정확한 소비/중복 지급 방지 검증.
6. **Phase 6**: 도전 종료와 단 한 번 보상, 기록/도감, 영웅 영구 강화/코스트 감소, HTTPS Mac 배포와 백업 복구, 모바일 실기기/보안 검증. IP 사용 권한은 별도 확인.

## 폴더 구조
- apps/web: React UI와 API 클라이언트. /api는 Vite 프록시 또는 운영 서버의 동일 origin.
- apps/server: Fastify API, SQL migrations, 인증/세션/트랜잭션, DB 초기화/백업 CLI, 통합 테스트.
- packages/shared: 영웅 데이터, Zod DTO, 파티 검증. 서버 검증이 최종 권한.
- packages/game-engine: Phase 1은 빈 경계만 두고 Phase 2에서 순수 전투 함수를 구현.
- docs: 제품 명세 및 운영 문서.

## 스키마
Phase 1 migration: users(username unique, Argon2id, 닉네임, revision), sessions(토큰 hash, 만료/폐기), user_currencies(정수 CHECK>=0), hero_upgrades(복합 PK, 각 강화 상한), party_presets(계정 PK, 순서 JSON), processed_actions(scope+action_id PK, 요청 fingerprint, 응답/상태), schema_migrations.
외래키/STRICT 테이블/WAL/busy_timeout 활성화. 사용자 생성과 초기 재화/영웅 강화/파티 생성은 한 트랜잭션. 모든 상태 변경은 UUID actionId, revision과 트랜잭션 사용. 동일 actionId/동일 요청은 저장된 결과 재생, 다른 요청은409. 인증 전에는 revision=0, 계정 생성 후 revision=0. 로그인/로그아웃은 게임 revision을 바꾸지 않고 인증된 logout은 현재 revision을 요구한다. 파티 변경은 계정 revision을 검증하고 +1. 재시도 시 세션이 살아 있어야 한다.
후속 migration: runs(partial unique active user, party snapshot, seed/rng, revision, stage/inventory/battle/pending reward JSON), run_events(run+floor PK), run_equipment, discovered_recipes, records(run UNIQUE). 지금 사용하지 않는 도전 테이블/가짜 API는 생성하지 않는다.

## API
Phase 1:
- GET /api/health: DB readiness
- POST /api/auth/register {username,password,nickname,actionId,revision:0}
- POST /api/auth/login {username,password,actionId,revision:0}
- POST /api/auth/logout {actionId,revision}
- GET /api/auth/me: 계정, 결정, revision, 저장 파티
- GET /api/heroes: 인증 후 6영웅/현재 코스트/강화 단계
- PUT /api/party {heroIds,actionId,revision}: 편성 검증/저장
후속 API는 제품 명세 10절의 /runs, /meta, /records, /recipes를 단계별로 구현. 전투 미구현 상태에서는 /runs를 노출하지 않는다.

## 보안/운영
HttpOnly/SameSite=Strict 쿠키, 운영 Secure, 7일 세션, DB에는 세션 SHA256만 저장. SESSION_SECRET(32자 이상)로 인증 재시도 토큰과 요청 fingerprint HMAC. 모든 쓰기는 PUBLIC_ORIGIN과 Origin 일치 필수(CSRF), 동일 origin만 사용(CORS 미허용). 로그인/가입 IP 속도 제한, 16KiB body limit, Zod strict 입력, 서버에서 사용자 결정. 운영 정적 파일은 API 서버가 제공. 로그에 쿠키/비밀번호/요청 body를 기록하지 않는다.
Node22.23.5 LTS의 node:sqlite 사용(런타임 실험 경고 가능). Node24는 macOS13.5 이상이 필요하므로 MacBook2015를 위해 공식 macOS11 이상 지원인 Node22를 기본으로 선택한다. macOS11 미만에서는 OS 업데이트/별도 지원 호스트가 필요하다. TLS/체크섬 검증을 우회하지 않는다.

## 테스트 계획
Phase 1 실제 임시 SQLite + Fastify inject: 회원가입/중복/잘못된 로그인/세션 만료·폐기, 인증 필수, CSRF, 파티 15초과·중복·빈 파티·미지 영웅·순서 저장, 다른 계정 분리, revision 경합, 동일 action 재생·다른 payload 충돌, 프로세스 재시작 후 복구. Argon2id와 DB 무결성 확인. 추가 HTTP smoke로 정적 앱과 API 접속 확인. npm install/npm test/npm run typecheck/npm run build 결과 기록.
후속 단계는 제품 명세의 엔진/보상/합성/100층 인수 조건을 추가한다. 브라우저 모바일 실기기, 외부 HTTPS 및 실제 MacBook 실행은 이 클라우드 검증과 구분한다.

## 2026-11-14 사용자 요청 반영
신규 가입/로그인 식별자를 username으로 변경(영문/숫자/밑줄3~20자). migration002에서 email 열을 rename하여 기존 이메일 계정·세션·진행을 보존하며 기존 이메일은 로그인 식별자로 허용. CSRF Origin 엄격 검증은 유지하고 오류에 허용 주소/복구 명령을 안내. serve:public 실행기로 현재 HTTPS 터널 URL을 PUBLIC_ORIGIN에 명시 적용.

## 이번 작업: 도전 시작과 전투

- Phase 2: 저장 편성을 스냅샷으로 고정해 새 도전/이어하기. 1대1 턴, 속도 우선, 강제/자발 교체, 기본 공격/영웅별 스킬2/궁극기/패시브, 무력화/보스 면역/상태이상/회복약. 순수 시드 엔진과 서버 원자 저장, RNG는 응답에서 숨김.
- 플레이 가능한 전투 경로: 1~100층을 순서대로 전투, 10층마다 보스. 승리 후 회복/궁극기 충전/골드 중 보상1개를 서버에서 한 번 선택하고 다음 층. 이 경로는 전투 검증용이며 일반층 이벤트3후보/장비/상점/균열12종은 Phase4~5로 명확히 남긴다.
- 자체 도형 기반 R3F SD 전투 씬을 함께 제공. WebGL 실패 시 전투를 계속할 수 있는 2D 표시. 서버 로그가 HP/행동/애니메이션의 기준.
- migration003: runs(계정당 active1, revision, seed, snapshot/state JSON), records(run UNIQUE, 층수/결과/결정). 종료/포기/100층 보상은 transaction에서 정확히1회 지급. 강화 구매는 아직 미구현.
- API: POST /runs(계정revision), GET /runs/active 및 /runs/:id, POST /runs/:id/battle-action, /select-reward, /abandon(도전revision), GET /records. 소유권/중복action/경합/불법행동 검사.
- 검증: 엔진 재현성/비변이, 피해·속도·교체·DoT·기절·무력화·면역·쿨다운·궁극기·전멸, 저장/재접속/권한/중복보상/종료/100층 경계 API, 브라우저 도전→행동→복구→포기.
- 고정 주소/터미널 종료: 소유 도메인 + named Cloudflare Tunnel. macOS launchd로 서버/터널을 로그인 세션 서비스로 등록하는 실행 가능한 설치 스크립트와 문서를 제공. Mac 꺼짐/절전/로그아웃 시 중단되는 조건은 명시한다. 실제 도메인 등록/서비스 실행은 사용자의 Mac에서 수행한다.
