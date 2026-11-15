export type Effect = "burn" | "bleed" | "stun" | "slow";
export interface Skill {
  id: string;
  name: string;
  power: number;
  stagger: number;
  cooldown: number;
  effect?: Effect;
  duration?: number;
  effectPower?: number;
  heal?: number;
  shield?: number;
  ultimate?: boolean;
}
export const BASIC: Skill = {
  id: "attack",
  name: "기본 공격",
  power: 28,
  stagger: 12,
  cooldown: 0,
};
export const HERO_SKILLS: Record<string, Skill[]> = {
  wei: [
    { id: "wei_1", name: "파쇄권", power: 42, stagger: 38, cooldown: 2 },
    {
      id: "wei_2",
      name: "진각",
      power: 25,
      stagger: 25,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "wei_u",
      name: "도철의 포효",
      power: 90,
      stagger: 70,
      cooldown: 0,
      ultimate: true,
    },
  ],
  nineveh: [
    { id: "nineveh_1", name: "빛의 화살", power: 48, stagger: 15, cooldown: 2 },
    {
      id: "nineveh_2",
      name: "속박의 깃",
      power: 32,
      stagger: 20,
      cooldown: 3,
      effect: "slow",
      duration: 2,
      effectPower: 35,
    },
    {
      id: "nineveh_u",
      name: "천공의 빛",
      power: 110,
      stagger: 40,
      cooldown: 0,
      ultimate: true,
    },
  ],
  thirain: [
    {
      id: "thirain_1",
      name: "왕의 일격",
      power: 44,
      stagger: 25,
      cooldown: 2,
      effect: "bleed",
      duration: 2,
      effectPower: 5,
    },
    {
      id: "thirain_2",
      name: "수호의 검",
      power: 24,
      stagger: 15,
      cooldown: 3,
      shield: 25,
    },
    {
      id: "thirain_u",
      name: "빛의 맹세",
      power: 90,
      stagger: 50,
      cooldown: 0,
      heal: 20,
      ultimate: true,
    },
  ],
  shandi: [
    {
      id: "shandi_1",
      name: "환영의 족쇄",
      power: 30,
      stagger: 20,
      cooldown: 2,
      effect: "slow",
      duration: 3,
      effectPower: 40,
    },
    {
      id: "shandi_2",
      name: "몽환의 장막",
      power: 18,
      stagger: 18,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "shandi_u",
      name: "시간의 틈",
      power: 75,
      stagger: 55,
      cooldown: 0,
      effect: "stun",
      duration: 1,
      ultimate: true,
    },
  ],
  azena_inanna: [
    {
      id: "azena_1",
      name: "정령의 불꽃",
      power: 40,
      stagger: 20,
      cooldown: 2,
      effect: "burn",
      duration: 3,
      effectPower: 7,
    },
    {
      id: "azena_2",
      name: "이난나의 축복",
      power: 0,
      stagger: 0,
      cooldown: 3,
      heal: 35,
    },
    {
      id: "azena_u",
      name: "태초의 공명",
      power: 95,
      stagger: 40,
      cooldown: 0,
      heal: 35,
      ultimate: true,
    },
  ],
  balthorr: [
    {
      id: "balthorr_1",
      name: "대지의 망치",
      power: 36,
      stagger: 40,
      cooldown: 2,
    },
    {
      id: "balthorr_2",
      name: "강철의 보루",
      power: 0,
      stagger: 0,
      cooldown: 3,
      shield: 55,
    },
    {
      id: "balthorr_u",
      name: "불굴의 대장장이",
      power: 70,
      stagger: 60,
      cooldown: 0,
      shield: 70,
      ultimate: true,
    },
  ],
  kadan: [
    { id: "kadan_1", name: "시련의 검", power: 52, stagger: 24, cooldown: 2 },
    {
      id: "kadan_2",
      name: "단죄의 섬광",
      power: 35,
      stagger: 30,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "kadan_u",
      name: "절멸의 검",
      power: 115,
      stagger: 60,
      cooldown: 0,
      ultimate: true,
    },
  ],
  galatur: [
    {
      id: "galatur_1",
      name: "용광로의 일격",
      power: 35,
      stagger: 38,
      cooldown: 2,
    },
    {
      id: "galatur_2",
      name: "장인의 방벽",
      power: 0,
      stagger: 0,
      cooldown: 3,
      shield: 50,
    },
    {
      id: "galatur_u",
      name: "태초의 모루",
      power: 80,
      stagger: 65,
      cooldown: 0,
      shield: 45,
      ultimate: true,
    },
  ],
  delain_arman: [
    {
      id: "delain_arman_1",
      name: "검은 손아귀",
      power: 43,
      stagger: 22,
      cooldown: 2,
      effect: "bleed",
      duration: 2,
      effectPower: 6,
    },
    {
      id: "delain_arman_2",
      name: "데런의 재생",
      power: 23,
      stagger: 15,
      cooldown: 3,
      heal: 25,
    },
    {
      id: "delain_arman_u",
      name: "어둠의 해방",
      power: 100,
      stagger: 45,
      cooldown: 0,
      effect: "bleed",
      duration: 3,
      effectPower: 8,
      ultimate: true,
    },
  ],
  luterra: [
    { id: "luterra_1", name: "왕의 진격", power: 44, stagger: 30, cooldown: 2 },
    {
      id: "luterra_2",
      name: "기사의 맹세",
      power: 22,
      stagger: 15,
      cooldown: 3,
      shield: 30,
    },
    {
      id: "luterra_u",
      name: "왕국의 빛",
      power: 95,
      stagger: 50,
      cooldown: 0,
      heal: 20,
      ultimate: true,
    },
  ],
  valtan: [
    {
      id: "valtan_1",
      name: "마수의 도끼",
      power: 46,
      stagger: 42,
      cooldown: 2,
    },
    {
      id: "valtan_2",
      name: "대지 분쇄",
      power: 30,
      stagger: 38,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "valtan_u",
      name: "파멸의 격노",
      power: 105,
      stagger: 80,
      cooldown: 0,
      ultimate: true,
    },
  ],
  vykas: [
    {
      id: "vykas_1",
      name: "매혹의 날개",
      power: 40,
      stagger: 18,
      cooldown: 2,
      effect: "slow",
      duration: 2,
      effectPower: 35,
    },
    {
      id: "vykas_2",
      name: "욕망의 낙인",
      power: 28,
      stagger: 20,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "vykas_u",
      name: "붉은 유혹",
      power: 95,
      stagger: 40,
      cooldown: 0,
      effect: "slow",
      duration: 3,
      effectPower: 40,
      ultimate: true,
    },
  ],
  sien: [
    { id: "sien_1", name: "청룡 연권", power: 43, stagger: 35, cooldown: 2 },
    {
      id: "sien_2",
      name: "푸른 장풍",
      power: 28,
      stagger: 25,
      cooldown: 3,
      effect: "slow",
      duration: 2,
      effectPower: 30,
    },
    {
      id: "sien_u",
      name: "무극의 일격",
      power: 100,
      stagger: 65,
      cooldown: 0,
      ultimate: true,
    },
  ],
  arman: [
    { id: "arman_1", name: "성스러운 빛", power: 34, stagger: 18, cooldown: 2 },
    {
      id: "arman_2",
      name: "구원의 기도",
      power: 0,
      stagger: 0,
      cooldown: 3,
      heal: 40,
    },
    {
      id: "arman_u",
      name: "새벽의 축복",
      power: 75,
      stagger: 35,
      cooldown: 0,
      heal: 45,
      shield: 20,
      ultimate: true,
    },
  ],
  brelshaza: [
    {
      id: "brelshaza_1",
      name: "몽환의 구체",
      power: 49,
      stagger: 20,
      cooldown: 2,
    },
    {
      id: "brelshaza_2",
      name: "뒤틀린 공간",
      power: 30,
      stagger: 25,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "brelshaza_u",
      name: "별의 붕괴",
      power: 115,
      stagger: 50,
      cooldown: 0,
      effect: "slow",
      duration: 2,
      effectPower: 30,
      ultimate: true,
    },
  ],
  echidna: [
    {
      id: "echidna_1",
      name: "가시의 입맞춤",
      power: 40,
      stagger: 20,
      cooldown: 2,
      effect: "bleed",
      duration: 3,
      effectPower: 5,
    },
    {
      id: "echidna_2",
      name: "뱀의 속박",
      power: 28,
      stagger: 25,
      cooldown: 3,
      effect: "slow",
      duration: 3,
      effectPower: 40,
    },
    {
      id: "echidna_u",
      name: "만개한 독니",
      power: 100,
      stagger: 45,
      cooldown: 0,
      effect: "bleed",
      duration: 3,
      effectPower: 9,
      ultimate: true,
    },
  ],
  akkan: [
    {
      id: "akkan_1",
      name: "부식의 낫",
      power: 38,
      stagger: 25,
      cooldown: 2,
      effect: "burn",
      duration: 3,
      effectPower: 6,
    },
    {
      id: "akkan_2",
      name: "불사의 숨결",
      power: 0,
      stagger: 0,
      cooldown: 3,
      heal: 40,
      shield: 15,
    },
    {
      id: "akkan_u",
      name: "역병의 행진",
      power: 90,
      stagger: 55,
      cooldown: 0,
      heal: 35,
      ultimate: true,
    },
  ],
  kharmine: [
    {
      id: "kharmine_1",
      name: "붉은 마염",
      power: 45,
      stagger: 20,
      cooldown: 2,
      effect: "burn",
      duration: 2,
      effectPower: 6,
    },
    {
      id: "kharmine_2",
      name: "기만의 장막",
      power: 25,
      stagger: 20,
      cooldown: 3,
      shield: 25,
    },
    {
      id: "kharmine_u",
      name: "혼돈의 문",
      power: 105,
      stagger: 45,
      cooldown: 0,
      effect: "burn",
      duration: 3,
      effectPower: 8,
      ultimate: true,
    },
  ],
  kamen: [
    { id: "kamen_1", name: "암흑의 참격", power: 50, stagger: 35, cooldown: 2 },
    {
      id: "kamen_2",
      name: "절망의 검",
      power: 32,
      stagger: 30,
      cooldown: 3,
      effect: "slow",
      duration: 2,
      effectPower: 35,
    },
    {
      id: "kamen_u",
      name: "어둠의 종언",
      power: 120,
      stagger: 65,
      cooldown: 0,
      ultimate: true,
    },
  ],
  kakul_saydon: [
    {
      id: "kakul_saydon_1",
      name: "불꽃 곡예",
      power: 41,
      stagger: 20,
      cooldown: 2,
      effect: "burn",
      duration: 2,
      effectPower: 5,
    },
    {
      id: "kakul_saydon_2",
      name: "깜짝 상자",
      power: 26,
      stagger: 25,
      cooldown: 3,
      effect: "stun",
      duration: 1,
    },
    {
      id: "kakul_saydon_u",
      name: "광기의 축제",
      power: 100,
      stagger: 50,
      cooldown: 0,
      effect: "burn",
      duration: 3,
      effectPower: 7,
      ultimate: true,
    },
  ],
};
export const PASSIVES: Record<string, string> = {
  wei: "격투의 달인: 무력화 피해 +8",
  nineveh: "명사수: 치명타 확률 +15%p",
  thirain: "불굴의 왕: HP 절반 이하 공격력 +20%",
  shandi: "환술사: 적보다 빠르면 피해 +15%",
  azena_inanna: "생명의 정령: 회복량 +30%",
  balthorr: "강철의 의지: 받는 피해 -20%",
  kadan: "전투 준비: 치명타 확률 +10%p",
  galatur: "전투 준비: 보호막 20 (3턴)",
  delain_arman: "전투 준비: 치명타 확률 +10%p",
  luterra: "전투 준비: 보호막 20 (3턴)",
  valtan: "전투 준비: 보호막 20 (3턴)",
  vykas: "전투 준비: 궁극기 게이지 +20으로 시작",
  sien: "전투 준비: 치명타 확률 +10%p",
  arman: "전투 준비: 궁극기 게이지 +20으로 시작",
  brelshaza: "전투 준비: 궁극기 게이지 +20으로 시작",
  echidna: "전투 준비: 궁극기 게이지 +20으로 시작",
  akkan: "전투 준비: 보호막 20 (3턴)",
  kharmine: "전투 준비: 치명타 확률 +10%p",
  kamen: "전투 준비: 보호막 20 (3턴)",
  kakul_saydon: "전투 준비: 궁극기 게이지 +20으로 시작",
};
export const HERO_PASSIVE_BONUSES: Partial<
  Record<string, { shield?: number; crit?: number; gauge?: number }>
> = {
  kadan: { crit: 0.1 },
  galatur: { shield: 20 },
  delain_arman: { crit: 0.1 },
  luterra: { shield: 20 },
  valtan: { shield: 20 },
  vykas: { gauge: 20 },
  sien: { crit: 0.1 },
  arman: { gauge: 20 },
  brelshaza: { gauge: 20 },
  echidna: { gauge: 20 },
  akkan: { shield: 20 },
  kharmine: { crit: 0.1 },
  kamen: { shield: 20 },
  kakul_saydon: { gauge: 20 },
};

export interface CombatStatus {
  kind: Effect;
  turns: number;
  power: number;
  appliedTurn: number;
}
export interface Fighter {
  id: string;
  heroId?: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
  stagger: number;
  maxStagger: number;
  staggered: boolean;
  immunity: number;
  shield: number;
  shieldTurns: number;
  statuses: CombatStatus[];
  cooldowns: Record<string, number>;
  gauge: number;
  boss: boolean;
  ai?: import("./monsters.js").MonsterAI;
  templateId?: string;
  element?: string;
  model?: import("./monsters.js").MonsterModel;
  color?: string;
  primarySkill?: Skill;
  pattern?: import("./monsters.js").MonsterTemplate["pattern"];
  phase?: number;
}
export interface BattleLog {
  id: number;
  turn: number;
  kind: "attack" | "status" | "switch" | "heal" | "system";
  actor: string;
  target?: string;
  amount?: number;
  text: string;
}
export interface BattleState {
  party: Fighter[];
  enemies: Fighter[];
  activeHero: number;
  activeEnemy: number;
  turn: number;
  needsSwitch: boolean;
  outcome: "ongoing" | "victory" | "defeat";
  potions: number;
  rng: number;
  logs: BattleLog[];
  logSequence: number;
}
export type PublicBattle = Omit<BattleState, "rng">;
export type BattleAction =
  | { type: "attack" }
  | { type: "skill"; skillId: string }
  | { type: "switch"; heroId: string }
  | { type: "potion" };
export interface RunView {
  id: string;
  status: "active" | "defeated" | "abandoned" | "cleared";
  floor: number;
  completedFloor: number;
  revision: number;
  stage: "battle" | "reward" | "finished" | "event";
  battle: PublicBattle;
  gold: number;
  crystalsAwarded: number;
  partyCost: number;
  createdAt: number;
  dungeon?: import("./dungeon.js").PublicDungeon;
  equipment?: import("./dungeon.js").Equipment[];
}
export interface RunRecord {
  run_id: string;
  highest_floor: number;
  outcome: string;
  crystals_awarded: number;
  created_at: number;
}
