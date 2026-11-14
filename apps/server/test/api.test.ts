import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../src/app.js";
import { HEROES } from "@loa/shared";
const origin = "http://localhost:5173";
const base = {
  secret: "a-test-secret-at-least-32-characters-long",
  origin,
  production: false,
};
const action = (revision = 0) => ({ actionId: randomUUID(), revision });
type App = Awaited<ReturnType<typeof createApp>>;
async function register(app: App, email = "one@example.com") {
  const payload = {
    ...action(),
    email,
    password: "a-secure-password",
    nickname: "원정대장",
  };
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin },
    payload,
  });
  assert.equal(response.statusCode, 201, response.body);
  return {
    cookie: response.headers["set-cookie"]!.toString().split(";")[0],
    account: response.json().account,
    payload,
    response,
  };
}
async function fixture(fn: (app: App, path: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "loa-test-"));
  const path = join(dir, "game.sqlite");
  const app = await createApp({ ...base, databasePath: path });
  try {
    await fn(app, path);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
test("registration atomically creates account, six upgrades, currency and secure hashed session", () =>
  fixture(async (app, path) => {
    const { account, cookie, response } = await register(app);
    assert.equal(account.crystals, 0);
    assert.equal(account.revision, 0);
    assert.equal(account.party.length, 4);
    assert.equal(account.password_hash, undefined);
    assert.match(String(response.headers["set-cookie"]), /HttpOnly/);
    assert.match(String(response.headers["set-cookie"]), /SameSite=Strict/);
    const db = new DatabaseSync(path);
    try {
      assert.match(
        String(
          db.prepare("SELECT password_hash FROM users").get()!.password_hash,
        ),
        /^\$argon2id\$/,
      );
      assert.equal(
        db.prepare("SELECT COUNT(*) n FROM hero_upgrades").get()!.n,
        6,
      );
      assert.notEqual(
        db.prepare("SELECT id_hash FROM sessions").get()!.id_hash,
        cookie.split("=")[1],
      );
      assert.equal(
        db.prepare("PRAGMA integrity_check").get()!.integrity_check,
        "ok",
      );
      assert.equal(
        db.prepare("PRAGMA journal_mode").get()!.journal_mode,
        "wal",
      );
    } finally {
      db.close();
    }
    const me = await app.inject({ url: "/api/auth/me", headers: { cookie } });
    assert.equal(me.json().account.id, account.id);
  }));
test("register idempotency, conflicting payload and duplicate email", () =>
  fixture(async (app) => {
    const { payload, response } = await register(app);
    const replay = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin },
      payload,
    });
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), response.json());
    assert.equal(replay.headers["set-cookie"], response.headers["set-cookie"]);
    const conflict = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin },
      payload: { ...payload, nickname: "다른이름" },
    });
    assert.equal(conflict.statusCode, 409);
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin },
      payload: { ...payload, ...action() },
    });
    assert.equal(duplicate.statusCode, 409);
  }));
test("login validation, case normalized email, idempotent login, session logout and replay", () =>
  fixture(async (app) => {
    const { cookie } = await register(app);
    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin },
      payload: { ...action(), email: "one@example.com", password: "wrong" },
    });
    assert.equal(bad.statusCode, 401);
    const payload = {
      ...action(),
      email: "ONE@example.com",
      password: "a-secure-password",
    };
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin },
      payload,
    });
    assert.equal(login.statusCode, 200);
    const replay = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin },
      payload,
    });
    assert.equal(replay.headers["set-cookie"], login.headers["set-cookie"]);
    const logout = { ...action() };
    const headers = { origin, cookie };
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/logout",
          headers,
          payload: logout,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/logout",
          headers,
          payload: logout,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ url: "/api/auth/me", headers: { cookie } }))
        .statusCode,
      401,
    );
    const newCookie = String(login.headers["set-cookie"]).split(";")[0];
    assert.equal(
      (
        await app.inject({
          url: "/api/auth/me",
          headers: { cookie: newCookie },
        })
      ).statusCode,
      200,
    );
  }));
test("authentication, CSRF, strict schema, body limit and production secure cookie", () =>
  fixture(async (app) => {
    assert.equal((await app.inject({ url: "/api/heroes" })).statusCode, 401);
    const payload = {
      ...action(),
      email: "new@example.com",
      password: "a-secure-password",
      nickname: "대장",
    };
    for (const headers of [{}, { origin: "https://evil.example" }])
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/api/auth/register",
            headers,
            payload,
          })
        ).statusCode,
        403,
      );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/register",
          headers: { origin },
          payload: { ...payload, crystals: 999 },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/register",
          headers: { origin },
          payload: { ...payload, nickname: "x".repeat(18000) },
        })
      ).statusCode,
      413,
    );
    const production = await createApp({
      ...base,
      databasePath: ":memory:",
      production: true,
      origin: "https://game.example",
    });
    try {
      const r = await production.inject({
        method: "POST",
        url: "/api/auth/register",
        headers: { origin: "https://game.example" },
        payload,
      });
      assert.equal(r.statusCode, 201);
      assert.match(String(r.headers["set-cookie"]), /Secure/);
    } finally {
      await production.close();
    }
  }));
test("party rejects cost overflow, unknown heroes, duplicates, empty and oversized parties without updates", () =>
  fixture(async (app) => {
    const { cookie } = await register(app);
    const headers = { origin, cookie };
    for (const heroIds of [
      HEROES.map((h) => h.id),
      ["wei", "wei"],
      [],
      ["unknown"],
      Array(7).fill("wei"),
    ]) {
      const r = await app.inject({
        method: "PUT",
        url: "/api/party",
        headers,
        payload: { ...action(), heroIds },
      });
      assert.equal(r.statusCode, 400, r.body);
    }
    const me = await app.inject({ url: "/api/auth/me", headers: { cookie } });
    assert.equal(me.json().account.revision, 0);
  }));
test("party order, exact retry, conflicting action, stale revision, and account isolation", () =>
  fixture(async (app) => {
    const one = await register(app);
    const two = await register(app, "two@example.com");
    const payload = { ...action(), heroIds: ["balthorr", "wei", "nineveh"] };
    const headers = { origin, cookie: one.cookie };
    const r = await app.inject({
      method: "PUT",
      url: "/api/party",
      headers,
      payload,
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().account.revision, 1);
    assert.deepEqual(r.json().account.party, payload.heroIds);
    const replay = await app.inject({
      method: "PUT",
      url: "/api/party",
      headers,
      payload,
    });
    assert.deepEqual(replay.json(), r.json());
    const conflict = await app.inject({
      method: "PUT",
      url: "/api/party",
      headers,
      payload: { ...payload, heroIds: ["wei"] },
    });
    assert.equal(conflict.statusCode, 409);
    const stale = await app.inject({
      method: "PUT",
      url: "/api/party",
      headers,
      payload: { ...payload, ...action() },
    });
    assert.equal(stale.statusCode, 409);
    const other = await app.inject({
      url: "/api/auth/me",
      headers: { cookie: two.cookie },
    });
    assert.deepEqual(other.json().account.party, two.account.party);
  }));
test("parallel party requests commit only once at a given revision", () =>
  fixture(async (app) => {
    const { cookie } = await register(app);
    const results = await Promise.all(
      ["wei", "shandi"].map((id) =>
        app.inject({
          method: "PUT",
          url: "/api/party",
          headers: { origin, cookie },
          payload: { ...action(), heroIds: [id] },
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
  }));
test("server applies permanent cost reductions and minimum cost when validating all six heroes", () =>
  fixture(async (app, path) => {
    const { cookie, account } = await register(app);
    const db = new DatabaseSync(path);
    try {
      db.prepare(
        "UPDATE hero_upgrades SET cost_reduction=1 WHERE user_id=?",
      ).run(account.id);
    } finally {
      db.close();
    }
    const heroes = await app.inject({
      url: "/api/heroes",
      headers: { cookie },
    });
    assert.deepEqual(
      heroes.json().heroes.map((h: { currentCost: number }) => h.currentCost),
      [2, 3, 2, 3, 4, 1],
    );
    const r = await app.inject({
      method: "PUT",
      url: "/api/party",
      headers: { origin, cookie },
      payload: { ...action(), heroIds: HEROES.map((h) => h.id) },
    });
    assert.equal(r.statusCode, 200, r.body);
  }));
test("expired sessions cannot read or mutate", () =>
  fixture(async (app, path) => {
    const { cookie } = await register(app);
    const db = new DatabaseSync(path);
    try {
      db.exec("UPDATE sessions SET expires_at=0");
    } finally {
      db.close();
    }
    assert.equal(
      (await app.inject({ url: "/api/auth/me", headers: { cookie } }))
        .statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/party",
          headers: { origin, cookie },
          payload: { ...action(), heroIds: ["wei"] },
        })
      ).statusCode,
      401,
    );
  }));
test("saved party and session survive closing and reopening server", async () => {
  const dir = mkdtempSync(join(tmpdir(), "loa-restart-"));
  const path = join(dir, "game.sqlite");
  let app = await createApp({ ...base, databasePath: path });
  try {
    const { cookie } = await register(app);
    await app.inject({
      method: "PUT",
      url: "/api/party",
      headers: { origin, cookie },
      payload: { ...action(), heroIds: ["shandi", "wei"] },
    });
    await app.close();
    app = await createApp({ ...base, databasePath: path });
    const me = await app.inject({ url: "/api/auth/me", headers: { cookie } });
    assert.equal(me.statusCode, 200);
    assert.deepEqual(me.json().account.party, ["shandi", "wei"]);
    assert.equal(me.json().account.revision, 1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("auth attempts are rate limited", () =>
  fixture(async (app) => {
    const payload = { email: "unknown@example.com", password: "wrong" };
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/api/auth/login",
            headers: { origin },
            payload: { ...payload, ...action() },
          })
        ).statusCode,
        401,
      );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          headers: { origin },
          payload: { ...payload, ...action() },
        })
      ).statusCode,
      429,
    );
  }));
