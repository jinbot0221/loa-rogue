# 내 Mac을 서버로 사용하고 공유 주소 만들기

GitHub는 소스 보관소입니다. 사람들이 접속할 웹 주소는 Mac에서 실행하는 서버에 HTTPS 터널을 연결해서 만듭니다. 현재 공유할 수 있는 기능은 회원가입·로그인·편성·도전/전투·이벤트·장비·상점·몬스터50종입니다. [던전 사용법](DUNGEON_GUIDE.md)을 참고하세요.

임시 주소 유지/고정 도메인/터미널 종료 후 운영은 [주소·백그라운드 운영](FIXED_ADDRESS.md)을 참고하세요.

## 업데이트: 아이디 가입 및 출처 오류 해결

신규 가입은 이메일 대신 영문/숫자/밑줄 3~20자 아이디를 사용합니다. 대소문자는 구분하지 않습니다. 기존 이메일 계정은 로그인 입력칸에 예전 이메일과 비밀번호를 그대로 입력하세요. DB를 삭제할 필요가 없습니다. `002_username.sql` migration이 계정/세션/편성/재화를 유지합니다.

`요청 출처` 오류는 실제 브라우저 접속 주소가 서버의 `PUBLIC_ORIGIN`과 다를 때 발생합니다. 터널 주소가 바뀌었거나 다른 서버 프로세스가 이전 설정으로 실행 중인지 확인하세요. **터널은 유지하고 서버만 Ctrl+C로 종료한 뒤**, 코드를 업데이트하고 실제 터널 주소를 넣어 시작합니다.

```bash
git pull --ff-only
npm ci
npm run build
caffeinate -is npm run serve:public -- https://실제주소.trycloudflare.com
```

`serve:public`은 전달한 주소를 PUBLIC_ORIGIN으로 설정하고 production 모드로 시작하므로 `.env`에 예전 주소가 있어도 이번 실행에는 새 주소를 사용합니다. 마지막 `/`는 정리합니다. 콘솔의 `허용 접속 주소`와 브라우저 주소를 맞추세요. 서버 시작 시 migration을 자동 적용합니다. 포트 사용 중 오류가 나면 이전 서버가 종료되지 않은 것입니다. 출처 검증을 끄거나 모든 도메인을 허용할 필요가 없습니다.

## 1. Mac에 준비하기

Node.js **22.23.5 LTS**와 `cloudflared`가 필요합니다. Mac에서 다음으로 버전을 확인하세요.

```bash
sw_vers -productVersion
node --version
npm --version
cloudflared --version
```

MacBook Pro 2015에서는 macOS 11 이상과 Node 22를 사용하세요. Node 24는 macOS 13.5 이상이 필요합니다. Node는 [공식 배포](https://nodejs.org/dist/v22.23.5/)의 Intel Mac용 `darwin-x64` 또는 `.pkg`로 설치할 수 있습니다. nvm이 이미 있다면 `nvm install 22.23.5 && nvm use 22.23.5`를 사용하세요. cloudflared는 [공식 설치 안내](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)에 따라 설치합니다. Homebrew가 정상 지원되는 Mac에서는 `brew install cloudflared`도 가능합니다. 구형 OS에서 Homebrew 설치가 실패하면 공식 바이너리의 OS 지원 범위를 확인하세요.

## 2. GitHub 코드를 내려받고 실행하기

Mac 터미널에서 실행합니다. 비공개 저장소라면 GitHub 계정의 접근 권한이 필요합니다.

```bash
git clone https://github.com/jinbot0221/loa-rogue.git
cd loa-rogue
npm ci
npm run env:init
npm run db:init
npm run build
PUBLIC_ORIGIN=http://localhost:3001 npm start
```

Mac 브라우저에서 `http://localhost:3001`을 열어 회원가입/로그인/파티 저장을 확인합니다. 이 주소는 내 Mac 안에서만 사용하는 주소입니다.

## 3. 도메인 없이 임시 HTTPS 주소 만들기

서버 터미널을 유지한 채 **두 번째 터미널**을 열어 실행합니다.

```bash
cloudflared tunnel --url http://127.0.0.1:3001
```

출력에 `https://무작위이름.trycloudflare.com` 형태의 주소가 표시됩니다. 이것이 임시 공유 주소입니다. 이 문서의 예시 주소를 그대로 쓰지 말고 실제 출력 주소를 복사하세요.

첫 번째 서버 터미널에서 Ctrl+C로 서버를 중지한 후, **실제 출력 주소로 바꾸어** 다시 실행합니다.

```bash
caffeinate -is npm run serve:public -- https://실제주소.trycloudflare.com
```

두 번째 터미널의 cloudflared는 계속 켜둡니다. 이제 HTTPS 주소를 휴대전화의 모바일 데이터로 열어 가입·로그인·저장을 확인하고 사람들에게 전달하면 됩니다. `PUBLIC_ORIGIN`에는 끝 슬래시(`/`)를 붙이지 마세요. 주소가 맞지 않으면 보안 검증 때문에 가입·로그인이403으로 거절됩니다.

- 임시 터널은 테스트용이며 재실행할 때 주소가 바뀝니다. 바뀌면 서버도 새 PUBLIC_ORIGIN으로 재시작해야 합니다. 브라우저 쿠키도 새 주소에서는 다시 로그인해야 합니다.
- 이미 `~/.cloudflared/config.yml` 또는 `config.yaml`이 있다면 Quick Tunnel이 지원되지 않을 수 있습니다. 기존 파일을 지우지 말고 아래 고정 도메인 방식으로 실행하거나 공식 Quick Tunnel 안내에 따라 기존 설정을 안전하게 보존하고 임시 테스트하세요.
- Mac 서버와 터널 프로세스가 모두 실행 중이어야 합니다. Ctrl+C/종료/절전/인터넷 단절 시 접속이 중단됩니다. `caffeinate`도 노트북 덮개를 닫았을 때의 서비스 유지를 보장하지 않습니다.
- 공유기 포트 포워딩은 필요 없습니다. 3001 포트나 SQLite 파일을 인터넷에 직접 공개하지 마세요.

## 4. 계속 사용할 고정 주소 만들기

`game.내도메인.com` 같은 고정 주소에는 본인이 관리하는 도메인이 필요합니다. Cloudflare에 도메인을 등록/연결한 뒤 다음을 실제 도메인으로 실행합니다.

```bash
cloudflared tunnel login
cloudflared tunnel create loa-rogue
cloudflared tunnel route dns loa-rogue game.내도메인.com
```

터널 UUID와 인증 파일 경로를 이용한 config.yml 예시는 [README의 개인 MacBook HTTPS 외부 접속](../README.md#개인-macbook-https-외부-접속)에 있습니다. 서버와 터널은 각각 실행합니다.

```bash
# 터미널 1: 프로젝트 루트
caffeinate -is npm run serve:public -- https://game.내도메인.com
# 터미널 2
cloudflared tunnel run loa-rogue
```

공유할 주소는 `https://game.내도메인.com`입니다. GitHub 저장소 주소를 게임 접속 주소로 전달하는 것이 아닙니다. 실제 도메인 생성과 Mac 터널 실행은 사용자의 컴퓨터에서 진행해야 하며 이 클라우드에서 대신 생성하지 않았습니다.

## 5. 업데이트와 데이터 보관

데이터는 Mac의 `data/loa.sqlite`에 저장됩니다. `.env`와 DB는 GitHub에 올라가지 않습니다. 클라우드에서 만든 테스트 계정은 Mac에 자동 복사되지 않습니다.

업데이트 전 서버를 Ctrl+C로 중지하고 루트에서 실행합니다.

```bash
mkdir -p backups
npm run db:backup -- ./backups/before-update.sqlite
git pull --ff-only
npm ci
npm run db:init
npm run build
# 기존 실제 HTTPS 주소로 서버 재시작
caffeinate -is npm run serve:public -- https://실제주소
```

백업 파일은 매번 다른 이름을 사용해 이전 백업을 보존하세요. `.env`/DB/터널 인증 파일을 공유하거나 커밋하지 마세요. 장기 운영 전에는 자동 재시작, 로그 보관/로테이션, 정기 백업과 복구 검증을 설정하세요.
