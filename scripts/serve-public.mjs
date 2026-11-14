import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
const value = process.argv[2]?.trim().replace(/\/+$/, "");
let origin;
try {
  const url = new URL(value ?? "");
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.username ||
    url.password
  )
    throw new Error();
  origin = url.origin;
} catch {
  console.error(
    "사용법: npm run serve:public -- https://실제주소.trycloudflare.com",
  );
  process.exit(1);
}
if (!existsSync("apps/server/dist/index.js")) {
  console.error("프로젝트 루트에서 npm run build 를 먼저 실행하세요.");
  process.exit(1);
}
console.log(`공유 서버 시작 · 허용 접속 주소: ${origin}`);
const child = spawn(process.execPath, ["apps/server/dist/index.js"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PUBLIC_ORIGIN: origin },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
