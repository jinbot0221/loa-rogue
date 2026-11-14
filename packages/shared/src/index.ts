import { z } from "zod";
export const HEROES = [
  {
    id: "wei",
    name: "웨이",
    cost: 3,
    minCost: 1,
    role: "무력화 · 격투",
    hp: 120,
    attack: 23,
    defense: 18,
    speed: 16,
    color: "#d39158",
  },
  {
    id: "nineveh",
    name: "니나브",
    cost: 4,
    minCost: 1,
    role: "원거리 · 빛",
    hp: 90,
    attack: 29,
    defense: 10,
    speed: 25,
    color: "#8bcca4",
  },
  {
    id: "thirain",
    name: "실리안",
    cost: 3,
    minCost: 1,
    role: "균형 · 검",
    hp: 115,
    attack: 25,
    defense: 18,
    speed: 18,
    color: "#82b2d9",
  },
  {
    id: "shandi",
    name: "샨디",
    cost: 4,
    minCost: 1,
    role: "환술 · 제어",
    hp: 95,
    attack: 26,
    defense: 12,
    speed: 23,
    color: "#bc9dde",
  },
  {
    id: "azena_inanna",
    name: "아제나·이난나",
    cost: 5,
    minCost: 2,
    role: "마법 · 회복",
    hp: 100,
    attack: 28,
    defense: 12,
    speed: 19,
    color: "#d48dab",
  },
  {
    id: "balthorr",
    name: "바훈투르",
    cost: 2,
    minCost: 1,
    role: "방어 · 보호막",
    hp: 150,
    attack: 16,
    defense: 28,
    speed: 10,
    color: "#d4b56b",
  },
] as const;
export type HeroId = (typeof HEROES)[number]["id"];
export const heroIdSchema = z.enum([
  "wei",
  "nineveh",
  "thirain",
  "shandi",
  "azena_inanna",
  "balthorr",
]);
export const mutationSchema = z.object({
  actionId: z.uuid(),
  revision: z.number().int().min(0),
});
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(20)
  .regex(
    /^[a-z0-9_]+$/,
    "아이디는 영문 소문자, 숫자, 밑줄 3~20자로 입력하세요.",
  );
// Existing email accounts retain their login identifier after migration.
export const loginIdentifierSchema = z.union([usernameSchema, emailSchema]);
export const registerSchema = mutationSchema
  .extend({
    username: usernameSchema,
    password: z.string().min(10).max(128),
    nickname: z.string().trim().min(2).max(20),
  })
  .strict();
export const loginSchema = mutationSchema
  .extend({
    username: loginIdentifierSchema,
    password: z.string().min(1).max(128),
  })
  .strict();
export const partySchema = mutationSchema
  .extend({ heroIds: z.array(heroIdSchema).min(1).max(6) })
  .strict();
export type Hero = (typeof HEROES)[number] & {
  currentCost: number;
  costReduction: number;
};
export interface Account {
  id: string;
  username: string;
  nickname: string;
  crystals: number;
  revision: number;
  party: HeroId[];
}
export function partyCost(
  ids: readonly HeroId[],
  reductions: Partial<Record<HeroId, number>> = {},
): number {
  return ids.reduce((sum, id) => {
    const h = HEROES.find((h) => h.id === id)!;
    return sum + Math.max(h.minCost, h.cost - (reductions[id] ?? 0));
  }, 0);
}
export function validateParty(
  ids: readonly HeroId[],
  reductions: Partial<Record<HeroId, number>> = {},
): string | null {
  if (ids.length < 1 || ids.length > 6) return "영웅을 1~6명 선택하세요.";
  if (new Set(ids).size !== ids.length)
    return "같은 영웅을 중복 편성할 수 없습니다.";
  if (ids.some((id) => !HEROES.some((h) => h.id === id)))
    return "알 수 없는 영웅입니다.";
  if (partyCost(ids, reductions) > 15)
    return "파티 코스트는 15 이하여야 합니다.";
  return null;
}
