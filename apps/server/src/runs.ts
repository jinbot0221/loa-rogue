import { DungeonService, registerDungeonRoutes } from "./dungeon.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import {
  battleActionSchema,
  rewardSchema,
  mutationSchema,
  validateParty,
  partyCost,
  type Account,
  type RunView,
  type BattleState,
} from "@loa/shared";
import {
  encounter,
  heroFighter,
  step,
  BattleRuleError,
  type Upgrade,
} from "@loa/game-engine";
export class RunError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export interface RunRow {
  id: string;
  user_id: string;
  status: RunView["status"];
  floor: number;
  completed_floor: number;
  revision: number;
  stage: "battle" | "reward" | "finished";
  seed: number;
  battle_json: string;
  party_cost: number;
  gold: number;
  crystals_awarded: number;
  created_at: number;
  updated_at: number;
  dungeon_json: string | null;
}
export interface Context {
  userId: (req: FastifyRequest) => string;
  account: (id: string) => Account;
  mutation: (
    scope: string,
    route: string,
    body: { actionId: string; revision: number },
    code: number,
    fn: () => unknown,
  ) => { code: number; body: unknown };
}
export function runView(row: RunRow, service?: DungeonService): RunView {
  const { rng: _, ...battle } = JSON.parse(row.battle_json) as BattleState;
  return {
    id: row.id,
    status: row.status,
    floor: row.floor,
    completedFloor: row.completed_floor,
    revision: row.revision,
    stage:
      row.stage === "battle" &&
      service?.state(row) &&
      service.state(row)!.phase !== "battle"
        ? "event"
        : row.stage,
    battle,
    gold: row.gold,
    crystalsAwarded: row.crystals_awarded,
    partyCost: row.party_cost,
    createdAt: row.created_at,
    ...(service?.public(row) ?? {}),
  };
}
export function registerRunRoutes(
  app: FastifyInstance,
  db: DatabaseSync,
  ctx: Context,
) {
  const service = new DungeonService(db);
  const get = (userId: string, id: string): RunRow => {
    const row = db
      .prepare("SELECT * FROM runs WHERE id=? AND user_id=?")
      .get(id, userId) as unknown as RunRow | undefined;
    if (!row) throw new RunError(404, "도전을 찾을 수 없습니다.");
    return row;
  };
  const checked = (userId: string, id: string, revision: number) => {
    const row = get(userId, id);
    if (row.status !== "active")
      throw new RunError(409, "이미 종료된 도전입니다.");
    if (row.revision !== revision)
      throw new RunError(
        409,
        "도전 상태가 변경되었습니다. 최신 상태를 불러와 다시 선택하세요.",
      );
    return row;
  };
  function finish(row: RunRow, outcome: "defeated" | "abandoned" | "cleared") {
    const first =
      outcome === "cleared" &&
      !db
        .prepare("SELECT id FROM records WHERE user_id=? AND outcome='cleared'")
        .get(row.user_id)
        ? 1000
        : 0;
    const reward =
      outcome === "abandoned"
        ? row.completed_floor * 5
        : outcome === "cleared"
          ? 1500 + first
          : row.floor * 10;
    row.status = outcome;
    row.stage = "finished";
    row.crystals_awarded = reward;
    db.prepare(
      "UPDATE user_currencies SET ark_crystals=ark_crystals+? WHERE user_id=?",
    ).run(reward, row.user_id);
    db.prepare("UPDATE users SET revision=revision+1 WHERE id=?").run(
      row.user_id,
    );
    db.prepare("INSERT INTO records VALUES (?,?,?,?,?,?,?,?)").run(
      randomUUID(),
      row.user_id,
      row.id,
      row.floor,
      outcome,
      reward,
      first,
      Date.now(),
    );
  }
  function save(row: RunRow) {
    db.prepare(
      "UPDATE runs SET status=?,floor=?,completed_floor=?,revision=?,stage=?,battle_json=?,gold=?,crystals_awarded=?,updated_at=?,finished_at=?,dungeon_json=? WHERE id=?",
    ).run(
      row.status,
      row.floor,
      row.completed_floor,
      row.revision,
      row.stage,
      row.battle_json,
      row.gold,
      row.crystals_awarded,
      Date.now(),
      row.status === "active" ? null : Date.now(),
      row.dungeon_json,
      row.id,
    );
  }
  const response = (row: RunRow) => ({
    run: runView(row, service),
    account: ctx.account(row.user_id),
  });
  app.get("/api/runs/active", async (req) => {
    const id = ctx.userId(req);
    const row = db
      .prepare("SELECT * FROM runs WHERE user_id=? AND status='active'")
      .get(id) as unknown as RunRow | undefined;
    return { run: row ? runView(row, service) : null };
  });
  app.get<{ Params: { id: string } }>("/api/runs/:id", async (req) => ({
    run: runView(get(ctx.userId(req), req.params.id), service),
  }));
  app.get("/api/records", async (req) => ({
    records: db
      .prepare(
        "SELECT run_id,highest_floor,outcome,crystals_awarded,created_at FROM records WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
      )
      .all(ctx.userId(req)),
  }));
  app.post("/api/runs", async (req, reply) => {
    const id = ctx.userId(req);
    const body = mutationSchema.strict().parse(req.body);
    const result = ctx.mutation(id, "runs:start", body, 201, () => {
      const account = ctx.account(id);
      if (account.revision !== body.revision)
        throw new RunError(409, "계정 상태가 변경되었습니다. 새로고침하세요.");
      if (
        db
          .prepare("SELECT id FROM runs WHERE user_id=? AND status='active'")
          .get(id)
      )
        throw new RunError(409, "진행 중인 도전을 먼저 이어가거나 포기하세요.");
      const upgrades = db
        .prepare("SELECT * FROM hero_upgrades WHERE user_id=?")
        .all(id);
      const reductions = Object.fromEntries(
        upgrades.map((u) => [String(u.hero_id), Number(u.cost_reduction)]),
      );
      const error = validateParty(account.party, reductions);
      if (error) throw new RunError(400, error);
      const party = account.party.map((heroId) =>
        heroFighter(
          heroId,
          upgrades.find((u) => u.hero_id === heroId) as Upgrade,
        ),
      );
      const seed = randomBytes(4).readUInt32LE(0) || 1;
      const runId = randomUUID();
      const now = Date.now();
      db.prepare(
        "INSERT INTO runs(id,user_id,status,floor,revision,stage,seed,battle_json,party_cost,created_at,updated_at) VALUES (?,?,'active',1,0,'battle',?,?,?,?,?)",
      ).run(
        runId,
        id,
        seed,
        JSON.stringify(encounter(party, 1, seed)),
        partyCost(account.party, reductions),
        now,
        now,
      );
      db.prepare("UPDATE users SET revision=revision+1 WHERE id=?").run(id);
      const row = get(id, runId);
      row.gold = 75;
      service.begin(row);
      save(row);
      return response(row);
    });
    return reply.code(result.code).send(result.body);
  });
  app.post<{ Params: { id: string } }>(
    "/api/runs/:id/battle-action",
    async (req, reply) => {
      const id = ctx.userId(req);
      const body = battleActionSchema.parse(req.body);
      const result = ctx.mutation(
        id,
        `runs:${req.params.id}:battle`,
        body,
        200,
        () => {
          const row = checked(id, req.params.id, body.revision);
          if (row.stage !== "battle")
            throw new RunError(409, "전투 보상을 먼저 선택하세요.");
          const world = service.state(row);
          if (world && world.phase !== "battle")
            throw new RunError(
              409,
              "먼저 이 층의 이벤트를 선택하고 완료하세요.",
            );
          let battle: BattleState;
          try {
            battle = step(JSON.parse(row.battle_json), body.action);
          } catch (e) {
            if (e instanceof BattleRuleError)
              throw new RunError(400, e.message);
            throw e;
          }
          row.battle_json = JSON.stringify(battle);
          row.revision++;
          if (battle.outcome === "defeat") finish(row, "defeated");
          if (battle.outcome === "victory") {
            row.completed_floor = row.floor;
            if (row.floor === 100) finish(row, "cleared");
            else row.stage = "reward";
            if (world) {
              row.gold += world.battleBonusGold;
              world.battleBonusGold = 0;
              service.reward(row, world);
            }
          }
          save(row);
          return response(row);
        },
      );
      return reply.code(result.code).send(result.body);
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/runs/:id/select-reward",
    async (req, reply) => {
      const id = ctx.userId(req);
      const body = rewardSchema.parse(req.body);
      const result = ctx.mutation(
        id,
        `runs:${req.params.id}:reward`,
        body,
        200,
        () => {
          const row = checked(id, req.params.id, body.revision);
          if (row.stage !== "reward" || row.floor >= 100)
            throw new RunError(409, "선택할 전투 보상이 없습니다.");
          const world = service.state(row);
          if (world && !world.rewardChoices.includes(body.choice))
            throw new RunError(400, "제시된 보상 중 하나를 선택하세요.");
          if (body.choice === "equipment") {
            if (!world)
              throw new RunError(400, "이전 전투에서는 장비 보상이 없습니다.");
            const rarity =
              row.floor % 10 === 0
                ? Math.min(4, 2 + Math.floor(service.roll(row) * 3))
                : service
                      .battle(row)
                      .enemies.some((e) => e.templateId?.startsWith("elite_"))
                  ? 1 + Math.floor(service.roll(row) * 2)
                  : undefined;
            service.add(
              row,
              service.rollGear(
                row,
                undefined,
                rarity as import("@loa/shared").Rarity | undefined,
              ),
            );
          }
          const battle = JSON.parse(row.battle_json) as BattleState;
          for (const hero of battle.party)
            if (hero.hp > 0) {
              if (body.choice === "heal")
                hero.hp = Math.min(
                  hero.maxHp,
                  hero.hp + Math.ceil(hero.maxHp * 0.25),
                );
              if (body.choice === "gauge")
                hero.gauge = Math.min(100, hero.gauge + 35);
            }
          if (body.choice === "gold") row.gold += 25 + row.floor * 5;
          row.floor++;
          row.stage = "battle";
          row.revision++;
          row.battle_json = JSON.stringify(battle);
          service.begin(row);
          save(row);
          return response(row);
        },
      );
      return reply.code(result.code).send(result.body);
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/runs/:id/abandon",
    async (req, reply) => {
      const id = ctx.userId(req);
      const body = mutationSchema.strict().parse(req.body);
      const result = ctx.mutation(
        id,
        `runs:${req.params.id}:abandon`,
        body,
        200,
        () => {
          const row = checked(id, req.params.id, body.revision);
          finish(row, "abandoned");
          row.revision++;
          save(row);
          return response(row);
        },
      );
      return reply.code(result.code).send(result.body);
    },
  );
  registerDungeonRoutes(app, db, ctx, service, {
    get,
    checked,
    save,
    response,
    finish,
  });
}
