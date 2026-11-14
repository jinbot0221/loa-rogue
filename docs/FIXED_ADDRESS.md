# 임시 주소 유지와 고정 주소 / Mac 백그라운드 운영

## 도메인이 없다면

현재 `cloudflared tunnel --url http://127.0.0.1:3001` 프로세스를 종료하지 않으면 현재 trycloudflare 주소를 계속 사용할 수 있습니다. 잠깐의 네트워크 단절 후 **같은 프로세스**가 재연결하면 보통 주소가 유지되지만, Quick Tunnel에는 지속성/가용성 보장이 없습니다. 프로세스를 종료하고 다시 실행하면 새 주소가 발급됩니다. 터널 터미널과 게임 서버 터미널을 모두 켜두고 Mac의 전원/인터넷/절전을 관리하세요.

터미널 창을 닫아도 프로세스를 남기는 것과, 재부팅 후에도 주소를 고정하는 것은 다른 기능입니다. 임시 터널은 백그라운드로 실행해도 재시작 후 동일 주소를 보장하지 않습니다. 현재 주소를 쓰는 동안은 기존 방식이 가장 간단합니다.

```bash
# 터미널 1: 이 프로세스를 유지
cloudflared tunnel --url http://127.0.0.1:3001
# 터미널 2: 실제 출력된 주소로 시작
caffeinate -is npm run serve:public -- https://실제주소.trycloudflare.com
```

서버 코드 업데이트는 터널을 유지한 채 **게임 서버만** Ctrl+C로 종료하고 `git pull --ff-only`, `npm ci`, `npm run build`, 위 서버 명령을 다시 실행합니다. 그러면 터널 주소를 바꿀 필요가 없습니다.

## 고정 주소가 필요할 때

본인이 관리하는 도메인(예: `game.example.com`)을 Cloudflare에 연결하고 **named tunnel**을 사용합니다. 도메인 등록 비용/설정은 사용자가 진행합니다. GitHub 저장소 이름이나 localhost 주소는 외부 접속용 고정 도메인을 제공하지 않습니다.

[Mac 빠른 시작](MAC_SERVER_QUICKSTART.md)의 고정 도메인 절차대로 다음을 실행하고 `~/.cloudflared/config.yml`에 tunnel UUID / credentials-file / ingress를 구성합니다.

```bash
cloudflared tunnel login
cloudflared tunnel create loa-rogue
cloudflared tunnel route dns loa-rogue game.example.com
```

```yaml
tunnel: 실제_UUID
credentials-file: /Users/실제사용자/.cloudflared/실제_UUID.json
ingress:
  - hostname: game.example.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

먼저 두 터미널에서 수동 실행하고 휴대전화 모바일 데이터로 가입/로그인/도전 시작/전투/새로고침 복구를 확인합니다.

```bash
# 프로젝트 루트, 터미널1
caffeinate -is npm run serve:public -- https://game.example.com
# 터미널2
cloudflared tunnel run loa-rogue
```

이 named tunnel은 재시작해도 같은 DNS 주소를 사용할 수 있습니다. 아래 백그라운드 운영은 고정 주소와 named tunnel을 수동 검증한 뒤 사용하세요.

## 터미널을 닫아도 실행: macOS LaunchAgent

이 기능은 사용자의 Mac에서만 설치합니다. 저장소를 `/Users/사용자/Projects/loa-rogue`처럼 유지할 경로에 두세요. Node22/cloudflared가 설치되어 있고, `.env`, 빌드, named tunnel 인증/설정이 준비되어 있어야 합니다. 기본 서버 포트는3001입니다. 포트를 변경했다면 config.yml의 service도 맞추세요.

1. 기존 서버와 터널을 Ctrl+C로 종료합니다(같은 포트의 중복 실행 방지).
2. 프로젝트 루트에서 정의 파일을 생성합니다. `.env` 비밀키를 plist 안에 복사하지 않으며, 기존 생성 파일이 있으면 덮어쓰지 않습니다.

```bash
npm run mac:services -- https://game.example.com --tunnel loa-rogue --print
npm run mac:services -- https://game.example.com --tunnel loa-rogue
```

cloudflared를 찾지 못하면 위 명령 끝에 `--cloudflared /실제/cloudflared/경로`를 붙입니다(`which cloudflared`로 확인). 생성만으로 서비스를 설치하거나 실행하지 않습니다.

3. 생성 결과를 검토하고 설치합니다. 기존 같은 이름의 LaunchAgent가 있으면 덮어쓰지 말고 기존 설정부터 확인하세요. `cp -n`은 기존 파일을 보존합니다.

```bash
mkdir -p ~/Library/LaunchAgents
cp -n data/macos-launchagents/com.loa-rogue.server.plist ~/Library/LaunchAgents/
cp -n data/macos-launchagents/com.loa-rogue.tunnel.plist ~/Library/LaunchAgents/
plutil -lint ~/Library/LaunchAgents/com.loa-rogue.server.plist
plutil -lint ~/Library/LaunchAgents/com.loa-rogue.tunnel.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.loa-rogue.server.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.loa-rogue.tunnel.plist
```

4. 실행 상태와 실제 HTTPS 접속을 확인합니다.

```bash
launchctl print gui/$(id -u)/com.loa-rogue.server
launchctl print gui/$(id -u)/com.loa-rogue.tunnel
curl -fsS https://game.example.com/api/health
tail -n 40 ~/Library/Logs/loa-rogue/com.loa-rogue.server.error.log
tail -n 40 ~/Library/Logs/loa-rogue/com.loa-rogue.tunnel.error.log
```

서버가 실패하면 먼저 로그를 확인하세요. Node 또는 프로젝트 경로 이동, 이미 실행 중인 서버, 잘못된 도메인/터널 설정이 대표 원인입니다. 생성 파일에는 당시의 절대 경로가 있으므로 경로가 바뀌면 파일을 다시 생성/설치해야 합니다.

### 업데이트와 정지

업데이트는 서버 서비스를 먼저 내려 DB 백업과 설치/빌드를 마친 다음 다시 시작합니다. 터널은 유지해도 됩니다.

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.loa-rogue.server.plist
# 프로젝트 루트: 기존 이름을 덮어쓰지 않는 백업 경로 사용
mkdir -p backups
npm run db:backup -- ./backups/before-update.sqlite
git pull --ff-only
npm ci
npm run build
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.loa-rogue.server.plist
```

터널까지 정지하려면:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.loa-rogue.tunnel.plist
```

LaunchAgent는 **사용자 로그인 중** 터미널 창과 무관하게 실행되고 비정상 종료 시 다시 시작합니다. 로그아웃 시 중단되며 재부팅 후에는 해당 사용자 로그인 후 시작합니다. 로그인 전 자동 운영용 시스템 LaunchDaemon 설치는 포함하지 않습니다. Mac의 종료/인터넷 단절 시 접속은 불가능하며, caffeinate도 노트북 덮개를 닫은 상태의 서비스를 보장하지 않습니다. 로그 로테이션/디스크 사용량 관리, 정기 DB 백업은 별도 운영 작업입니다.

현재 클라우드에서는 plist 생성 형식만 검증할 수 있습니다. 실제 Mac의 launchctl 실행, 도메인·Cloudflare 연결은 사용자 Mac에서 검증해야 합니다.
