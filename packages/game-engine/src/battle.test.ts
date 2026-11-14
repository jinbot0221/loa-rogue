import { test } from "node:test";
import assert from "node:assert/strict";
import { HEROES, HERO_SKILLS, type BattleState } from "@loa/shared";
import { heroFighter, encounter, step, BattleRuleError } from "./index.js";
const battle = (
  ids: Parameters<typeof heroFighter>[0][] = ["wei", "nineveh"],
  floor = 1,
) =>
  encounter(
    ids.map((id) => heroFighter(id)),
    floor,
    12345,
  );
const tough = (b: BattleState) => {
  b.enemies[0].hp = b.enemies[0].maxHp = 10000;
  return b;
};
test("seeded battle is deterministic and never mutates caller state", () => {
  const b = battle();
  const original = structuredClone(b);
  assert.deepEqual(step(b, { type: "attack" }), step(b, { type: "attack" }));
  assert.deepEqual(b, original);
});
test("speed priority prevents defeated opponent from acting", () => {
  const b = battle();
  b.enemies[0].hp = 1;
  const next = step(b, { type: "attack" });
  assert.equal(next.outcome, "victory");
  assert.equal(next.party[0].hp, b.party[0].hp);
  const slow = battle(["wei"]);
  slow.enemies[0].speed = 999;
  slow.enemies[0].attack = 999;
  slow.party[0].hp = 1;
  const lost = step(slow, { type: "attack" });
  assert.equal(lost.outcome, "defeat");
  assert.equal(lost.enemies[0].hp, slow.enemies[0].hp);
});
test("voluntary switch consumes a turn and incoming hero receives enemy attack", () => {
  const b = battle();
  const next = step(b, { type: "switch", heroId: "nineveh" });
  assert.equal(next.turn, 1);
  assert.equal(next.activeHero, 1);
  assert.equal(next.party[0].hp, b.party[0].hp);
  assert.ok(next.party[1].hp < b.party[1].hp);
  assert.equal(next.enemies[0].hp, b.enemies[0].hp);
});
test("forced switch consumes no turn, potion or enemy action", () => {
  const b = battle();
  b.party[0].hp = 1;
  b.enemies[0].speed = 999;
  const down = step(b, { type: "attack" });
  assert.equal(down.needsSwitch, true);
  assert.throws(() => step(down, { type: "attack" }), BattleRuleError);
  const next = step(down, { type: "switch", heroId: "nineveh" });
  assert.equal(next.turn, down.turn);
  assert.equal(next.party[1].hp, down.party[1].hp);
  assert.equal(next.needsSwitch, false);
});
test("boss stagger blocks exactly one action then grants two full rounds of immunity", () => {
  const b = tough(battle(["wei"], 10));
  b.party[0].speed = 999;
  b.enemies[0].stagger = 1;
  const next = step(b, { type: "attack" });
  assert.equal(next.enemies[0].stagger, next.enemies[0].maxStagger);
  assert.equal(next.enemies[0].immunity, 2);
  assert.equal(next.party[0].hp, b.party[0].hp);
  const second = step(next, { type: "attack" });
  assert.equal(second.enemies[0].stagger, second.enemies[0].maxStagger);
  assert.equal(second.enemies[0].immunity, 1);
  const third = step(second, { type: "attack" });
  assert.equal(third.enemies[0].stagger, third.enemies[0].maxStagger);
  assert.equal(third.enemies[0].immunity, 0);
});
test("stun inflicted after a fast enemy action remains until next enemy action", () => {
  const b = tough(battle(["shandi"]));
  b.enemies[0].speed = 999;
  const next = step(b, { type: "skill", skillId: "shandi_2" });
  assert.ok(next.enemies[0].statuses.some((s) => s.kind === "stun"));
  const follow = step(next, { type: "attack" });
  assert.equal(follow.party[0].hp, next.party[0].hp);
  assert.ok(!follow.enemies[0].statuses.some((s) => s.kind === "stun"));
});
test("burn and bleed tick twice and expire; DoT bypasses shield", () => {
  const b = tough(battle());
  const hero = b.party[0];
  hero.shield = 1000;
  hero.shieldTurns = 10;
  hero.statuses = [
    { kind: "burn", turns: 2, power: 5, appliedTurn: 0 },
    { kind: "bleed", turns: 2, power: 3, appliedTurn: 0 },
  ];
  const next = step(b, { type: "attack" });
  assert.equal(next.party[0].hp, hero.hp - 8);
  const second = step(next, { type: "attack" });
  assert.equal(second.party[0].hp, hero.hp - 16);
  assert.deepEqual(second.party[0].statuses, []);
});
test("slow changes initiative and nonstacking status refreshes duration", () => {
  const b = tough(battle(["shandi"]));
  b.enemies[0].speed = 30;
  const slowed = step(b, { type: "skill", skillId: "shandi_1" });
  assert.equal(
    slowed.enemies[0].statuses.find((s) => s.kind === "slow")?.turns,
    3,
  );
  const next = step(slowed, { type: "attack" });
  const moves = next.logs.filter((l) => l.turn === 2 && l.kind === "attack");
  assert.equal(moves[0].actor, "shandi");
});
test("cooldowns and ultimate requirements reject illegal actions without advancing RNG", () => {
  const b = tough(battle());
  assert.throws(() => step(b, { type: "skill", skillId: "wei_u" }), /게이지/);
  assert.throws(() => step(b, { type: "skill", skillId: "nineveh_1" }), /스킬/);
  const next = step(b, { type: "skill", skillId: "wei_1" });
  assert.equal(next.party[0].cooldowns.wei_1, 2);
  assert.throws(() => step(next, { type: "skill", skillId: "wei_1" }), /대기/);
  let charged = structuredClone(next);
  charged.party[0].gauge = 100;
  charged = step(charged, { type: "skill", skillId: "wei_u" });
  assert.ok(charged.logs.some((l) => l.text.includes("도철의 포효")));
  assert.ok(charged.party[0].gauge <= 10);
});
test("six heroes each have two distinct skills and one functioning ultimate", () => {
  for (const hero of HEROES) {
    assert.equal(HERO_SKILLS[hero.id].length, 3);
    for (const skill of HERO_SKILLS[hero.id]) {
      const b = tough(battle([hero.id]));
      b.party[0].gauge = 100;
      b.party[0].hp -= 30;
      const next = step(b, { type: "skill", skillId: skill.id });
      assert.ok(
        next.logs.some((l) => l.text.includes(skill.name)),
        skill.name,
      );
    }
  }
});
test("healing passive, shield absorption, potion inventory and full HP rejection", () => {
  const b = tough(battle(["azena_inanna"]));
  b.party[0].hp = 30;
  b.enemies[0].staggered = true;
  const next = step(b, { type: "skill", skillId: "azena_2" });
  assert.equal(next.party[0].hp, 75);
  const guard = tough(battle(["balthorr"]));
  const shield = step(guard, { type: "skill", skillId: "balthorr_2" });
  assert.ok(shield.party[0].shield > 0);
  assert.throws(() => step(battle(), { type: "potion" }), /HP/);
  const hurt = battle();
  hurt.party[0].hp = 50;
  const healed = step(hurt, { type: "potion" });
  assert.equal(healed.potions, 2);
  assert.ok(healed.party[0].hp > 50);
  hurt.potions = 0;
  assert.throws(() => step(hurt, { type: "potion" }), /회복약/);
});
test("reserve enemies enter alone and cannot attack on the same round as previous defeat", () => {
  const b = battle(["wei"], 5);
  b.enemies[0].hp = 1;
  const next = step(b, { type: "attack" });
  assert.equal(next.outcome, "ongoing");
  assert.equal(next.activeEnemy, 1);
  assert.equal(next.party[0].hp, b.party[0].hp);
  assert.equal(next.enemies[1].hp, b.enemies[1].hp);
});
test("floor boundaries, boss every ten floors and immutable cost-free forced validation", () => {
  for (let floor = 1; floor <= 100; floor++)
    assert.equal(battle(["wei"], floor).enemies[0].boss, floor % 10 === 0);
  assert.throws(() => battle(["wei"], 101), /층/);
  const b = battle();
  b.party[1].hp = 0;
  assert.throws(() => step(b, { type: "switch", heroId: "nineveh" }), /살아/);
});
test("boss recovery clears pending stun; three-enemy encounters still have only one active enemy", () => {
  const b = tough(battle(["wei"], 10));
  b.party[0].speed = 999;
  b.enemies[0].stagger = 1;
  const next = step(b, { type: "skill", skillId: "wei_2" });
  assert.equal(next.enemies[0].immunity, 2);
  assert.ok(!next.enemies[0].statuses.some((s) => s.kind === "stun"));
  const three = battle(["wei"], 15);
  assert.equal(three.enemies.length, 3);
  assert.equal(three.activeEnemy, 0);
});
