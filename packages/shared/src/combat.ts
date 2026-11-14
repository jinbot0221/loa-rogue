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
};
export const PASSIVES: Record<string, string> = {
  wei: "격투의 달인: 무력화 피해 +8",
  nineveh: "명사수: 치명타 확률 +15%p",
  thirain: "불굴의 왕: HP 절반 이하 공격력 +20%",
  shandi: "환술사: 적보다 빠르면 피해 +15%",
  azena_inanna: "생명의 정령: 회복량 +30%",
  balthorr: "강철의 의지: 받는 피해 -20%",
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
  ai?: "attack" | "guard" | "status" | "heal" | "stagger";
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
  stage: "battle" | "reward" | "finished";
  battle: PublicBattle;
  gold: number;
  crystalsAwarded: number;
  partyCost: number;
  createdAt: number;
}
export interface RunRecord {
  run_id: string;
  highest_floor: number;
  outcome: string;
  crystals_awarded: number;
  created_at: number;
}
