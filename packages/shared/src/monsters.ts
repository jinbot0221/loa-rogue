import type { Skill, Effect } from "./combat.js";
export type MonsterAI =
  | "attack"
  | "guard"
  | "status"
  | "heal"
  | "stagger"
  | "rage"
  | "pattern";
export type MonsterModel =
  | "beast"
  | "humanoid"
  | "plant"
  | "spirit"
  | "demon"
  | "guardian";
export interface MonsterTemplate {
  id: string;
  name: string;
  region: number;
  rank: "normal" | "elite" | "boss";
  floor?: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  element: string;
  ai: MonsterAI;
  model: MonsterModel;
  color: string;
  skill: Skill;
  pattern?: {
    interval: number;
    skill: Skill;
    threshold: number;
    multiplier: number;
    mechanic: "shield" | "heal" | "stagger" | "enrage";
  };
}
export const REGIONS = [
  "루테란",
  "로헨델",
  "페이튼",
  "엘가시아",
  "균열 심층부",
];
const groups: [string, MonsterAI, MonsterModel, string][][] = [
  [
    ["초원 늑대", "attack", "beast", "바람"],
    ["산적 정찰병", "status", "humanoid", "물리"],
    ["돌갑옷 멧돼지", "guard", "beast", "대지"],
    ["폐허 망치병", "stagger", "humanoid", "물리"],
    ["붉은 이교도", "heal", "humanoid", "암흑"],
    ["광분한 들개", "rage", "beast", "물리"],
  ],
  [
    ["가시 덩굴", "status", "plant", "대지"],
    ["이끼 정령", "heal", "plant", "생명"],
    ["폭풍 요정", "attack", "spirit", "바람"],
    ["수정 골렘", "guard", "guardian", "빛"],
    ["뒤틀린 나무", "stagger", "plant", "대지"],
    ["서리 망령", "pattern", "spirit", "얼음"],
  ],
  [
    ["핏빛 구울", "rage", "demon", "암흑"],
    ["묘지 기사", "guard", "humanoid", "암흑"],
    ["독안개 마귀", "status", "demon", "독"],
    ["망각의 사제", "heal", "humanoid", "암흑"],
    ["비명 유령", "pattern", "spirit", "암흑"],
    ["사슬 악마", "stagger", "demon", "물리"],
  ],
  [
    ["빛의 파수병", "guard", "guardian", "빛"],
    ["날개 달린 수호령", "attack", "spirit", "빛"],
    ["환영 추적자", "status", "humanoid", "환영"],
    ["천공 치유사", "heal", "spirit", "빛"],
    ["금빛 거신", "stagger", "guardian", "빛"],
    ["질서 집행자", "pattern", "guardian", "빛"],
  ],
  [
    ["혼돈 사냥개", "rage", "beast", "혼돈"],
    ["균열 침식자", "status", "demon", "혼돈"],
    ["공허의 마도사", "pattern", "humanoid", "암흑"],
    ["변이 치유체", "heal", "plant", "혼돈"],
    ["심연 갑옷", "guard", "guardian", "암흑"],
    ["파멸 집행귀", "stagger", "demon", "혼돈"],
  ],
];
const colors = ["#9b7654", "#6aa784", "#8c668d", "#aeb6d8", "#b45c76"];
function skillFor(ai: MonsterAI, i: number, name: string): Skill {
  const effects: Effect[] = ["bleed", "slow", "burn", "stun"];
  return {
    id: `skill_${i}`,
    name,
    power: ai === "guard" ? 16 : ai === "rage" ? 23 : 18,
    stagger: ai === "stagger" ? 32 : 15,
    cooldown: 0,
    ...(ai === "status"
      ? {
          effect: effects[i % 4],
          duration: i % 4 === 3 ? 1 : 2,
          effectPower: i % 4 === 1 ? 25 : 5,
        }
      : {}),
  };
}
export const MONSTERS: MonsterTemplate[] = groups.flatMap((group, region) =>
  group.map(([name, ai, model, element], i) => ({
    id: `normal_${region}_${i}`,
    name,
    region,
    rank: "normal" as const,
    hp: 55 + i * 4,
    attack: 12 + i,
    defense: 8 + i,
    speed: 10 + i,
    element,
    ai,
    model,
    color: colors[region],
    skill: skillFor(
      ai,
      region * 6 + i,
      `${name}의 ${ai === "status" ? "저주" : ai === "stagger" ? "강타" : "일격"}`,
    ),
  })),
);
const eliteNames = [
  ["검은 갈기 우두머리", "광신의 집행관"],
  ["고목의 심장", "폭풍의 지배자"],
  ["혈흔의 포식자", "망각의 사령관"],
  ["금빛 심판자", "추락한 수호자"],
  ["공허의 추격자", "혼돈의 거신"],
];
for (let region = 0; region < 5; region++)
  for (let i = 0; i < 2; i++) {
    const ai: MonsterAI = i === 0 ? "rage" : "pattern";
    const name = eliteNames[region][i];
    MONSTERS.push({
      id: `elite_${region}_${i}`,
      name,
      region,
      rank: "elite",
      hp: 110 + i * 15,
      attack: 20 + i * 3,
      defense: 17 + i * 2,
      speed: 15 + i * 2,
      element: region === 4 ? "혼돈" : region === 3 ? "빛" : "암흑",
      ai,
      model: i === 0 ? "beast" : "guardian",
      color: colors[region],
      skill: skillFor(ai, 30 + region * 2 + i, `${name}의 맹공`),
      pattern: {
        interval: 3,
        skill: {
          id: "elite_pattern",
          name: "정예의 폭발",
          power: 36,
          stagger: 28,
          cooldown: 0,
        },
        threshold: 0.5,
        multiplier: 1.15,
        mechanic: "enrage",
      },
    });
  }
const bosses: [
  string,
  MonsterModel,
  MonsterAI,
  Effect | "none",
  "shield" | "heal" | "stagger" | "enrage",
][] = [
  ["균열의 파수꾼", "guardian", "guard", "none", "shield"],
  ["발탄", "demon", "stagger", "bleed", "stagger"],
  ["가시의 여왕", "plant", "heal", "slow", "heal"],
  ["비아키스", "demon", "status", "stun", "enrage"],
  ["혈흔의 추적자", "beast", "rage", "bleed", "enrage"],
  ["쿠크세이튼", "demon", "pattern", "burn", "shield"],
  ["빛의 문지기", "guardian", "guard", "stun", "shield"],
  ["아브렐슈드", "spirit", "pattern", "slow", "heal"],
  ["무너진 별의 수호자", "guardian", "stagger", "burn", "stagger"],
  ["혼돈의 심장", "demon", "pattern", "stun", "enrage"],
];
bosses.forEach(([name, model, ai, effect, mechanic], i) => {
  const region = Math.floor(i / 2);
  MONSTERS.push({
    id: `boss_${(i + 1) * 10}`,
    name,
    region,
    rank: "boss",
    floor: (i + 1) * 10,
    hp: 145 + i * 4,
    attack: 22 + i,
    defense: 20 + i,
    speed: 14 + (i % 4),
    element: region === 4 ? "혼돈" : region === 3 ? "빛" : "암흑",
    ai,
    model,
    color: colors[region],
    skill: skillFor(ai, 40 + i, `${name}의 공격`),
    pattern: {
      interval: 2 + (i % 3),
      skill: {
        id: `boss_pattern_${i}`,
        name: [
          "석벽 분쇄",
          "피의 지진",
          "가시 폭풍",
          "매혹의 낙인",
          "사냥의 종언",
          "광기의 화염",
          "빛의 심판",
          "몽환의 붕괴",
          "별의 추락",
          "혼돈 개벽",
        ][i],
        power: 43 + i * 2,
        stagger: 28 + i * 2,
        cooldown: 0,
        ...(effect === "none"
          ? {}
          : {
              effect,
              duration: effect === "stun" ? 1 : 2,
              effectPower: effect === "slow" ? 35 : 7,
            }),
      },
      threshold: i === 9 ? 0.6 : 0.5,
      multiplier: 1.25 + i * 0.02,
      mechanic,
    },
  });
});
