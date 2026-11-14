import type { Fighter, Skill } from "./combat.js";
export type EventType =
  | "battle"
  | "elite"
  | "rest"
  | "shop"
  | "forge"
  | "treasure"
  | "rift";
export const EVENT_INFO: Record<
  EventType,
  { name: string; description: string; weight: number }
> = {
  battle: {
    name: "일반전",
    description: "지역의 적과 전투하고 보상을 선택합니다.",
    weight: 5,
  },
  elite: {
    name: "정예전",
    description: "강화된 적과 싸웁니다. 좋은 장비를 얻을 기회입니다.",
    weight: 3,
  },
  rest: {
    name: "휴식",
    description: "살아 있는 영웅의 HP를 40% 회복합니다.",
    weight: 4,
  },
  shop: {
    name: "상점",
    description: "골드로 고정 재고의 장비와 회복약을 구매합니다.",
    weight: 3,
  },
  forge: {
    name: "대장간",
    description: "장비3개 합성과 특수 조합을 사용할 수 있습니다.",
    weight: 3,
  },
  treasure: {
    name: "보물방",
    description: "장비1개와 골드를 획득합니다.",
    weight: 3,
  },
  rift: {
    name: "???",
    description: "진입한 뒤에야 사건의 정체가 드러납니다.",
    weight: 4,
  },
};
export interface EventCandidate {
  id: string;
  type: EventType;
}
export type Rarity = 0 | 1 | 2 | 3 | 4;
export const RARITY_NAMES = ["일반", "고급", "희귀", "영웅", "전설"] as const;
export type EquipmentSlot = "weapon" | "armor" | "accessory" | "relic";
export interface GearStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
}
export interface EquipmentTemplate {
  id: string;
  name: string;
  slot: EquipmentSlot;
  stats: GearStats;
}
const stats = (hp = 0, attack = 0, defense = 0, speed = 0, crit = 0) => ({
  hp,
  attack,
  defense,
  speed,
  crit,
});
export const EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
  { id: "bronze_sword", name: "청동 검", slot: "weapon", stats: stats(0, 5) },
  {
    id: "hunter_bow",
    name: "사냥꾼의 활",
    slot: "weapon",
    stats: stats(0, 4, 0, 1),
  },
  {
    id: "oak_staff",
    name: "참나무 지팡이",
    slot: "weapon",
    stats: stats(5, 4),
  },
  { id: "iron_plate", name: "철갑", slot: "armor", stats: stats(12, 0, 4) },
  {
    id: "leather_coat",
    name: "바람 가죽옷",
    slot: "armor",
    stats: stats(8, 0, 2, 2),
  },
  {
    id: "ember_ring",
    name: "불씨 반지",
    slot: "accessory",
    stats: stats(0, 2, 0, 0, 0.02),
  },
  {
    id: "moon_pendant",
    name: "달빛 목걸이",
    slot: "accessory",
    stats: stats(10, 0, 1, 1),
  },
  {
    id: "solar_blade",
    name: "태양의 서약",
    slot: "weapon",
    stats: stats(10, 8, 0, 1, 0.02),
  },
  {
    id: "night_aegis",
    name: "밤의 방벽",
    slot: "armor",
    stats: stats(20, 0, 7),
  },
  {
    id: "star_seal",
    name: "별의 인장",
    slot: "accessory",
    stats: stats(12, 3, 0, 2, 0.03),
  },
  {
    id: "ark_fragment",
    name: "수호의 유물",
    slot: "relic",
    stats: stats(8, 0, 2),
  },
  {
    id: "storm_totem",
    name: "폭풍의 유물",
    slot: "relic",
    stats: stats(0, 2, 0, 1),
  },
];
export interface Equipment {
  id: string;
  templateId: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  stats: GearStats;
  equippedTo: string | null;
}
export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  output: string;
  rarity: Rarity;
}
export const RECIPES: Recipe[] = [
  {
    id: "sun_oath",
    name: "태양의 서약",
    ingredients: ["bronze_sword", "iron_plate", "ember_ring"],
    output: "solar_blade",
    rarity: 3,
  },
  {
    id: "night_wall",
    name: "밤의 방벽",
    ingredients: ["iron_plate", "leather_coat", "moon_pendant"],
    output: "night_aegis",
    rarity: 3,
  },
  {
    id: "star_pact",
    name: "별의 계약",
    ingredients: ["oak_staff", "ember_ring", "moon_pendant"],
    output: "star_seal",
    rarity: 4,
  },
];
export type RewardKind = "heal" | "gauge" | "gold" | "equipment";
export interface ShopOffer {
  id: string;
  kind: "equipment" | "potion";
  name: string;
  price: number;
  stock: number;
  equipment?: Omit<Equipment, "id" | "equippedTo">;
}
export interface RandomChoice {
  id: string;
  label: string;
  cost?: number;
  effect:
    | "gear"
    | "trap"
    | "shop"
    | "altar"
    | "forge"
    | "battle"
    | "heal"
    | "contract"
    | "relic"
    | "gauge"
    | "goblin"
    | "time"
    | "leave";
  gold?: number;
}
export interface RandomEvent {
  id: string;
  name: string;
  text: string;
  category: "positive" | "danger" | "choice" | "rare";
  weight: number;
  minFloor: number;
  choices: RandomChoice[];
}
export const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: "hidden_treasure",
    name: "숨겨진 보물",
    text: "낡은 벽 뒤에서 작은 상자를 발견했습니다.",
    category: "positive",
    weight: 10,
    minFloor: 1,
    choices: [
      {
        id: "open",
        label: "상자를 연다 · 장비와 골드40",
        effect: "gear",
        gold: 40,
      },
    ],
  },
  {
    id: "trap",
    name: "함정",
    text: "바닥의 장치가 움직입니다. 해체하거나 위험을 감수하세요.",
    category: "danger",
    weight: 10,
    minFloor: 1,
    choices: [
      {
        id: "disarm",
        label: "골드20으로 해체 · 장비와 골드45 획득",
        cost: 20,
        effect: "gear",
        gold: 45,
      },
      {
        id: "force",
        label: "강행 · 파티 HP15% 손실, 골드25",
        effect: "trap",
        gold: 25,
      },
    ],
  },
  {
    id: "wandering_merchant",
    name: "떠돌이 상인",
    text: "균열 사이에 상인이 기다리고 있습니다.",
    category: "positive",
    weight: 10,
    minFloor: 1,
    choices: [{ id: "trade", label: "상인의 물품을 본다", effect: "shop" }],
  },
  {
    id: "cursed_altar",
    name: "저주받은 제단",
    text: "피를 대가로 원정대 전체의 힘을 제안합니다.",
    category: "choice",
    weight: 5,
    minFloor: 1,
    choices: [
      {
        id: "offer",
        label: "HP20%를 바치고 공격력+3 (이번 도전)",
        effect: "altar",
      },
      { id: "leave", label: "떠난다", effect: "leave" },
    ],
  },
  {
    id: "secret_forge",
    name: "비밀 대장간",
    text: "오래된 화로에서 합성과 특수 제작을 할 수 있습니다.",
    category: "positive",
    weight: 10,
    minFloor: 1,
    choices: [{ id: "forge", label: "화로를 사용한다", effect: "forge" }],
  },
  {
    id: "unknown_enemy",
    name: "미지의 적",
    text: "어둠 속의 정예가 길을 막았습니다.",
    category: "danger",
    weight: 10,
    minFloor: 1,
    choices: [{ id: "fight", label: "정예와 전투한다", effect: "battle" }],
  },
  {
    id: "healing_spring",
    name: "회복의 샘",
    text: "생명의 물이 원정대의 상처를 씻습니다.",
    category: "positive",
    weight: 10,
    minFloor: 1,
    choices: [{ id: "drink", label: "생존 파티 HP50% 회복", effect: "heal" }],
  },
  {
    id: "ancient_contract",
    name: "고대의 계약",
    text: "골드를 내면 생명의 그릇을 키워준다고 합니다.",
    category: "choice",
    weight: 5,
    minFloor: 1,
    choices: [
      {
        id: "sign",
        label: "골드35 · 최대HP+15 (이번 도전)",
        cost: 35,
        effect: "contract",
      },
      { id: "leave", label: "거절한다", effect: "leave" },
    ],
  },
  {
    id: "forgotten_relic",
    name: "잊힌 유물",
    text: "먼지 아래에서 파티를 지킬 유물이 빛납니다.",
    category: "rare",
    weight: 5,
    minFloor: 1,
    choices: [
      { id: "take", label: "파티 공유 유물을 얻는다", effect: "relic" },
    ],
  },
  {
    id: "rift_choice",
    name: "균열의 선택",
    text: "골드를 택하거나 전투의 기운을 얻을 수 있습니다.",
    category: "choice",
    weight: 10,
    minFloor: 1,
    choices: [
      { id: "gold", label: "골드50 획득", effect: "leave", gold: 50 },
      { id: "power", label: "생존 파티 궁극기+50", effect: "gauge" },
    ],
  },
  {
    id: "treasure_goblin",
    name: "보물 고블린",
    text: "도망가는 고블린을 잡으면 추가 골드를 얻습니다.",
    category: "danger",
    weight: 10,
    minFloor: 1,
    choices: [
      { id: "chase", label: "전투 · 승리 시 추가 골드100", effect: "goblin" },
    ],
  },
  {
    id: "twisted_time",
    name: "뒤틀린 시간",
    text: "흐려지는 시간이 원정대의 발걸음을 가볍게 합니다.",
    category: "rare",
    weight: 5,
    minFloor: 1,
    choices: [
      {
        id: "accept",
        label: "생존 파티 HP20% 회복 · 속도+2 (이번 도전)",
        effect: "time",
      },
    ],
  },
];
export interface MapNode {
  id: string;
  floor: number;
  lane: number;
  type: EventType | "boss";
}
export interface MapLayer {
  floor: number;
  nodes: MapNode[];
}
export interface MapVisit {
  floor: number;
  nodeId: string;
  lane: number;
}
export interface DungeonRoute {
  layers: MapLayer[];
  visits: MapVisit[];
}
export interface DungeonState {
  version: 1;
  phase:
    | "choice"
    | "battle"
    | "rest"
    | "shop"
    | "forge"
    | "treasure"
    | "rift"
    | "complete";
  candidates: EventCandidate[];
  selected?: EventType | "boss";
  baseParty: Fighter[];
  offers: ShopOffer[];
  riftId?: string;
  message: string;
  rewardChoices: RewardKind[];
  battleBonusGold: number;
  map?: DungeonRoute;
}
export type PublicDungeon = Omit<DungeonState, "baseParty"> & {
  rift?: RandomEvent;
};
export const EQUIPMENT_LIMIT = 60;
