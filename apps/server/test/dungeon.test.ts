import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../src/app.js";
import {
  EQUIPMENT_TEMPLATES,
  RANDOM_EVENTS,
  RECIPES,
  type DungeonState,
  type EventType,
  type RunView,
  type Rarity,
  type BattleState,
} from "@loa/shared";
const origin = "http://localhost:5173",
  config = {
    secret: "dungeon-test-secret-more-than-32-characters",
    origin,
    production: false,
  };
type App = Awaited<ReturnType<typeof createApp>>;
const action = (revision = 0) => ({ actionId: randomUUID(), revision });
async function fixture(fn: (c: Context) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "loa-dungeon-"));
  const path = join(dir, "db.sqlite");
  const app = await createApp({ ...config, databasePath: path });
  const registered = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin },
    payload: {
      ...action(),
      username: "dungeon_user",
      password: "strong-password",
      nickname: "원정대",
    },
  });
  assert.equal(registered.statusCode, 201);
  const headers = {
    origin,
    cookie: String(registered.headers["set-cookie"]).split(";")[0],
  };
  const started = await app.inject({
    method: "POST",
    url: "/api/runs",
    headers,
    payload: action(),
  });
  assert.equal(started.statusCode, 201, started.body);
  const c: Context = {
    app,
    path,
    headers,
    run: started.json().run,
    userId: registered.json().account.id,
  };
  try {
    await fn(c);
  } finally {
    await c.app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
interface Context {
  app: App;
  path: string;
  headers: Record<string, string>;
  run: RunView;
  userId: string;
}
function dbUse<T>(c: Context, fn: (db: DatabaseSync) => T) {
  const db = new DatabaseSync(c.path);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
async function refresh(c: Context) {
  const r = await c.app.inject({
    url: `/api/runs/${c.run.id}`,
    headers: c.headers,
  });
  assert.equal(r.statusCode, 200);
  c.run = r.json().run;
  return c.run;
}
async function command(
  c: Context,
  suffix: string,
  extra: Record<string, unknown> = {},
  status = 200,
) {
  const payload = { ...action(c.run.revision), ...extra };
  const r = await c.app.inject({
    method: "POST",
    url: `/api/runs/${c.run.id}/${suffix}`,
    headers: c.headers,
    payload,
  });
  assert.equal(r.statusCode, status, r.body);
  if (status === 200) c.run = r.json().run;
  return { response: r, payload };
}
function modify(
  c: Context,
  fn: (world: DungeonState, battle: BattleState) => void,
) {
  dbUse(c, (db) => {
    const row = db
      .prepare("SELECT dungeon_json,battle_json FROM runs WHERE id=?")
      .get(c.run.id)!;
    const w = JSON.parse(String(row.dungeon_json)),
      b = JSON.parse(String(row.battle_json));
    fn(w, b);
    db.prepare("UPDATE runs SET dungeon_json=?,battle_json=? WHERE id=?").run(
      JSON.stringify(w),
      JSON.stringify(b),
      c.run.id,
    );
  });
}
async function room(c: Context, type: EventType) {
  modify(c, (w) => {
    w.phase = "choice";
    w.candidates = [{ id: `fixture_${type}`, type }];
  });
  await refresh(c);
  await command(c, "select-event", { candidateId: `fixture_${type}` });
}
function gear(
  c: Context,
  template = "bronze_sword",
  rarity: Rarity = 0,
  count = 1,
) {
  const t = EQUIPMENT_TEMPLATES.find((t) => t.id === template)!;
  const ids: string[] = [];
  dbUse(c, (db) => {
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      ids.push(id);
      db.prepare("INSERT INTO run_equipment VALUES (?,?,?,?,?,?,NULL,?)").run(
        id,
        c.run.id,
        t.id,
        rarity,
        t.slot,
        JSON.stringify(t.stats),
        Date.now() + i,
      );
    }
  });
  return ids;
}
test("three distinct persisted candidates, selected event and reveal survive refresh, arbitrary candidates rejected", () =>
  fixture(async (c) => {
    assert.equal(c.run.stage, "event");
    assert.equal(c.run.dungeon!.phase, "choice");
    assert.equal(c.run.dungeon!.candidates.length, 3);
    assert.equal(new Set(c.run.dungeon!.candidates.map((o) => o.type)).size, 3);
    assert.equal(c.run.dungeon!.riftId, undefined);
    const initial = structuredClone(c.run);
    await refresh(c);
    assert.deepEqual(c.run, initial);
    await command(c, "select-event", { candidateId: "forged" }, 400);
    assert.equal(c.run.revision, initial.revision);
    await command(c, "battle-action", { action: { type: "attack" } }, 409);
    const choice = initial.dungeon!.candidates.find(
      (o) => o.type === "battle",
    )!;
    const chosen = await command(c, "select-event", { candidateId: choice.id });
    assert.equal(c.run.stage, "battle");
    const replay = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/select-event`,
      headers: c.headers,
      payload: chosen.payload,
    });
    assert.deepEqual(replay.json(), chosen.response.json());
    await command(c, "select-event", { candidateId: choice.id }, 400);
    const saved = dbUse(
      c,
      (db) =>
        db
          .prepare(
            "SELECT selected_event,status FROM run_events WHERE run_id=? AND floor=1",
          )
          .get(c.run.id)!,
    );
    assert.equal(saved.selected_event, "battle");
    assert.equal(saved.status, "active");
  }));
test("rest and treasure can only resolve once, complete and advance; floor ten is a mandatory unique boss", () =>
  fixture(async (c) => {
    modify(c, (_w, b) => {
      for (const h of b.party) h.hp = 30;
    });
    await room(c, "rest");
    await command(c, "rest");
    assert.ok(c.run.battle.party[0].hp > 30);
    await command(c, "rest", {}, 400);
    await command(c, "continue");
    assert.equal(c.run.floor, 2);
    assert.equal(c.run.dungeon!.phase, "choice");
    await room(c, "treasure");
    const opened = await command(c, "treasure/open");
    assert.equal(c.run.equipment!.length, 1);
    assert.equal(c.run.gold, 75 + 50);
    await command(c, "treasure/open", {}, 400);
    const duplicate = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/treasure/open`,
      headers: c.headers,
      payload: opened.payload,
    });
    assert.deepEqual(duplicate.json(), opened.response.json());
    dbUse(c, (db) =>
      db
        .prepare("UPDATE runs SET floor=9,completed_floor=9 WHERE id=?")
        .run(c.run.id),
    );
    await refresh(c);
    await command(c, "continue");
    assert.equal(c.run.floor, 10);
    assert.equal(c.run.stage, "battle");
    assert.equal(c.run.dungeon!.selected, "boss");
    assert.equal(c.run.battle.enemies[0].templateId, "boss_10");
  }));
test("shop fixed offers, atomic purchase replay, stock and insufficient balance, potion cap and ownership", () =>
  fixture(async (c) => {
    await room(c, "shop");
    const initial = structuredClone(c.run.dungeon!.offers);
    await refresh(c);
    assert.deepEqual(c.run.dungeon!.offers, initial);
    const offer = initial.find(
      (o) => o.kind === "equipment" && o.price === 40,
    )!;
    const bought = await command(c, "shop/buy", { offerId: offer.id });
    assert.equal(c.run.gold, 35);
    assert.equal(c.run.equipment!.length, 1);
    const replay = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/shop/buy`,
      headers: c.headers,
      payload: bought.payload,
    });
    assert.deepEqual(replay.json(), bought.response.json());
    await command(c, "shop/buy", { offerId: offer.id }, 400);
    assert.equal(c.run.gold, 35);
    await command(
      c,
      "shop/buy",
      { offerId: initial.find((o) => o.price === 120)!.id },
      400,
    );
    await command(c, "shop/buy", { offerId: randomUUID() }, 400);
    modify(c, (_w, b) => {
      b.potions = 9;
    });
    await refresh(c);
    await command(c, "shop/buy", { offerId: initial[0].id }, 400);
    await command(
      c,
      "equipment/equip",
      { itemId: randomUUID(), target: "wei" },
      400,
    );
  }));
test("capacity 60 prevents gear reward/purchase without consuming gold, stock or RNG; salvage unblocks it", () =>
  fixture(async (c) => {
    await room(c, "shop");
    const ids = gear(c, "bronze_sword", 0, 60);
    await refresh(c);
    const offer = c.run.dungeon!.offers.find(
      (o) => o.kind === "equipment" && o.price === 40,
    )!;
    const before = dbUse(c, (db) =>
      db
        .prepare("SELECT gold,battle_json,dungeon_json FROM runs WHERE id=?")
        .get(c.run.id),
    );
    await command(c, "shop/buy", { offerId: offer.id }, 400);
    assert.deepEqual(
      dbUse(c, (db) =>
        db
          .prepare("SELECT gold,battle_json,dungeon_json FROM runs WHERE id=?")
          .get(c.run.id),
      ),
      before,
    );
    await command(c, "equipment/salvage", { itemId: ids[0] });
    assert.equal(c.run.equipment!.length, 59);
    assert.equal(c.run.gold, 80);
    await command(c, "shop/buy", { offerId: offer.id });
    assert.equal(c.run.equipment!.length, 60);
  }));
test("equip and replace slots, two party relic slots, no free healing and combat equipment changes rejected", () =>
  fixture(async (c) => {
    const [weapon] = gear(c),
      [second] = gear(c, "hunter_bow"),
      [armor] = gear(c, "iron_plate"),
      relics = gear(c, "ark_fragment", 2, 3);
    await refresh(c);
    const original = c.run.battle.party[0];
    await command(c, "equipment/equip", { itemId: weapon, target: "wei" });
    assert.equal(c.run.battle.party[0].attack, original.attack + 5);
    await command(c, "equipment/equip", { itemId: second, target: "wei" });
    assert.equal(
      c.run.equipment!.find((i) => i.id === weapon)!.equippedTo,
      null,
    );
    assert.equal(c.run.battle.party[0].attack, original.attack + 4);
    await command(c, "equipment/equip", { itemId: armor, target: "wei" });
    assert.equal(c.run.battle.party[0].maxHp, original.maxHp + 12);
    assert.equal(c.run.battle.party[0].hp, original.hp);
    await command(c, "equipment/unequip", { itemId: armor });
    await command(c, "equipment/equip", { itemId: armor, target: "wei" });
    assert.equal(c.run.battle.party[0].hp, original.hp);
    await command(c, "equipment/equip", {
      itemId: relics[0],
      target: "party:0",
    });
    await command(c, "equipment/equip", {
      itemId: relics[1],
      target: "party:1",
    });
    await command(c, "equipment/equip", {
      itemId: relics[2],
      target: "party:0",
    });
    assert.equal(
      c.run.equipment!.filter((i) => i.slot === "relic" && i.equippedTo).length,
      2,
    );
    assert.equal(c.run.battle.party[1].defense, 14);
    await command(c, "equipment/salvage", { itemId: armor }, 400);
    await command(
      c,
      "equipment/equip",
      { itemId: armor, target: "party:0" },
      400,
    );
    await command(
      c,
      "equipment/equip",
      { itemId: relics[0], target: "wei" },
      400,
    );
    await command(c, "select-event", {
      candidateId: c.run.dungeon!.candidates.find((o) => o.type === "battle")!
        .id,
    });
    await command(c, "equipment/unequip", { itemId: armor }, 400);
  }));
test("fusion consumes exactly three owned unequipped matching grade items; rejects duplication, relics and max rarity", () =>
  fixture(async (c) => {
    await room(c, "forge");
    const ids = gear(c, "bronze_sword", 0, 4);
    await refresh(c);
    await command(
      c,
      "equipment/fuse",
      { itemIds: [ids[0], ids[0], ids[1]] },
      400,
    );
    const fused = await command(c, "equipment/fuse", {
      itemIds: ids.slice(0, 3),
    });
    assert.equal(c.run.equipment!.length, 2);
    assert.ok(
      ids.slice(0, 3).every((id) => !c.run.equipment!.some((i) => i.id === id)),
    );
    assert.equal(c.run.equipment!.filter((i) => i.rarity === 1).length, 1);
    const replay = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/equipment/fuse`,
      headers: c.headers,
      payload: fused.payload,
    });
    assert.deepEqual(replay.json(), fused.response.json());
    await command(c, "equipment/fuse", { itemIds: ids.slice(0, 3) }, 400);
    const relics = gear(c, "ark_fragment", 0, 3);
    await command(c, "equipment/fuse", { itemIds: relics }, 400);
    const legendary = gear(c, "bronze_sword", 4, 3);
    await command(c, "equipment/fuse", { itemIds: legendary }, 400);
    const mismatch = [
      ...gear(c, "iron_plate", 0, 2),
      ...gear(c, "bronze_sword", 1),
    ];
    await command(c, "equipment/fuse", { itemIds: mismatch }, 400);
  }));
test("special recipes validate real materials, discover permanently and new runs reset inventory", () =>
  fixture(async (c) => {
    await room(c, "forge");
    const recipe = RECIPES[0];
    const ids = recipe.ingredients.flatMap((id) => gear(c, id));
    await refresh(c);
    await command(
      c,
      "equipment/craft",
      { itemIds: ids, recipeId: "forged" },
      400,
    );
    const crafted = await command(c, "equipment/craft", {
      itemIds: ids,
      recipeId: recipe.id,
    });
    assert.equal(c.run.equipment!.length, 1);
    assert.equal(c.run.equipment![0].templateId, recipe.output);
    assert.equal(c.run.equipment![0].rarity, 3);
    const replay = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/equipment/craft`,
      headers: c.headers,
      payload: crafted.payload,
    });
    assert.deepEqual(replay.json(), crafted.response.json());
    for (const formula of RECIPES.slice(1)) {
      const more = formula.ingredients.flatMap((id) => gear(c, id));
      await command(c, "equipment/craft", {
        itemIds: more,
        recipeId: formula.id,
      });
      assert.ok(c.run.equipment!.some((i) => i.templateId === formula.output));
    }
    const recipes = await c.app.inject({
      url: "/api/recipes",
      headers: c.headers,
    });
    assert.equal(recipes.json().recipes.length, 3);
    assert.deepEqual(
      recipes
        .json()
        .recipes.map((r: { id: string }) => r.id)
        .sort(),
      RECIPES.map((r) => r.id).sort(),
    );
    await command(c, "abandon");
    const me = (
      await c.app.inject({ url: "/api/auth/me", headers: c.headers })
    ).json().account;
    const fresh = await c.app.inject({
      method: "POST",
      url: "/api/runs",
      headers: c.headers,
      payload: action(me.revision),
    });
    assert.equal(fresh.statusCode, 201);
    assert.equal(fresh.json().run.equipment.length, 0);
    assert.equal(
      (await c.app.inject({ url: "/api/recipes", headers: c.headers })).json()
        .recipes.length,
      3,
    );
  }));
test("shop race with same revision commits once, cross-account inventory actions are rejected", () =>
  fixture(async (c) => {
    await room(c, "shop");
    const offer = c.run.dungeon!.offers[0];
    const payload = { ...action(c.run.revision), offerId: offer.id };
    const responses = await Promise.all(
      [payload, { ...payload, actionId: randomUUID() }].map((body) =>
        c.app.inject({
          method: "POST",
          url: `/api/runs/${c.run.id}/shop/buy`,
          headers: c.headers,
          payload: body,
        }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 409]);
    const other = await c.app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin },
      payload: {
        ...action(),
        username: "other_user",
        password: "strong-password",
        nickname: "다른계정",
      },
    });
    const cookie = String(other.headers["set-cookie"]).split(";")[0];
    const blocked = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/shop/buy`,
      headers: { origin, cookie },
      payload,
    });
    assert.equal(blocked.statusCode, 404);
  }));
for (const event of RANDOM_EVENTS)
  test(`rift ${event.id} reveals once and applies its actual choice`, () =>
    fixture(async (c) => {
      await room(c, "rift");
      const revealed = c.run.dungeon!.riftId;
      assert.ok(revealed);
      await refresh(c);
      assert.equal(c.run.dungeon!.riftId, revealed);
      modify(c, (w) => {
        w.riftId = event.id;
      });
      dbUse(c, (db) =>
        db.prepare("UPDATE runs SET gold=200 WHERE id=?").run(c.run.id),
      );
      await refresh(c);
      const before = structuredClone(c.run);
      const choice = event.choices[0];
      const result = await command(c, "random-event/choose", {
        choiceId: choice.id,
      });
      const replay = await c.app.inject({
        method: "POST",
        url: `/api/runs/${c.run.id}/random-event/choose`,
        headers: c.headers,
        payload: result.payload,
      });
      assert.deepEqual(replay.json(), result.response.json());
      await command(c, "random-event/choose", { choiceId: choice.id }, 400);
      if (choice.effect === "gear" || choice.effect === "relic")
        assert.equal(c.run.equipment!.length, 1);
      if (choice.effect === "shop") assert.equal(c.run.dungeon!.phase, "shop");
      if (choice.effect === "forge")
        assert.equal(c.run.dungeon!.phase, "forge");
      if (choice.effect === "battle" || choice.effect === "goblin")
        assert.equal(c.run.stage, "battle");
      if (choice.effect === "altar")
        assert.equal(
          c.run.battle.party[0].attack,
          before.battle.party[0].attack + 3,
        );
      if (choice.effect === "contract")
        assert.equal(
          c.run.battle.party[0].maxHp,
          before.battle.party[0].maxHp + 15,
        );
      if (choice.effect === "time")
        assert.equal(
          c.run.battle.party[0].speed,
          before.battle.party[0].speed + 2,
        );
      assert.equal(c.run.gold, 200 - (choice.cost ?? 0) + (choice.gold ?? 0));
    }));

test("shop stock, selected event and inventory remain identical after process restart", () =>
  fixture(async (c) => {
    await room(c, "shop");
    await command(c, "shop/buy", { offerId: c.run.dungeon!.offers[0].id });
    const itemId = gear(c, "iron_plate")[0];
    await command(c, "equipment/equip", { itemId, target: "wei" });
    await refresh(c);
    const expected = structuredClone(c.run);
    await c.app.close();
    c.app = await createApp({ ...config, databasePath: c.path });
    await refresh(c);
    assert.deepEqual(c.run, expected);
  }));
test("lethal random trap records defeat once, expensive choices reject without changes, alternate choices apply", () =>
  fixture(async (c) => {
    await room(c, "rift");
    modify(c, (w, b) => {
      w.riftId = "trap";
      for (const h of b.party) h.hp = 1;
    });
    dbUse(c, (db) =>
      db.prepare("UPDATE runs SET gold=0 WHERE id=?").run(c.run.id),
    );
    await refresh(c);
    const before = structuredClone(c.run);
    await command(c, "random-event/choose", { choiceId: "disarm" }, 400);
    assert.deepEqual(await refresh(c), before);
    await command(c, "random-event/choose", { choiceId: "force" });
    assert.equal(c.run.status, "defeated");
    assert.equal(c.run.completedFloor, 0);
    assert.equal(c.run.crystalsAwarded, 10);
    assert.equal(c.run.gold, 25);
    const records = (
      await c.app.inject({ url: "/api/records", headers: c.headers })
    ).json().records;
    assert.equal(records.length, 1);
  }));
test("goblin combat adds promised gold exactly once and all completed battles keep three fixed rewards", () =>
  fixture(async (c) => {
    await room(c, "rift");
    modify(c, (w) => {
      w.riftId = "treasure_goblin";
    });
    await refresh(c);
    await command(c, "random-event/choose", { choiceId: "chase" });
    modify(c, (_w, b) => {
      b.enemies = b.enemies.slice(0, 1);
      b.enemies[0].hp = 1;
      b.party[0].speed = 999;
    });
    await refresh(c);
    const won = await command(c, "battle-action", {
      action: { type: "attack" },
    });
    assert.equal(c.run.gold, 175);
    assert.equal(c.run.dungeon!.rewardChoices.length, 3);
    const rewards = structuredClone(c.run.dungeon!.rewardChoices);
    await refresh(c);
    assert.deepEqual(c.run.dungeon!.rewardChoices, rewards);
    const replay = await c.app.inject({
      method: "POST",
      url: `/api/runs/${c.run.id}/battle-action`,
      headers: c.headers,
      payload: won.payload,
    });
    assert.deepEqual(replay.json(), won.response.json());
    assert.equal(
      dbUse(
        c,
        (db) =>
          db.prepare("SELECT gold FROM runs WHERE id=?").get(c.run.id)!.gold,
      ),
      175,
    );
  }));
test("100th boss in the new dungeon pipeline clears and marks its event complete", () =>
  fixture(async (c) => {
    modify(c, (w) => {
      w.phase = "complete";
    });
    dbUse(c, (db) =>
      db
        .prepare("UPDATE runs SET floor=99,completed_floor=99 WHERE id=?")
        .run(c.run.id),
    );
    await refresh(c);
    await command(c, "continue");
    assert.equal(c.run.battle.enemies[0].templateId, "boss_100");
    modify(c, (_w, b) => {
      b.enemies[0].hp = 1;
      b.party[0].speed = 999;
    });
    await refresh(c);
    await command(c, "battle-action", { action: { type: "attack" } });
    assert.equal(c.run.status, "cleared");
    assert.equal(c.run.completedFloor, 100);
    assert.equal(c.run.crystalsAwarded, 2500);
    assert.equal(
      dbUse(
        c,
        (db) =>
          db
            .prepare(
              "SELECT status FROM run_events WHERE run_id=? AND floor=100",
            )
            .get(c.run.id)!.status,
      ),
      "complete",
    );
  }));
test("legacy active run without dungeon metadata completes its old fight and migrates at next floor", () =>
  fixture(async (c) => {
    const b = structuredClone(c.run.battle) as BattleState;
    b.rng = 123;
    b.enemies[0].hp = 1;
    b.enemies[0].primarySkill = undefined;
    b.enemies[0].pattern = undefined;
    b.party[0].speed = 999;
    dbUse(c, (db) =>
      db
        .prepare("UPDATE runs SET dungeon_json=NULL,battle_json=? WHERE id=?")
        .run(JSON.stringify(b), c.run.id),
    );
    await refresh(c);
    assert.equal(c.run.dungeon, undefined);
    await command(c, "battle-action", { action: { type: "attack" } });
    assert.equal(c.run.stage, "reward");
    await command(c, "select-reward", { choice: "heal" });
    assert.equal(c.run.floor, 2);
    assert.equal(c.run.stage, "event");
    assert.equal(c.run.dungeon!.candidates.length, 3);
    assert.equal(c.run.battle.party.length, 4);
  }));
test("equipped crafting materials, mismatched recipe parts and repeated material IDs never get consumed", () =>
  fixture(async (c) => {
    await room(c, "forge");
    const ids = gear(c, "bronze_sword", 0, 3);
    await command(c, "equipment/equip", { itemId: ids[0], target: "wei" });
    const before = structuredClone(c.run.equipment);
    await command(c, "equipment/fuse", { itemIds: ids }, 400);
    await command(
      c,
      "equipment/craft",
      { itemIds: ids, recipeId: "sun_oath" },
      400,
    );
    await refresh(c);
    assert.deepEqual(c.run.equipment, before);
    await command(c, "equipment/unequip", { itemId: ids[0] });
    await command(
      c,
      "equipment/craft",
      { itemIds: ids, recipeId: "sun_oath" },
      400,
    );
    await command(
      c,
      "equipment/craft",
      { itemIds: [ids[0], ids[0], ids[1]], recipeId: "sun_oath" },
      400,
    );
    assert.equal((await refresh(c)).equipment!.length, 3);
  }));
