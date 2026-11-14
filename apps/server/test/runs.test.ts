import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../src/app.js";
import { encounter, heroFighter } from "@loa/game-engine";
const origin = "http://localhost:5173";
const config = {
  secret: "test-runs-secret-with-more-than-32-characters",
  origin,
  production: false,
};
type App = Awaited<ReturnType<typeof createApp>>;
const action = (revision = 0) => ({ actionId: randomUUID(), revision });
async function user(app: App, username = "run_user") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin },
    payload: {
      ...action(),
      username,
      password: "strong-password",
      nickname: "원정대",
    },
  });
  assert.equal(response.statusCode, 201, response.body);
  return {
    headers: {
      origin,
      cookie: String(response.headers["set-cookie"]).split(";")[0],
    },
    account: response.json().account,
  };
}
async function fixture(fn: (app: App, path: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "loa-runs-"));
  const path = join(dir, "test.sqlite");
  const app = await createApp({ ...config, databasePath: path });
  try {
    await fn(app, path);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
const post = (
  app: App,
  url: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
) => app.inject({ method: "POST", url, headers, payload });
test("start snapshots party, hides server RNG, is idempotent, limits active runs and checks ownership", () =>
  fixture(async (app) => {
    const one = await user(app);
    const two = await user(app, "run_two");
    const payload = action();
    const started = await post(app, "/api/runs", one.headers, payload);
    assert.equal(started.statusCode, 201, started.body);
    const { run, account } = started.json();
    assert.equal(run.floor, 1);
    assert.equal(account.revision, 1);
    assert.equal(run.partyCost, 12);
    assert.equal(run.battle.rng, undefined);
    assert.equal(run.seed, undefined);
    const replay = await post(app, "/api/runs", one.headers, payload);
    assert.deepEqual(replay.json(), started.json());
    assert.equal(
      (await post(app, "/api/runs", one.headers, action(1))).statusCode,
      409,
    );
    assert.equal(
      (await app.inject({ url: `/api/runs/${run.id}`, headers: two.headers }))
        .statusCode,
      404,
    );
    assert.equal(
      (
        await post(app, `/api/runs/${run.id}/battle-action`, two.headers, {
          ...action(),
          action: { type: "attack" },
        })
      ).statusCode,
      404,
    );
    await app.inject({
      method: "PUT",
      url: "/api/party",
      headers: one.headers,
      payload: { ...action(1), heroIds: ["shandi"] },
    });
    const saved = await app.inject({
      url: "/api/runs/active",
      headers: one.headers,
    });
    assert.deepEqual(
      saved.json().run.battle.party.map((h: { id: string }) => h.id),
      ["wei", "nineveh", "thirain", "balthorr"],
    );
  }));
test("battle actions are atomic, reject illegal skills/tampering, preserve RNG on failure and detect races", () =>
  fixture(async (app) => {
    const u = await user(app);
    const start = (await post(app, "/api/runs", u.headers, action())).json()
      .run;
    const url = `/api/runs/${start.id}/battle-action`;
    const illegal = await post(app, url, u.headers, {
      ...action(),
      action: { type: "skill", skillId: "wei_u" },
    });
    assert.equal(illegal.statusCode, 400);
    assert.equal(
      (
        await post(app, url, u.headers, {
          ...action(),
          action: { type: "attack" },
          damage: 999,
        })
      ).statusCode,
      400,
    );
    const original = (
      await app.inject({ url: `/api/runs/${start.id}`, headers: u.headers })
    ).json().run;
    assert.deepEqual(original, start);
    const payload = { ...action(), action: { type: "attack" } };
    const moved = await post(app, url, u.headers, payload);
    assert.equal(moved.statusCode, 200, moved.body);
    assert.equal(moved.json().run.revision, 1);
    assert.deepEqual(
      (await post(app, url, u.headers, payload)).json(),
      moved.json(),
    );
    assert.equal(
      (
        await post(app, url, u.headers, {
          ...payload,
          action: { type: "switch", heroId: "nineveh" },
        })
      ).statusCode,
      409,
    );
    const raced = await Promise.all([
      post(app, url, u.headers, { ...action(1), action: { type: "attack" } }),
      post(app, url, u.headers, {
        ...action(1),
        action: { type: "switch", heroId: "nineveh" },
      }),
    ]);
    assert.deepEqual(raced.map((r) => r.statusCode).sort(), [200, 409]);
  }));
test("real first-floor fight, reward choice exactly once, next floor and abandon payout exactly once", () =>
  fixture(async (app) => {
    const u = await user(app);
    let run = (await post(app, "/api/runs", u.headers, action())).json().run;
    for (let i = 0; i < 12 && run.stage === "battle"; i++) {
      const r = await post(
        app,
        `/api/runs/${run.id}/battle-action`,
        u.headers,
        { ...action(run.revision), action: { type: "attack" } },
      );
      assert.equal(r.statusCode, 200, r.body);
      run = r.json().run;
    }
    assert.equal(run.stage, "reward");
    assert.equal(run.completedFloor, 1);
    const reward = { ...action(run.revision), choice: "gold" };
    const selected = await post(
      app,
      `/api/runs/${run.id}/select-reward`,
      u.headers,
      reward,
    );
    assert.equal(selected.statusCode, 200);
    run = selected.json().run;
    assert.equal(run.floor, 2);
    assert.equal(run.gold, 30);
    assert.deepEqual(
      (
        await post(app, `/api/runs/${run.id}/select-reward`, u.headers, reward)
      ).json(),
      selected.json(),
    );
    assert.equal(
      (
        await post(app, `/api/runs/${run.id}/select-reward`, u.headers, {
          ...action(run.revision),
          choice: "heal",
        })
      ).statusCode,
      409,
    );
    const abandon = action(run.revision);
    const ended = await post(
      app,
      `/api/runs/${run.id}/abandon`,
      u.headers,
      abandon,
    );
    assert.equal(ended.statusCode, 200);
    assert.equal(ended.json().run.status, "abandoned");
    assert.equal(ended.json().account.crystals, 5);
    assert.deepEqual(
      (
        await post(app, `/api/runs/${run.id}/abandon`, u.headers, abandon)
      ).json(),
      ended.json(),
    );
    assert.equal(
      (
        await post(
          app,
          `/api/runs/${run.id}/abandon`,
          u.headers,
          action(run.revision + 1),
        )
      ).statusCode,
      409,
    );
    const records = (
      await app.inject({ url: "/api/records", headers: u.headers })
    ).json().records;
    assert.equal(records.length, 1);
    assert.equal(records[0].crystals_awarded, 5);
    assert.equal(
      (await app.inject({ url: "/api/runs/active", headers: u.headers })).json()
        .run,
      null,
    );
  }));
test("100th floor clear and first-clear bonus are credited once, subsequent clear has no first bonus", () =>
  fixture(async (app, path) => {
    const u = await user(app);
    for (const [revision, expected, total] of [
      [0, 2500, 2500],
      [2, 1500, 4000],
    ]) {
      const run = (
        await post(app, "/api/runs", u.headers, action(revision))
      ).json().run;
      const battle = encounter([heroFighter("wei")], 100, 5);
      battle.enemies[0].hp = 1;
      battle.party[0].speed = 999;
      const db = new DatabaseSync(path);
      try {
        db.prepare(
          "UPDATE runs SET floor=100,completed_floor=99,battle_json=? WHERE id=?",
        ).run(JSON.stringify(battle), run.id);
      } finally {
        db.close();
      }
      const payload = { ...action(), action: { type: "attack" } };
      const won = await post(
        app,
        `/api/runs/${run.id}/battle-action`,
        u.headers,
        payload,
      );
      assert.equal(won.statusCode, 200, won.body);
      assert.equal(won.json().run.status, "cleared");
      assert.equal(won.json().run.completedFloor, 100);
      assert.equal(won.json().run.crystalsAwarded, expected);
      assert.equal(won.json().account.crystals, total);
      assert.deepEqual(
        (
          await post(
            app,
            `/api/runs/${run.id}/battle-action`,
            u.headers,
            payload,
          )
        ).json(),
        won.json(),
      );
    }
  }));
test("defeat credits reached floor reward exactly once", () =>
  fixture(async (app, path) => {
    const u = await user(app);
    const run = (await post(app, "/api/runs", u.headers, action())).json().run;
    const b = encounter([heroFighter("wei")], 7, 99);
    b.party[0].hp = 1;
    b.enemies[0].speed = 999;
    const db = new DatabaseSync(path);
    try {
      db.prepare(
        "UPDATE runs SET floor=7,completed_floor=6,battle_json=? WHERE id=?",
      ).run(JSON.stringify(b), run.id);
    } finally {
      db.close();
    }
    const payload = { ...action(), action: { type: "attack" } };
    const lost = await post(
      app,
      `/api/runs/${run.id}/battle-action`,
      u.headers,
      payload,
    );
    assert.equal(lost.json().run.status, "defeated");
    assert.equal(lost.json().account.crystals, 70);
    assert.deepEqual(
      (
        await post(app, `/api/runs/${run.id}/battle-action`, u.headers, payload)
      ).json(),
      lost.json(),
    );
  }));
test("active battle survives server restart with identical confirmed state", async () => {
  const dir = mkdtempSync(join(tmpdir(), "loa-battle-restart-"));
  const path = join(dir, "test.sqlite");
  let app = await createApp({ ...config, databasePath: path });
  try {
    const u = await user(app);
    const run = (await post(app, "/api/runs", u.headers, action())).json().run;
    const moved = await post(
      app,
      `/api/runs/${run.id}/battle-action`,
      u.headers,
      { ...action(), action: { type: "skill", skillId: "wei_1" } },
    );
    assert.equal(moved.statusCode, 200);
    await app.close();
    app = await createApp({ ...config, databasePath: path });
    const restored = await app.inject({
      url: "/api/runs/active",
      headers: u.headers,
    });
    assert.deepEqual(restored.json().run, moved.json().run);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
