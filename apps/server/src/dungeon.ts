import type { DatabaseSync } from "node:sqlite";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  EVENT_INFO,
  EQUIPMENT_TEMPLATES,
  EQUIPMENT_LIMIT,
  RECIPES,
  RANDOM_EVENTS,
  MONSTERS,
  mutationSchema,
  eventSelectSchema,
  riftChoiceSchema,
  shopBuySchema,
  equipmentItemSchema,
  equipmentEquipSchema,
  equipmentFuseSchema,
  equipmentCraftSchema,
  type DungeonState,
  type Equipment,
  type Rarity,
  type BattleState,
  type RunView,
  type PublicDungeon,
  type EventType,
  type GearStats,
  type RewardKind,
} from "@loa/shared";
import { random, encounter } from "@loa/game-engine";
import type { RunRow, Context } from "./runs.js";
class DungeonError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (message: string): never => {
  throw new DungeonError(400, message);
};
export class DungeonService {
  constructor(private db: DatabaseSync) {}
  state(row: RunRow): DungeonState | null {
    return row.dungeon_json ? JSON.parse(row.dungeon_json) : null;
  }
  battle(row: RunRow): BattleState {
    return JSON.parse(row.battle_json);
  }
  roll(row: RunRow) {
    const b = this.battle(row),
      value = random(b);
    row.battle_json = JSON.stringify(b);
    return value;
  }
  inventory(runId: string): Equipment[] {
    return this.db
      .prepare(
        "SELECT * FROM run_equipment WHERE run_id=? ORDER BY created_at,id",
      )
      .all(runId)
      .map((i) => {
        const template = EQUIPMENT_TEMPLATES.find(
          (t) => t.id === i.template_id,
        )!;
        return {
          id: String(i.id),
          templateId: template.id,
          name: template.name,
          slot: template.slot,
          rarity: Number(i.rarity) as Rarity,
          stats: JSON.parse(String(i.stats_json)),
          equippedTo: i.equipped_to === null ? null : String(i.equipped_to),
        };
      });
  }
  public(row: RunRow): { dungeon?: PublicDungeon; equipment: Equipment[] } {
    const w = this.state(row);
    if (!w) return { equipment: this.inventory(row.id) };
    const { baseParty: _, ...view } = w;
    return {
      dungeon: {
        ...view,
        rift: w.riftId
          ? RANDOM_EVENTS.find((e) => e.id === w.riftId)
          : undefined,
      },
      equipment: this.inventory(row.id),
    };
  }
  write(row: RunRow, w: DungeonState) {
    row.dungeon_json = JSON.stringify(w);
    this.db
      .prepare(
        `INSERT INTO run_events(run_id,floor,candidates_json,selected_event,revealed_event_json,state_json,status) VALUES (?,?,?,?,?,?,?) ON CONFLICT(run_id,floor) DO UPDATE SET selected_event=excluded.selected_event,revealed_event_json=excluded.revealed_event_json,state_json=excluded.state_json,status=excluded.status`,
      )
      .run(
        row.id,
        row.floor,
        JSON.stringify(w.candidates),
        w.selected ?? null,
        w.riftId
          ? JSON.stringify(RANDOM_EVENTS.find((e) => e.id === w.riftId))
          : null,
        JSON.stringify({
          phase: w.phase,
          message: w.message,
          offers: w.offers,
        }),
        row.status !== "active" ||
          w.phase === "complete" ||
          row.stage === "reward"
          ? "complete"
          : w.phase === "choice"
            ? "offered"
            : "active",
      );
  }
  begin(row: RunRow) {
    const old = this.state(row),
      b = this.battle(row);
    const w: DungeonState = {
      version: 1,
      phase: row.floor % 10 === 0 ? "battle" : "choice",
      candidates: [],
      selected: row.floor % 10 === 0 ? "boss" : undefined,
      baseParty: old?.baseParty ?? structuredClone(b.party),
      offers: [],
      message:
        row.floor % 10 === 0
          ? "보스가 기다리고 있습니다."
          : "이 층에서 진행할 이벤트를 하나 선택하세요.",
      rewardChoices: [],
      battleBonusGold: 0,
    };
    row.battle_json = JSON.stringify(
      encounter(b.party, row.floor, b.rng, b.potions),
    );
    row.stage = "battle";
    if (w.phase === "choice") {
      w.candidates = [{ id: `f${row.floor}_battle`, type: "battle" }];
      const pool = (Object.keys(EVENT_INFO) as EventType[]).filter(
        (t) => t !== "battle",
      );
      while (w.candidates.length < 3) {
        const sum = pool.reduce((n, t) => n + EVENT_INFO[t].weight, 0);
        let value = this.roll(row) * sum;
        let i = 0;
        for (; i < pool.length - 1; i++) {
          value -= EVENT_INFO[pool[i]].weight;
          if (value < 0) break;
        }
        const type = pool.splice(i, 1)[0];
        w.candidates.push({ id: `f${row.floor}_${type}`, type });
      }
    }
    this.write(row, w);
    this.recalculate(row, w);
  }
  require(row: RunRow): DungeonState {
    const w = this.state(row);
    return (
      w ?? fail("이전 도전은 현재 층을 마치면 새 이벤트를 이용할 수 있습니다.")
    );
  }
  noncombat(row: RunRow) {
    const w = this.state(row);
    if (row.stage === "battle" && (!w || w.phase === "battle"))
      fail("장비 관리는 전투 밖에서만 가능합니다.");
  }
  rollGear(
    row: RunRow,
    templateId?: string,
    rarity?: Rarity,
  ): Omit<Equipment, "id" | "equippedTo"> {
    const pool = EQUIPMENT_TEMPLATES.slice(0, 7);
    const template = templateId
      ? EQUIPMENT_TEMPLATES.find((t) => t.id === templateId)
      : pool[Math.floor(this.roll(row) * pool.length)];
    if (!template) fail("알 수 없는 장비입니다.");
    const chance = this.roll(row);
    const grade =
      rarity ??
      (chance < 0.55
        ? 0
        : chance < 0.8
          ? 1
          : chance < 0.95
            ? 2
            : chance < 0.99
              ? 3
              : 4);
    const multiplier = (1 + grade * 0.65) * (0.9 + this.roll(row) * 0.2);
    const stats = Object.fromEntries(
      Object.entries(template!.stats).map(([key, value]) => [
        key,
        key === "crit"
          ? Math.round(value * multiplier * 10000) / 10000
          : value === 0
            ? 0
            : Math.max(1, Math.floor(value * multiplier)),
      ]),
    ) as unknown as GearStats;
    return {
      templateId: template!.id,
      name: template!.name,
      slot: template!.slot,
      rarity: grade as Rarity,
      stats,
    };
  }
  add(row: RunRow, gear?: Omit<Equipment, "id" | "equippedTo">): Equipment {
    if (this.inventory(row.id).length >= EQUIPMENT_LIMIT)
      fail(
        "인벤토리가 60칸으로 가득 찼습니다. 미장착 장비를 분해하거나 버린 뒤 받으세요.",
      );
    const item = {
      ...(gear ?? this.rollGear(row)),
      id: randomUUID(),
      equippedTo: null,
    };
    this.db
      .prepare("INSERT INTO run_equipment VALUES (?,?,?,?,?,?,?,?)")
      .run(
        item.id,
        row.id,
        item.templateId,
        item.rarity,
        item.slot,
        JSON.stringify(item.stats),
        null,
        Date.now(),
      );
    return item;
  }
  reward(row: RunRow, w: DungeonState) {
    const choices: RewardKind[] = ["gold", "gauge"];
    w.rewardChoices = [
      "heal",
      "equipment",
      choices[Math.floor(this.roll(row) * choices.length)],
    ];
    this.write(row, w);
  }
  recalculate(row: RunRow, w: DungeonState) {
    const items = this.inventory(row.id),
      b = this.battle(row);
    for (const hero of b.party) {
      const base = w.baseParty.find((h) => h.id === hero.id);
      if (!base) continue;
      const bonus: GearStats = {
        hp: 0,
        attack: 0,
        defense: 0,
        speed: 0,
        crit: 0,
      };
      for (const item of items)
        if (
          item.equippedTo === hero.id ||
          item.equippedTo?.startsWith("party:")
        )
          for (const key of Object.keys(bonus) as (keyof GearStats)[])
            bonus[key] += item.stats[key];
      hero.maxHp = base.maxHp + bonus.hp;
      hero.hp = Math.min(hero.hp, hero.maxHp);
      hero.attack = base.attack + bonus.attack;
      hero.defense = base.defense + bonus.defense;
      hero.speed = base.speed + bonus.speed;
      hero.crit = Math.min(0.75, base.crit + bonus.crit);
    }
    row.battle_json = JSON.stringify(b);
  }
  complete(row: RunRow, w: DungeonState, message: string) {
    w.phase = "complete";
    w.message = message;
    if (this.battle(row).party.some((h) => h.hp > 0))
      row.completed_floor = row.floor;
    this.write(row, w);
  }
  heal(row: RunRow, ratio: number) {
    const b = this.battle(row);
    for (const h of b.party)
      if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp * ratio));
    row.battle_json = JSON.stringify(b);
  }
  shop(row: RunRow, w: DungeonState) {
    w.phase = "shop";
    w.offers = [
      { id: randomUUID(), kind: "potion", name: "회복약", price: 25, stock: 3 },
      ...([0, 1, 2] as Rarity[]).map((grade) => {
        const gear = this.rollGear(row, undefined, grade);
        return {
          id: randomUUID(),
          kind: "equipment" as const,
          name: gear.name,
          price: [40, 75, 120][grade],
          stock: 1,
          equipment: gear,
        };
      }),
    ];
    w.message = "가격과 재고는 입장 시 고정됩니다.";
  }
  choose(row: RunRow, candidateId: string) {
    const w = this.require(row);
    if (w.phase !== "choice") fail("이미 이벤트를 선택했습니다.");
    const option =
      w.candidates.find((c) => c.id === candidateId) ??
      fail("후보에 없는 이벤트입니다.");
    w.selected = option.type;
    w.phase =
      option.type === "elite"
        ? "battle"
        : option.type === "battle"
          ? "battle"
          : option.type;
    w.message = EVENT_INFO[option.type].description;
    if (w.phase === "battle") {
      const b = this.battle(row);
      row.battle_json = JSON.stringify(
        encounter(
          b.party,
          row.floor,
          b.rng,
          b.potions,
          option.type === "elite" ? "elite" : "normal",
        ),
      );
    }
    if (w.phase === "shop") this.shop(row, w);
    if (w.phase === "rift") {
      const pool = RANDOM_EVENTS.filter((e) => e.minFloor <= row.floor);
      let chance = this.roll(row) * pool.reduce((n, e) => n + e.weight, 0);
      let selected = pool[pool.length - 1];
      for (const event of pool) {
        chance -= event.weight;
        if (chance < 0) {
          selected = event;
          break;
        }
      }
      w.riftId = selected.id;
      w.message = selected.text;
    }
    this.write(row, w);
  }
  advance(row: RunRow) {
    const w = this.require(row);
    if (!["complete", "shop", "forge"].includes(w.phase))
      fail("현재 이벤트를 먼저 완료하세요.");
    row.completed_floor = row.floor;
    if (row.floor >= 100) fail("최종층은 보스전으로 완료해야 합니다.");
    row.floor++;
    this.begin(row);
  }
  resolveRift(row: RunRow, choiceId: string) {
    const w = this.require(row);
    if (w.phase !== "rift") fail("선택할 랜덤 이벤트가 없습니다.");
    const event =
      RANDOM_EVENTS.find((e) => e.id === w.riftId) ??
      fail("이벤트 정보가 없습니다.");
    const c =
      event.choices.find((c) => c.id === choiceId) ??
      fail("알 수 없는 선택지입니다.");
    if (row.gold < (c.cost ?? 0)) fail("골드가 부족합니다.");
    row.gold -= c.cost ?? 0;
    row.gold += c.gold ?? 0;
    const b = this.battle(row);
    switch (c.effect) {
      case "gear":
        this.add(row);
        break;
      case "relic":
        this.add(
          row,
          this.rollGear(
            row,
            this.roll(row) < 0.5 ? "ark_fragment" : "storm_totem",
            2,
          ),
        );
        break;
      case "trap":
      case "altar":
        for (const h of b.party)
          if (h.hp > 0)
            h.hp = Math.max(
              0,
              h.hp - Math.ceil(h.maxHp * (c.effect === "trap" ? 0.15 : 0.2)),
            );
        row.battle_json = JSON.stringify(b);
        if (c.effect === "altar") {
          for (const h of w.baseParty) h.attack += 3;
          this.recalculate(row, w);
        }
        break;
      case "heal":
        this.heal(row, 0.5);
        break;
      case "contract":
        for (const h of w.baseParty) h.maxHp += 15;
        this.recalculate(row, w);
        break;
      case "gauge":
        for (const h of b.party)
          if (h.hp > 0) h.gauge = Math.min(100, h.gauge + 50);
        row.battle_json = JSON.stringify(b);
        break;
      case "time":
        for (const h of w.baseParty) h.speed += 2;
        this.recalculate(row, w);
        this.heal(row, 0.2);
        break;
      case "shop":
        this.shop(row, w);
        this.write(row, w);
        return;
      case "forge":
        w.phase = "forge";
        w.message = "비밀 화로가 준비되었습니다.";
        this.write(row, w);
        return;
      case "battle":
      case "goblin":
        w.phase = "battle";
        w.battleBonusGold = c.effect === "goblin" ? 100 : 0;
        {
          const state = this.battle(row);
          row.battle_json = JSON.stringify(
            encounter(
              state.party,
              row.floor,
              state.rng,
              state.potions,
              c.effect === "battle" ? "elite" : "normal",
            ),
          );
        }
        this.write(row, w);
        return;
      case "leave":
        break;
    }
    this.complete(row, w, `${event.name}: ${c.label} · 결과가 저장되었습니다.`);
  }
  own(row: RunRow, id: string) {
    return (
      this.inventory(row.id).find((i) => i.id === id) ??
      fail("이 도전에 소유한 장비가 아닙니다.")
    );
  }
  equip(row: RunRow, itemId: string, target: string) {
    this.noncombat(row);
    const w = this.require(row),
      item = this.own(row, itemId);
    const party = this.battle(row).party;
    if (
      item.slot === "relic"
        ? !["party:0", "party:1"].includes(target)
        : !party.some((h) => h.id === target)
    )
      fail("장비 부위에 맞는 장착 대상을 선택하세요.");
    this.db
      .prepare(
        "UPDATE run_equipment SET equipped_to=NULL WHERE run_id=? AND equipped_to=? AND slot=?",
      )
      .run(row.id, target, item.slot);
    this.db
      .prepare("UPDATE run_equipment SET equipped_to=? WHERE id=? AND run_id=?")
      .run(target, itemId, row.id);
    this.recalculate(row, w);
  }
  unequip(row: RunRow, itemId: string) {
    this.noncombat(row);
    const w = this.require(row);
    this.own(row, itemId);
    this.db
      .prepare(
        "UPDATE run_equipment SET equipped_to=NULL WHERE id=? AND run_id=?",
      )
      .run(itemId, row.id);
    this.recalculate(row, w);
  }
  remove(row: RunRow, itemId: string, salvage: boolean) {
    this.noncombat(row);
    const item = this.own(row, itemId);
    if (item.equippedTo) fail("장착 중인 장비는 먼저 해제하세요.");
    this.db
      .prepare("DELETE FROM run_equipment WHERE id=? AND run_id=?")
      .run(itemId, row.id);
    if (salvage) row.gold += (item.rarity + 1) * 5;
  }
  ingredients(row: RunRow, ids: string[]) {
    this.noncombat(row);
    if (this.require(row).phase !== "forge")
      fail("대장간에서만 합성/제작할 수 있습니다.");
    if (new Set(ids).size !== 3) fail("서로 다른 장비3개가 필요합니다.");
    const items = ids.map((id) => this.own(row, id));
    if (items.some((i) => i.equippedTo))
      fail("미장착 장비만 재료로 사용할 수 있습니다.");
    return items;
  }
  consume(row: RunRow, ids: string[]) {
    for (const id of ids)
      this.db
        .prepare("DELETE FROM run_equipment WHERE run_id=? AND id=?")
        .run(row.id, id);
  }
  fuse(row: RunRow, ids: string[]) {
    const items = this.ingredients(row, ids);
    if (items.some((i) => i.slot === "relic"))
      fail("유물은 일반 합성할 수 없습니다.");
    if (items.some((i) => i.rarity !== items[0].rarity) || items[0].rarity >= 4)
      fail("최상급 미만의 같은 등급 장비3개가 필요합니다.");
    this.consume(row, ids);
    this.add(
      row,
      this.rollGear(row, undefined, (items[0].rarity + 1) as Rarity),
    );
  }
  craft(row: RunRow, ids: string[], recipeId: string) {
    const items = this.ingredients(row, ids),
      recipe =
        RECIPES.find((r) => r.id === recipeId) ??
        fail("알 수 없는 조합법입니다.");
    if (
      items
        .map((i) => i.templateId)
        .sort()
        .join(",") !== [...recipe.ingredients].sort().join(",")
    )
      fail("레시피에 지정된 장비3개가 필요합니다.");
    this.consume(row, ids);
    this.add(row, this.rollGear(row, recipe.output, recipe.rarity));
    this.db
      .prepare("INSERT OR IGNORE INTO discovered_recipes VALUES (?,?,?)")
      .run(row.user_id, recipeId, Date.now());
  }
  buy(row: RunRow, offerId: string) {
    const w = this.require(row);
    if (w.phase !== "shop") fail("상점에 입장해야 구매할 수 있습니다.");
    const offer =
      w.offers.find((o) => o.id === offerId) ??
      fail("판매 중인 상품이 아닙니다.");
    if (offer.stock <= 0) fail("품절된 상품입니다.");
    if (row.gold < offer.price) fail("골드가 부족합니다.");
    if (offer.kind === "equipment") this.add(row, offer.equipment);
    else {
      const b = this.battle(row);
      if (b.potions >= 9) fail("회복약은 최대9개입니다.");
      b.potions++;
      row.battle_json = JSON.stringify(b);
    }
    row.gold -= offer.price;
    offer.stock--;
    this.write(row, w);
  }
}
export function registerDungeonRoutes(
  app: FastifyInstance,
  db: DatabaseSync,
  ctx: Context,
  service: DungeonService,
  deps: {
    get: (u: string, id: string) => RunRow;
    checked: (u: string, id: string, r: number) => RunRow;
    save: (r: RunRow) => void;
    response: (r: RunRow) => unknown;
    finish: (r: RunRow, outcome: "defeated") => void;
  },
) {
  function route<T extends { actionId: string; revision: number }>(
    path: string,
    schema: z.ZodType<T>,
    fn: (row: RunRow, body: T) => void,
  ) {
    app.post<{ Params: { id: string } }>(
      `/api/runs/:id/${path}`,
      async (req, reply) => {
        const user = ctx.userId(req),
          body = schema.parse(req.body);
        const result = ctx.mutation(
          user,
          `runs:${req.params.id}:${path}`,
          body,
          200,
          () => {
            const row = deps.checked(user, req.params.id, body.revision);
            fn(row, body);
            const b = service.battle(row);
            if (!b.party.some((h) => h.hp > 0)) {
              b.outcome = "defeat";
              row.battle_json = JSON.stringify(b);
              deps.finish(row, "defeated");
            }
            row.revision++;
            deps.save(row);
            return deps.response(row);
          },
        );
        return reply.code(result.code).send(result.body);
      },
    );
  }
  route("select-event", eventSelectSchema, (r, b) =>
    service.choose(r, b.candidateId),
  );
  route("continue", mutationSchema.strict(), (r) => service.advance(r));
  route("rest", mutationSchema.strict(), (r) => {
    const w = service.require(r);
    if (w.phase !== "rest") fail("휴식 이벤트가 아닙니다.");
    service.heal(r, 0.4);
    service.complete(r, w, "생존 파티의 HP를 40% 회복했습니다.");
  });
  route("treasure/open", mutationSchema.strict(), (r) => {
    const w = service.require(r);
    if (w.phase !== "treasure") fail("열 수 있는 보물이 없습니다.");
    service.add(r);
    r.gold += 40 + r.floor * 5;
    service.complete(r, w, "장비1개와 보물 골드를 받았습니다.");
  });
  route("random-event/choose", riftChoiceSchema, (r, b) =>
    service.resolveRift(r, b.choiceId),
  );
  route("shop/buy", shopBuySchema, (r, b) => service.buy(r, b.offerId));
  route("equipment/equip", equipmentEquipSchema, (r, b) =>
    service.equip(r, b.itemId, b.target),
  );
  route("equipment/unequip", equipmentItemSchema, (r, b) =>
    service.unequip(r, b.itemId),
  );
  route("equipment/discard", equipmentItemSchema, (r, b) =>
    service.remove(r, b.itemId, false),
  );
  route("equipment/salvage", equipmentItemSchema, (r, b) =>
    service.remove(r, b.itemId, true),
  );
  route("equipment/fuse", equipmentFuseSchema, (r, b) =>
    service.fuse(r, b.itemIds),
  );
  route("equipment/craft", equipmentCraftSchema, (r, b) =>
    service.craft(r, b.itemIds, b.recipeId),
  );
  app.get("/api/monsters", async (req) => {
    ctx.userId(req);
    return { monsters: MONSTERS };
  });
  app.get("/api/recipes", async (req) => ({
    recipes: db
      .prepare(
        "SELECT recipe_id,discovered_at FROM discovered_recipes WHERE user_id=?",
      )
      .all(ctx.userId(req))
      .map((r) => ({
        ...RECIPES.find((c) => c.id === r.recipe_id)!,
        discoveredAt: Number(r.discovered_at),
      })),
  }));
}
