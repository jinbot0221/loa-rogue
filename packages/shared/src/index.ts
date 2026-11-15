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
  {
    id: "kadan",
    name: "카단",
    cost: 5,
    minCost: 2,
    role: "검 · 단일 폭딜",
    hp: 125,
    attack: 34,
    defense: 20,
    speed: 22,
    color: "#9bb5df",
  },
  {
    id: "galatur",
    name: "갈라투르",
    cost: 3,
    minCost: 1,
    role: "망치 · 방벽",
    hp: 165,
    attack: 23,
    defense: 27,
    speed: 9,
    color: "#e5b570",
  },
  {
    id: "delain_arman",
    name: "데런 아만",
    cost: 4,
    minCost: 1,
    role: "암흑 · 출혈",
    hp: 110,
    attack: 31,
    defense: 13,
    speed: 23,
    color: "#af6fbd",
  },
  {
    id: "luterra",
    name: "루테란",
    cost: 4,
    minCost: 1,
    role: "왕의 검 · 수호",
    hp: 135,
    attack: 29,
    defense: 21,
    speed: 17,
    color: "#92b9ec",
  },
  {
    id: "valtan",
    name: "발탄",
    cost: 5,
    minCost: 2,
    role: "도끼 · 무력화",
    hp: 175,
    attack: 29,
    defense: 20,
    speed: 12,
    color: "#c7835c",
  },
  {
    id: "vykas",
    name: "비아키스",
    cost: 4,
    minCost: 1,
    role: "매혹 · 제어",
    hp: 100,
    attack: 29,
    defense: 13,
    speed: 26,
    color: "#df8bd0",
  },
  {
    id: "sien",
    name: "시엔",
    cost: 3,
    minCost: 1,
    role: "격투 · 연타",
    hp: 115,
    attack: 27,
    defense: 16,
    speed: 24,
    color: "#73d7dd",
  },
  {
    id: "arman",
    name: "아만",
    cost: 3,
    minCost: 1,
    role: "빛 · 회복",
    hp: 110,
    attack: 20,
    defense: 17,
    speed: 20,
    color: "#91d9d1",
  },
  {
    id: "brelshaza",
    name: "아브렐슈드",
    cost: 5,
    minCost: 2,
    role: "몽환 · 마법",
    hp: 100,
    attack: 34,
    defense: 12,
    speed: 22,
    color: "#bba2ff",
  },
  {
    id: "echidna",
    name: "에키드나",
    cost: 4,
    minCost: 1,
    role: "뱀 · 속박",
    hp: 110,
    attack: 28,
    defense: 15,
    speed: 24,
    color: "#e283a8",
  },
  {
    id: "akkan",
    name: "일리아칸",
    cost: 4,
    minCost: 1,
    role: "부식 · 재생",
    hp: 140,
    attack: 25,
    defense: 20,
    speed: 13,
    color: "#8cc4a3",
  },
  {
    id: "kharmine",
    name: "카마인",
    cost: 4,
    minCost: 1,
    role: "화염 · 기만",
    hp: 110,
    attack: 30,
    defense: 14,
    speed: 25,
    color: "#eb7c70",
  },
  {
    id: "kamen",
    name: "카멘",
    cost: 5,
    minCost: 2,
    role: "암흑검 · 파괴",
    hp: 150,
    attack: 32,
    defense: 23,
    speed: 15,
    color: "#8f9eea",
  },
  {
    id: "kakul_saydon",
    name: "쿠크세이튼",
    cost: 4,
    minCost: 1,
    role: "광기 · 교란",
    hp: 105,
    attack: 28,
    defense: 13,
    speed: 27,
    color: "#e6a36a",
  },
] as const;
export type HeroId = (typeof HEROES)[number]["id"];
export const heroIdSchema = z.enum(HEROES.map((hero) => hero.id));
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

export * from "./combat.js";
export const battleActionSchema = mutationSchema
  .extend({
    action: z.discriminatedUnion("type", [
      z.object({ type: z.literal("attack") }).strict(),
      z
        .object({ type: z.literal("skill"), skillId: z.string().max(40) })
        .strict(),
      z.object({ type: z.literal("switch"), heroId: heroIdSchema }).strict(),
      z.object({ type: z.literal("potion") }).strict(),
    ]),
  })
  .strict();
export const rewardSchema = mutationSchema
  .extend({ choice: z.enum(["heal", "gauge", "gold", "equipment"]) })
  .strict();

export * from "./dungeon.js";
export * from "./monsters.js";
export const eventSelectSchema = mutationSchema
  .extend({ candidateId: z.string().min(1).max(100) })
  .strict();
export const riftChoiceSchema = mutationSchema
  .extend({ choiceId: z.string().min(1).max(60) })
  .strict();
export const shopBuySchema = mutationSchema
  .extend({ offerId: z.string().min(1).max(100) })
  .strict();
export const equipmentItemSchema = mutationSchema
  .extend({ itemId: z.uuid() })
  .strict();
export const equipmentEquipSchema = equipmentItemSchema
  .extend({ target: z.union([heroIdSchema, z.enum(["party:0", "party:1"])]) })
  .strict();
export const equipmentFuseSchema = mutationSchema
  .extend({ itemIds: z.array(z.uuid()).length(3) })
  .strict();
export const equipmentCraftSchema = equipmentFuseSchema
  .extend({ recipeId: z.string().max(60) })
  .strict();
