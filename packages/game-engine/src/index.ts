import {
  HEROES,
  HERO_SKILLS,
  BASIC,
  MONSTERS,
  type BattleState,
  type Fighter,
  type Skill,
  type BattleAction,
  type HeroId,
} from "@loa/shared";
export class BattleRuleError extends Error {}
export interface Upgrade {
  hp_level?: number;
  attack_level?: number;
  defense_level?: number;
  speed_level?: number;
  crit_level?: number;
}
export function heroFighter(id: HeroId, u: Upgrade = {}): Fighter {
  const h = HEROES.find((h) => h.id === id)!;
  const hp = Math.floor(h.hp * (1 + 0.02 * (u.hp_level ?? 0)));
  return {
    id,
    heroId: id,
    name: h.name,
    hp,
    maxHp: hp,
    attack: Math.floor(h.attack * (1 + 0.015 * (u.attack_level ?? 0))),
    defense: Math.floor(h.defense * (1 + 0.015 * (u.defense_level ?? 0))),
    speed: h.speed * (1 + 0.005 * (u.speed_level ?? 0)),
    crit: 0.05 + 0.005 * (u.crit_level ?? 0) + (id === "nineveh" ? 0.15 : 0),
    stagger: 100,
    maxStagger: 100,
    staggered: false,
    immunity: 0,
    shield: 0,
    shieldTurns: 0,
    statuses: [],
    cooldowns: {},
    gauge: 0,
    boss: false,
  };
}
// Xorshift32: the complete RNG state is persisted only on the server.
export function random(b: BattleState): number {
  let x = b.rng | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  b.rng = x >>> 0;
  return b.rng / 4294967296;
}
function log(
  b: BattleState,
  kind: BattleState["logs"][number]["kind"],
  actor: string,
  text: string,
  target?: string,
  amount?: number,
) {
  b.logs.push({
    id: ++b.logSequence,
    turn: b.turn,
    kind,
    actor,
    text,
    target,
    amount,
  });
  b.logs = b.logs.slice(-100);
}
export function encounter(
  party: Fighter[],
  floor: number,
  rng: number,
  potions = 3,
  rank: "normal" | "elite" = "normal",
): BattleState {
  if (floor < 1 || floor > 100 || !Number.isInteger(floor))
    throw new BattleRuleError("층 범위 오류");
  const boss = floor % 10 === 0;
  const band = Math.min(4, Math.floor((floor - 1) / 20));
  const scale = 1 + (floor - 1) * 0.045;
  const picker = { rng: rng >>> 0 || 1 } as BattleState;
  const pool = MONSTERS.filter((m) =>
    boss ? m.floor === floor : m.region === band && m.rank === rank,
  );
  const enemy = (i: number): Fighter => {
    const m = pool[Math.floor(random(picker) * pool.length)];
    const hp = Math.floor(m.hp * scale),
      stagger = m.rank === "boss" ? 140 : m.rank === "elite" ? 100 : 65;
    return {
      id: `enemy_${floor}_${i}`,
      templateId: m.id,
      name: m.name,
      hp,
      maxHp: hp,
      attack: Math.floor(m.attack * scale),
      defense: Math.floor(m.defense * scale),
      speed: m.speed,
      crit: 0.05,
      stagger,
      maxStagger: stagger,
      staggered: false,
      immunity: 0,
      shield: 0,
      shieldTurns: 0,
      statuses: [],
      cooldowns: {},
      gauge: 0,
      boss,
      ai: m.ai,
      element: m.element,
      model: m.model,
      color: m.color,
      primarySkill: structuredClone(m.skill),
      pattern: m.pattern ? structuredClone(m.pattern) : undefined,
      phase: 1,
    };
  };
  const b: BattleState = {
    party: structuredClone(party),
    enemies: Array.from(
      {
        length:
          !boss && floor % 15 === 0 ? 3 : !boss && floor % 5 === 0 ? 2 : 1,
      },
      (_, i) => enemy(i),
    ),
    activeHero: Math.max(
      0,
      party.findIndex((h) => h.hp > 0),
    ),
    activeEnemy: 0,
    turn: 0,
    needsSwitch: false,
    outcome: "ongoing",
    potions,
    rng: picker.rng,
    logs: [],
    logSequence: 0,
  };
  b.rng = picker.rng;
  for (const h of b.party) {
    h.statuses = [];
    h.shield = 0;
    h.shieldTurns = 0;
    h.stagger = h.maxStagger;
    h.staggered = false;
    h.immunity = 0;
    h.cooldowns = {};
  }
  log(b, "system", "system", `${floor}층 ${boss ? "보스전" : "전투"} 시작`);
  return b;
}
function speed(f: Fighter) {
  const slow = f.statuses.find((s) => s.kind === "slow");
  return f.speed * (1 - (slow?.power ?? 0) / 100);
}
function disabled(b: BattleState, f: Fighter): boolean {
  if (f.staggered) {
    f.staggered = false;
    f.stagger = f.maxStagger;
    f.immunity = f.boss ? 3 : 0;
    if (f.boss) f.statuses = f.statuses.filter((s) => s.kind !== "stun");
    log(b, "status", f.id, `${f.name} 무력화로 행동 불가`);
    return true;
  }
  const stun = f.statuses.find((s) => s.kind === "stun");
  if (stun) {
    stun.turns--;
    f.statuses = f.statuses.filter((s) => s.turns > 0);
    log(b, "status", f.id, `${f.name} 기절로 행동 불가`);
    return true;
  }
  return false;
}
function applySkill(
  b: BattleState,
  actor: Fighter,
  target: Fighter,
  skill: Skill,
) {
  log(b, "attack", actor.id, `${actor.name}: ${skill.name}`, target.id);
  if (skill.power > 0) {
    const attack =
      actor.attack *
      (actor.heroId === "thirain" && actor.hp <= actor.maxHp / 2 ? 1.2 : 1);
    const crit = random(b) < actor.crit;
    const modifier =
      (crit ? 1.5 : 1) *
      (actor.heroId === "shandi" && speed(actor) > speed(target) ? 1.15 : 1) *
      (target.heroId === "balthorr" ? 0.8 : 1);
    const damage = Math.max(
      1,
      Math.floor(
        ((skill.power * attack) / (attack + 0.6 * target.defense)) *
          modifier *
          (0.95 + 0.1 * random(b)),
      ),
    );
    const absorbed = Math.min(target.shield, damage);
    target.shield -= absorbed;
    const dealt = damage - absorbed;
    target.hp = Math.max(0, target.hp - dealt);
    log(
      b,
      "attack",
      actor.id,
      `${target.name} ${dealt} 피해${crit ? " · 치명타" : ""}${absorbed ? ` · 보호막 ${absorbed} 흡수` : ""}`,
      target.id,
      dealt,
    );
    target.gauge = Math.min(100, target.gauge + 10);
  }
  if (
    skill.stagger > 0 &&
    target.hp > 0 &&
    target.immunity === 0 &&
    !target.staggered
  ) {
    target.stagger = Math.max(
      0,
      target.stagger - skill.stagger - (actor.heroId === "wei" ? 8 : 0),
    );
    if (target.stagger === 0) {
      target.staggered = true;
      log(b, "status", target.id, `${target.name} 무력화! 다음 행동 1회 봉쇄`);
    }
  }
  if (skill.effect && target.hp > 0) {
    if (target.boss && target.immunity > 0 && skill.effect === "stun")
      log(b, "status", target.id, `${target.name} 기절 면역`);
    else {
      const status = {
        kind: skill.effect,
        turns: skill.duration ?? 2,
        power: skill.effectPower ?? 0,
        appliedTurn: b.turn,
      };
      target.statuses = target.statuses.filter((s) => s.kind !== skill.effect);
      target.statuses.push(status);
    }
  }
  if (skill.heal) {
    const amount = Math.min(
      actor.maxHp - actor.hp,
      Math.floor(skill.heal * (actor.heroId === "azena_inanna" ? 1.3 : 1)),
    );
    actor.hp += amount;
    log(
      b,
      "heal",
      actor.id,
      `${actor.name} HP ${amount} 회복`,
      actor.id,
      amount,
    );
  }
  if (skill.shield) {
    actor.shield = Math.max(actor.shield, skill.shield);
    actor.shieldTurns = 3;
    log(b, "status", actor.id, `${actor.name} 보호막 ${actor.shield} (3턴)`);
  }
  if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown + 1;
  actor.gauge = skill.ultimate ? 0 : Math.min(100, actor.gauge + 25);
}
function aiSkill(b: BattleState, e: Fighter): Skill {
  if (e.primarySkill) {
    const phase =
      (e.phase ?? 1) > 1 ||
      !!(e.pattern && e.hp <= e.maxHp * e.pattern.threshold);
    const multiplier = phase ? (e.pattern?.multiplier ?? 1) : 1;
    if (e.pattern && (b.turn + 1) % e.pattern.interval === 0)
      return {
        ...e.pattern.skill,
        power: Math.floor(e.pattern.skill.power * multiplier),
      };
    if (e.ai === "heal" && e.hp < e.maxHp / 2 && (b.turn + 1) % 3 === 0)
      return {
        id: "heal",
        name: "생명 흡수",
        power: 0,
        stagger: 0,
        heal: Math.ceil(e.maxHp * 0.12),
        cooldown: 0,
      };
    if (e.ai === "guard" && (b.turn + 1) % 3 === 0)
      return {
        ...e.primarySkill,
        name: "수호 장벽",
        shield: Math.ceil(e.maxHp * 0.15),
        power: 12,
      };
    if (e.ai === "pattern" && !e.pattern && (b.turn + 1) % 3 === 0)
      return {
        ...e.primarySkill,
        name: "마력 폭주",
        power: 35,
        effect: "slow",
        duration: 2,
        effectPower: 25,
      };
    if (e.ai === "status" && (b.turn + 1) % 2 !== 0)
      return {
        ...e.primarySkill,
        effect: undefined,
        power: Math.floor(e.primarySkill.power * multiplier),
      };
    return {
      ...e.primarySkill,
      power: Math.floor(
        e.primarySkill.power *
          multiplier *
          (e.ai === "rage" && e.hp < e.maxHp / 2 ? 1.35 : 1),
      ),
    };
  }
  if (e.boss && (b.turn + 1) % 3 === 0)
    return {
      id: "boss_charge",
      name: "예고된 파괴의 일격",
      power: e.hp <= e.maxHp / 2 ? 65 : 50,
      stagger: 35,
      cooldown: 0,
    };
  if (e.ai === "heal" && e.hp < e.maxHp / 2 && (b.turn + 1) % 3 === 0)
    return {
      id: "enemy_heal",
      name: "혼의 회복",
      power: 0,
      stagger: 0,
      cooldown: 0,
      heal: 20,
    };
  if (e.ai === "guard" && (b.turn + 1) % 3 === 0)
    return { ...BASIC, power: 16, shield: 20, name: "방패 밀치기" };
  if (e.ai === "status" && (b.turn + 1) % 2 === 0)
    return {
      ...BASIC,
      power: 15,
      effect: "burn",
      duration: 2,
      effectPower: 5,
      name: "불타는 발톱",
    };
  return {
    ...BASIC,
    power: e.boss ? 28 : 18,
    stagger: e.ai === "stagger" ? 28 : 15,
    name: "적의 공격",
  };
}
export function enemyIntent(
  b: Pick<BattleState, "turn" | "enemies" | "activeEnemy">,
): string {
  const e = b.enemies[b.activeEnemy];
  if (!e) return "";
  return aiSkill(b as BattleState, e).name;
}
export function step(input: BattleState, action: BattleAction): BattleState {
  if (input.outcome !== "ongoing")
    throw new BattleRuleError("이미 종료된 전투입니다.");
  const b = structuredClone(input);
  const current = b.party[b.activeHero];
  let selectedSkill: Skill = BASIC;
  let switchIndex = -1;
  if (action.type === "switch") {
    switchIndex = b.party.findIndex((h) => h.id === action.heroId);
    if (
      switchIndex < 0 ||
      switchIndex === b.activeHero ||
      b.party[switchIndex].hp <= 0
    )
      throw new BattleRuleError("살아 있는 대기 영웅만 교체할 수 있습니다.");
  }
  if (b.needsSwitch) {
    if (action.type !== "switch")
      throw new BattleRuleError("전투 불능 영웅을 교체하세요.");
    b.activeHero = switchIndex;
    b.needsSwitch = false;
    log(
      b,
      "switch",
      action.heroId,
      `${b.party[switchIndex].name} 강제 교체 · 턴 소모 없음`,
    );
    return b;
  }
  if (action.type === "skill") {
    const found = (HERO_SKILLS[current.heroId ?? ""] ?? []).find(
      (s) => s.id === action.skillId,
    );
    if (!found) throw new BattleRuleError("해당 영웅의 스킬이 아닙니다.");
    selectedSkill = found;
    if ((current.cooldowns[found.id] ?? 0) > 0)
      throw new BattleRuleError("아직 재사용 대기 중입니다.");
    if (found.ultimate && current.gauge < 100)
      throw new BattleRuleError("궁극기 게이지가 부족합니다.");
  }
  if (
    action.type === "potion" &&
    (b.potions <= 0 || current.hp >= current.maxHp)
  )
    throw new BattleRuleError("회복약이 없거나 HP가 가득 찼습니다.");
  const enemy = b.enemies[b.activeEnemy];
  if (
    enemy.pattern &&
    (enemy.phase ?? 1) === 1 &&
    enemy.hp <= enemy.maxHp * enemy.pattern.threshold
  ) {
    enemy.phase = 2;
    const mechanic = enemy.pattern.mechanic;
    if (mechanic === "shield") {
      enemy.shield = Math.max(enemy.shield, Math.ceil(enemy.maxHp * 0.2));
      enemy.shieldTurns = 4;
    }
    if (mechanic === "heal")
      enemy.hp = Math.min(
        enemy.maxHp,
        enemy.hp + Math.ceil(enemy.maxHp * 0.15),
      );
    if (mechanic === "stagger") {
      current.stagger = Math.max(0, current.stagger - 35);
      if (current.stagger === 0) current.staggered = true;
    }
    log(
      b,
      "system",
      enemy.id,
      `${enemy.name} 2페이즈: ${{ shield: "보호막 생성", heal: "생명 회복", stagger: "충격파", enrage: "광폭화" }[mechanic]}`,
    );
  }
  const enemySkill = aiSkill(b, enemy);
  b.turn++;
  const heroMove = () => {
    const hero = b.party[b.activeHero];
    if (hero.hp <= 0 || disabled(b, hero)) return;
    if (action.type === "switch") return;
    if (action.type === "potion") {
      b.potions--;
      const amount = Math.min(
        hero.maxHp - hero.hp,
        Math.ceil(hero.maxHp * 0.4),
      );
      hero.hp += amount;
      log(
        b,
        "heal",
        hero.id,
        `${hero.name} 회복약: HP ${amount} 회복`,
        hero.id,
        amount,
      );
    } else if (enemy.hp > 0) applySkill(b, hero, enemy, selectedSkill);
  };
  const enemyMove = () => {
    const hero = b.party[b.activeHero];
    if (enemy.hp > 0 && hero.hp > 0 && !disabled(b, enemy))
      applySkill(b, enemy, hero, enemySkill);
  };
  if (action.type === "switch") {
    // Voluntary switch has priority and consumes this round's hero action.
    b.activeHero = switchIndex;
    log(
      b,
      "switch",
      action.heroId,
      `${b.party[switchIndex].name} 자발적 교체 · 1턴 소모`,
    );
    enemyMove();
  } else if (
    speed(current) > speed(enemy) ||
    (speed(current) === speed(enemy) && random(b) < 0.5)
  ) {
    heroMove();
    enemyMove();
  } else {
    enemyMove();
    heroMove();
  }
  for (const f of [...b.party, ...b.enemies]) {
    for (const key of Object.keys(f.cooldowns))
      f.cooldowns[key] = Math.max(0, f.cooldowns[key] - 1);
    f.immunity = Math.max(0, f.immunity - 1);
    if (f.shieldTurns > 0 && --f.shieldTurns === 0) f.shield = 0;
    if (f.hp <= 0) continue;
    for (const status of f.statuses) {
      if (status.kind === "burn" || status.kind === "bleed") {
        const dealt = Math.min(f.hp, status.power);
        f.hp -= dealt;
        log(
          b,
          "status",
          f.id,
          `${f.name} ${status.kind === "burn" ? "화상" : "출혈"} ${dealt} 피해`,
          f.id,
          dealt,
        );
        status.turns--;
      } else if (status.kind === "slow" && status.appliedTurn < b.turn)
        status.turns--;
    }
    f.statuses = f.statuses.filter((s) => s.turns > 0);
  }
  if (!b.party.some((h) => h.hp > 0)) {
    b.outcome = "defeat";
    log(b, "system", "system", "파티 전멸");
  } else if (!b.enemies.some((e) => e.hp > 0)) {
    b.outcome = "victory";
    log(b, "system", "system", "전투 승리");
  } else {
    if (enemy.hp <= 0) {
      b.activeEnemy = b.enemies.findIndex((e) => e.hp > 0);
      log(
        b,
        "switch",
        b.enemies[b.activeEnemy].id,
        `${b.enemies[b.activeEnemy].name} 다음 적 출전`,
      );
    }
    b.needsSwitch = b.party[b.activeHero].hp <= 0;
  }
  return b;
}
