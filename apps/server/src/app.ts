import Fastify, { type FastifyReply } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import argon2 from "argon2";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError } from "zod";
import {
  HEROES,
  loginSchema,
  registerSchema,
  partySchema,
  mutationSchema,
  validateParty,
  type Account,
  type HeroId,
} from "@loa/shared";
import { openDatabase, transaction } from "./db.js";

interface Config {
  secret: string;
  origin: string;
  production: boolean;
  databasePath: string;
  logger?: boolean;
}
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
type UserRow = {
  id: string;
  email: string;
  nickname: string;
  revision: number;
  password_hash: string;
};
type SessionRow = {
  id_hash: string;
  user_id: string;
  expires_at: number;
  revoked_at: number | null;
};
export async function createApp(config: Config) {
  const db = openDatabase(config.databasePath);
  const app = Fastify({
    logger: config.logger
      ? {
          redact: [
            "req.headers.cookie",
            "req.headers.authorization",
            "res.headers.set-cookie",
          ],
        }
      : false,
    bodyLimit: 16384,
    trustProxy: false,
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.addHook("onClose", async () => {
    db.close();
  });
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "same-origin");
    if (config.production)
      reply.header("Strict-Transport-Security", "max-age=31536000");
    if (req.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.headers.origin !== config.origin
    )
      throw new ApiError(403, "요청 출처를 확인할 수 없습니다.");
  });
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({
          error: "입력값을 확인하세요.",
          fields: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
    const status =
      error instanceof ApiError
        ? error.statusCode
        : error instanceof Error &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
    if (status >= 500) app.log.error({ err: error }, "Request failed");
    return reply
      .code(status)
      .send({
        error:
          status >= 500
            ? "서버 오류가 발생했습니다."
            : error instanceof Error
              ? error.message
              : "요청에 실패했습니다.",
      });
  });
  function account(id: string): Account {
    const u = db
      .prepare("SELECT id,email,nickname,revision FROM users WHERE id=?")
      .get(id) as UserRow;
    const currency = db
      .prepare("SELECT ark_crystals FROM user_currencies WHERE user_id=?")
      .get(id)!;
    const p = db
      .prepare("SELECT hero_ids_json FROM party_presets WHERE user_id=?")
      .get(id)!;
    return {
      ...u,
      crystals: Number(currency.ark_crystals),
      party: JSON.parse(String(p.hero_ids_json)),
    };
  }
  function session(raw: string | undefined, allowRevoked = false): SessionRow {
    if (!raw) throw new ApiError(401, "로그인이 필요합니다.");
    const row = db
      .prepare("SELECT * FROM sessions WHERE id_hash=?")
      .get(hash(raw)) as SessionRow | undefined;
    if (
      !row ||
      row.expires_at <= Date.now() ||
      (!allowRevoked && row.revoked_at !== null)
    )
      throw new ApiError(401, "세션이 만료되었습니다. 다시 로그인하세요.");
    return row;
  }
  function revision(id: string, expected: number) {
    if (account(id).revision !== expected)
      throw new ApiError(
        409,
        "다른 요청으로 상태가 변경되었습니다. 새로고침 후 다시 시도하세요.",
      );
  }
  const hmac = (s: string) =>
    createHmac("sha256", config.secret).update(s).digest("hex");
  function mutation(
    scope: string,
    route: string,
    body: { actionId: string; revision: number },
    code: number,
    fn: () => unknown,
  ) {
    const fingerprint = hmac(JSON.stringify({ route, body }));
    return transaction(db, () => {
      const prior = db
        .prepare(
          "SELECT * FROM processed_actions WHERE scope=? AND action_id=?",
        )
        .get(scope, body.actionId);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new ApiError(
            409,
            "같은 actionId를 다른 요청에 사용할 수 없습니다.",
          );
        return {
          code: Number(prior.status_code),
          body: JSON.parse(String(prior.response_json)),
        };
      }
      const result = fn();
      db.prepare("INSERT INTO processed_actions VALUES (?,?,?,?,?,?)").run(
        scope,
        body.actionId,
        fingerprint,
        code,
        JSON.stringify(result),
        Date.now(),
      );
      return { code, body: result };
    });
  }
  function token(scope: string, actionId: string) {
    return hmac(`session:${scope}:${actionId}`);
  }
  function issueSession(id: string, raw: string) {
    db.prepare(
      "INSERT INTO sessions(id_hash,user_id,expires_at) VALUES (?,?,?)",
    ).run(hash(raw), id, Date.now() + SESSION_MS);
  }
  function setCookie(reply: FastifyReply, raw: string) {
    reply.setCookie("loa_session", raw, {
      path: "/",
      httpOnly: true,
      secure: config.production,
      sameSite: "strict",
      maxAge: SESSION_MS / 1000,
    });
  }
  const dummyHash = await argon2.hash(randomUUID(), {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const authLimit = {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  };
  app.get("/api/health", async () => {
    db.prepare("SELECT 1").get();
    return { status: "ok", phase: 1 };
  });
  app.post("/api/auth/register", authLimit, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const scope = `auth:${hash(body.email)}`;
    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const raw = token(scope, body.actionId);
    const result = mutation(scope, "register", body, 201, () => {
      if (body.revision !== 0)
        throw new ApiError(409, "회원가입 revision은 0이어야 합니다.");
      if (db.prepare("SELECT id FROM users WHERE email=?").get(body.email))
        throw new ApiError(409, "이미 가입된 이메일입니다.");
      const id = randomUUID();
      db.prepare(
        "INSERT INTO users(id,email,password_hash,nickname,created_at) VALUES (?,?,?,?,?)",
      ).run(id, body.email, passwordHash, body.nickname, Date.now());
      db.prepare("INSERT INTO user_currencies(user_id) VALUES (?)").run(id);
      for (const hero of HEROES)
        db.prepare(
          "INSERT INTO hero_upgrades(user_id,hero_id) VALUES (?,?)",
        ).run(id, hero.id);
      db.prepare("INSERT INTO party_presets VALUES (?,?)").run(
        id,
        JSON.stringify(["wei", "nineveh", "thirain", "balthorr"]),
      );
      issueSession(id, raw);
      return { account: account(id) };
    });
    setCookie(reply, raw);
    return reply.code(result.code).send(result.body);
  });
  app.post("/api/auth/login", authLimit, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const u = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(body.email) as UserRow | undefined;
    const valid = await argon2.verify(
      u?.password_hash ?? dummyHash,
      body.password,
    );
    if (!u || !valid)
      throw new ApiError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
    const scope = `auth:${hash(body.email)}`;
    const raw = token(scope, body.actionId);
    const result = mutation(scope, "login", body, 200, () => {
      if (body.revision !== 0)
        throw new ApiError(409, "로그인 revision은 0이어야 합니다.");
      issueSession(u.id, raw);
      return { account: account(u.id) };
    });
    setCookie(reply, raw);
    return reply.code(result.code).send(result.body);
  });
  app.get("/api/auth/me", async (req) => ({
    account: account(session(req.cookies.loa_session).user_id),
  }));
  app.post("/api/auth/logout", async (req, reply) => {
    const body = mutationSchema.strict().parse(req.body);
    const s = session(req.cookies.loa_session, true);
    const result = mutation(s.user_id, "logout", body, 200, () => {
      if (s.revoked_at !== null)
        throw new ApiError(401, "세션이 폐기되었습니다.");
      revision(s.user_id, body.revision);
      db.prepare("UPDATE sessions SET revoked_at=? WHERE id_hash=?").run(
        Date.now(),
        s.id_hash,
      );
      return { ok: true };
    });
    reply.clearCookie("loa_session", { path: "/" });
    return reply.code(result.code).send(result.body);
  });
  app.get("/api/heroes", async (req) => {
    const id = session(req.cookies.loa_session).user_id;
    const rows = db
      .prepare(
        "SELECT hero_id,cost_reduction FROM hero_upgrades WHERE user_id=?",
      )
      .all(id);
    return {
      heroes: HEROES.map((h) => {
        const reduction = Number(
          rows.find((r) => r.hero_id === h.id)!.cost_reduction,
        );
        return {
          ...h,
          costReduction: reduction,
          currentCost: Math.max(h.minCost, h.cost - reduction),
        };
      }),
    };
  });
  app.put("/api/party", async (req, reply) => {
    const id = session(req.cookies.loa_session).user_id;
    const body = partySchema.parse(req.body);
    const result = mutation(id, "party", body, 200, () => {
      revision(id, body.revision);
      const rows = db
        .prepare(
          "SELECT hero_id,cost_reduction FROM hero_upgrades WHERE user_id=?",
        )
        .all(id);
      const reductions = Object.fromEntries(
        rows.map((r) => [String(r.hero_id), Number(r.cost_reduction)]),
      ) as Partial<Record<HeroId, number>>;
      const error = validateParty(body.heroIds, reductions);
      if (error) throw new ApiError(400, error);
      db.prepare(
        "UPDATE party_presets SET hero_ids_json=? WHERE user_id=?",
      ).run(JSON.stringify(body.heroIds), id);
      db.prepare("UPDATE users SET revision=revision+1 WHERE id=?").run(id);
      return { account: account(id) };
    });
    return reply.code(result.code).send(result.body);
  });
  const webRoot = resolve("apps/web/dist");
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot });
    app.setNotFoundHandler((req, reply) => {
      if (
        !req.url.startsWith("/api/") &&
        req.method === "GET" &&
        req.headers.accept?.includes("text/html")
      )
        return reply.sendFile("index.html");
      return reply.code(404).send({ error: "존재하지 않는 경로입니다." });
    });
  }
  return app;
}
