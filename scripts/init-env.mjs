import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) console.log("Existing .env preserved.");
else {
  writeFileSync(
    ".env",
    `PORT=3001\nHOST=127.0.0.1\nDATABASE_PATH=./data/loa.sqlite\nSESSION_SECRET=${randomBytes(48).toString("hex")}\nPUBLIC_ORIGIN=http://localhost:5173\nNODE_ENV=development\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log("Created local .env with a random session secret.");
}
