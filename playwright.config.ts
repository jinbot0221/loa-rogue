import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dbPath =
  process.env.LOA_E2E_DATABASE ??
  join(mkdtempSync(join(tmpdir(), "loa-browser-")), "e2e.sqlite");
process.env.LOA_E2E_DATABASE = dbPath;
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3002",
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3002/api/health",
    reuseExistingServer: false,
    env: {
      PORT: "3002",
      HOST: "127.0.0.1",
      PUBLIC_ORIGIN: "http://127.0.0.1:3002",
      NODE_ENV: "test",
      SESSION_SECRET: "browser-test-only-secret-at-least-32-characters",
      DATABASE_PATH: dbPath,
    },
  },
});
