import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "loa-browser-"));
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3002",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : undefined,
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
      DATABASE_PATH: join(dir, "e2e.sqlite"),
    },
  },
});
