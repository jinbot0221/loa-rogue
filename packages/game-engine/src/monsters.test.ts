import { test } from "node:test";
import assert from "node:assert/strict";
import { MONSTERS, RANDOM_EVENTS } from "@loa/shared";
import { encounter, heroFighter, enemyIntent, step } from "./index.js";
test("50 unique monsters cover exact region/rank distribution, seven AI types and six reusable models", () => {
  assert.equal(MONSTERS.length, 50);
  assert.equal(new Set(MONSTERS.map((m) => m.id)).size, 50);
  for (const [rank, count] of [
    ["normal", 30],
    ["elite", 10],
    ["boss", 10],
  ] as const)
    assert.equal(MONSTERS.filter((m) => m.rank === rank).length, count);
  for (let region = 0; region < 5; region++) {
    assert.equal(
      MONSTERS.filter((m) => m.region === region && m.rank === "normal").length,
      6,
    );
    assert.equal(
      MONSTERS.filter((m) => m.region === region && m.rank === "elite").length,
      2,
    );
    assert.equal(
      MONSTERS.filter((m) => m.region === region && m.rank === "boss").length,
      2,
    );
  }
  assert.equal(new Set(MONSTERS.map((m) => m.ai)).size, 7);
  assert.equal(new Set(MONSTERS.map((m) => m.model)).size, 6);
});
test("all 100 floors select from correct normal/elite pools and mandatory boss id every ten floors", () => {
  for (let floor = 1; floor <= 100; floor++)
    for (const rank of ["normal", "elite"] as const) {
      const b = encounter([heroFighter("wei")], floor, 123456 * floor, 3, rank);
      for (const e of b.enemies) {
        const template = MONSTERS.find((m) => m.id === e.templateId)!;
        assert.ok(template);
        assert.equal(template.rank, floor % 10 === 0 ? "boss" : rank);
        assert.equal(template.region, Math.floor((floor - 1) / 20));
        if (floor % 10 === 0) assert.equal(template.floor, floor);
        assert.ok(e.primarySkill);
      }
    }
});
test("ten boss telegraphs, phase transitions and actual shield/heal/stagger/enrage mechanics function", () => {
  const bosses = MONSTERS.filter((m) => m.rank === "boss");
  assert.equal(new Set(bosses.map((m) => m.pattern!.skill.name)).size, 10);
  for (const boss of bosses) {
    const b = encounter([heroFighter("azena_inanna")], boss.floor!, 123);
    const e = b.enemies[0];
    b.turn = e.pattern!.interval - 1;
    assert.equal(enemyIntent(b), e.pattern!.skill.name);
    b.turn = 0;
    e.hp = Math.floor(e.maxHp * e.pattern!.threshold) - 1;
    e.speed = 0;
    b.party[0].hp = b.party[0].maxHp = 10000;
    const previous = e.hp;
    const next = step(b, { type: "skill", skillId: "azena_2" });
    assert.equal(next.enemies[0].phase, 2);
    assert.ok(next.logs.some((l) => l.text.includes("2페이즈")));
    if (e.pattern!.mechanic === "heal")
      assert.ok(next.enemies[0].hp > previous);
    if (e.pattern!.mechanic === "shield") assert.ok(next.enemies[0].shield > 0);
    if (e.pattern!.mechanic === "stagger")
      assert.ok(next.party[0].stagger < 100);
  }
});
test("twelve unique random events have 40/30/20/10 category weights and valid nonempty effect choices", () => {
  assert.equal(RANDOM_EVENTS.length, 12);
  assert.equal(new Set(RANDOM_EVENTS.map((e) => e.id)).size, 12);
  for (const [category, weight] of [
    ["positive", 40],
    ["danger", 30],
    ["choice", 20],
    ["rare", 10],
  ] as const)
    assert.equal(
      RANDOM_EVENTS.filter((e) => e.category === category).reduce(
        (n, e) => n + e.weight,
        0,
      ),
      weight,
    );
  for (const event of RANDOM_EVENTS) {
    assert.ok(event.choices.length > 0);
    assert.equal(
      new Set(event.choices.map((c) => c.id)).size,
      event.choices.length,
    );
  }
});
test("status boss has gaps between stun casts so the hero is not permanently action-locked", () => {
  let b = encounter([heroFighter("wei")], 40, 991);
  b.enemies[0].hp = b.enemies[0].maxHp = 100000;
  b.party[0].shield = 10000;
  b.party[0].shieldTurns = 100;
  for (let i = 0; i < 8; i++) b = step(b, { type: "attack" });
  assert.ok(
    b.logs.filter(
      (l) =>
        l.kind === "attack" &&
        l.actor === "wei" &&
        l.text.includes("기본 공격"),
    ).length >= 2,
  );
});
