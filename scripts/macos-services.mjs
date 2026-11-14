// Generate service definitions only. The user installs them on their own Mac.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
const args = process.argv.slice(2);
const print = args.includes("--print");
function option(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const origin = args[0]?.replace(/\/+$/, "");
const tunnel = option("--tunnel");
try {
  const u = new URL(origin ?? "");
  if (
    u.protocol !== "https:" ||
    u.origin !== origin ||
    u.hostname.endsWith(".trycloudflare.com") ||
    u.username ||
    u.password
  )
    throw new Error();
} catch {
  console.error(
    "고정 도메인이 필요합니다: npm run mac:services -- https://game.example.com --tunnel loa-rogue [--print]",
  );
  process.exit(1);
}
if (!tunnel || !/^[a-zA-Z0-9_-]+$/.test(tunnel)) {
  console.error("--tunnel 에 기존 named tunnel 이름 또는 UUID를 입력하세요.");
  process.exit(1);
}
if (process.platform !== "darwin" && !print) {
  console.error(
    "Mac에서 실행하세요. --print로 파일 내용을 미리 확인할 수 있습니다.",
  );
  process.exit(1);
}
const root = process.cwd();
if (
  !existsSync(join(root, "apps/server/dist/index.js")) ||
  !existsSync(join(root, ".env"))
) {
  console.error("프로젝트 루트에서 env:init과 build를 먼저 실행하세요.");
  process.exit(1);
}
const cloudflared =
  option("--cloudflared") ??
  spawnSync("which", ["cloudflared"], { encoding: "utf8" }).stdout?.trim();
if (!cloudflared || (!print && !existsSync(cloudflared))) {
  console.error(
    "cloudflared를 설치하거나 --cloudflared /실제/경로 를 지정하세요.",
  );
  process.exit(1);
}
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const logs = join(homedir(), "Library/Logs/loa-rogue");
function plist(label, command) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(label)}</string>
<key>ProgramArguments</key><array>${command.map((s) => `<string>${xml(s)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(dirname(process.execPath))}:/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key><string>${xml(join(logs, label + ".log"))}</string>
<key>StandardErrorPath</key><string>${xml(join(logs, label + ".error.log"))}</string>
</dict></plist>\n`;
}
const files = {
  "com.loa-rogue.server.plist": plist("com.loa-rogue.server", [
    "/usr/bin/caffeinate",
    "-is",
    process.execPath,
    "--env-file=.env",
    join(root, "scripts/serve-public.mjs"),
    origin,
  ]),
  "com.loa-rogue.tunnel.plist": plist("com.loa-rogue.tunnel", [
    cloudflared,
    "tunnel",
    "run",
    tunnel,
  ]),
};
if (print) {
  for (const [name, content] of Object.entries(files))
    console.log(`--- ${name} ---\n${content}`);
} else {
  const output = resolve("data/macos-launchagents");
  mkdirSync(output, { recursive: true });
  mkdirSync(logs, { recursive: true });
  for (const name of Object.keys(files))
    if (existsSync(join(output, name))) {
      console.error(
        `기존 파일을 보존했습니다: ${join(output, name)}. 이동/검토 후 다시 실행하세요.`,
      );
      process.exit(1);
    }
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(output, name), content, { flag: "wx", mode: 0o600 });
  console.log(
    `생성 완료: ${output}\n아직 서비스는 설치/실행하지 않았습니다. docs/FIXED_ADDRESS.md의 launchctl 절차를 따르세요.`,
  );
}
