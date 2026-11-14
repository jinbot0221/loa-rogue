import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { HERO_SKILLS, type PublicBattle } from "@loa/shared";

const REGIONS = [
  {
    id: "forest",
    name: "새벽의 숲",
    sky: "#173d42",
    far: "#214f4a",
    near: "#102d32",
    glow: "#9fe4c1",
    floor: "#284a43",
  },
  {
    id: "ruins",
    name: "황혼의 유적",
    sky: "#4c3845",
    far: "#70554c",
    near: "#352d3b",
    glow: "#f3c78d",
    floor: "#4c4248",
  },
  {
    id: "frost",
    name: "서리 협곡",
    sky: "#254363",
    far: "#547b91",
    near: "#263f58",
    glow: "#b9f1ff",
    floor: "#435c70",
  },
  {
    id: "abyss",
    name: "심연의 성채",
    sky: "#30234e",
    far: "#4b305d",
    near: "#201b34",
    glow: "#dc8ded",
    floor: "#44344f",
  },
];
export function battleRegion(floor: number) {
  return REGIONS[Math.min(3, Math.max(0, Math.floor((floor - 1) / 25)))];
}
export function BattleBackdrop({
  floor,
  boss,
}: {
  floor: number;
  boss: boolean;
}) {
  const region = battleRegion(floor),
    id = useId().replaceAll(":", "");
  return (
    <>
      <svg
        className="battle-backdrop"
        viewBox="0 0 900 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        data-region={region.id}
      >
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1">
            <stop stopColor={region.sky} />
            <stop offset="1" stopColor={region.near} />
          </linearGradient>
          <radialGradient id={`${id}-light`}>
            <stop stopColor={region.glow} stopOpacity=".28" />
            <stop offset="1" stopColor={region.glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path fill={`url(#${id}-sky)`} d="M0 0H900V300H0Z" />
        <ellipse
          cx="460"
          cy="85"
          rx="350"
          ry="190"
          fill={`url(#${id}-light)`}
        />
        <circle cx="650" cy="60" r="27" fill={region.glow} opacity=".35" />
        <path
          d="M0 145 100 80 190 140 315 40 440 150 570 70 710 135 810 55 900 145V300H0Z"
          fill={region.far}
        />
        {region.id === "forest"
          ? [20, 110, 220, 690, 790, 880].map((x, i) => (
              <g key={x} transform={`translate(${x},${(i % 2) * 20 - 20})`}>
                <path d="M-10 0H10L17 250H-16Z" fill={region.near} />
                <path d="M0 10-75 125H75ZM0 65-90 185H90Z" fill={region.near} />
                <path d="M-2 0H3V235H-2Z" fill={region.glow} opacity=".12" />
              </g>
            ))
          : region.id === "frost"
            ? [20, 145, 740, 870].map((x, i) => (
                <g key={x} transform={`translate(${x},${(i % 2) * 35})`}>
                  <path
                    d="M-55 230-25 65 0 30 32 80 55 230Z"
                    fill={region.near}
                  />
                  <path
                    d="M-25 65 0 30 8 180-55 230Z"
                    fill={region.glow}
                    opacity=".32"
                  />
                </g>
              ))
            : [65, 180, 725, 835].map((x, i) => (
                <g key={x} transform={`translate(${x},${(i % 2) * 25})`}>
                  <path
                    d="M-25 85H25V235H-25ZM-33 70H33V88H-33ZM-33 225H33V240H-33Z"
                    fill={region.near}
                  />
                  <path
                    d={
                      region.id === "abyss"
                        ? "M-25 70 0 10 25 70Z"
                        : "M-33 66H33V72H-33Z"
                    }
                    fill={region.near}
                  />
                  <path
                    d="M-15 95H-10V215H-15Z"
                    fill={region.glow}
                    opacity=".2"
                  />
                </g>
              ))}
        <path d="M0 236Q220 206 450 231T900 226V300H0Z" fill={region.floor} />
        <path
          d="M0 274Q450 211 900 273M310 300 425 235M590 300 475 235"
          fill="none"
          stroke={region.glow}
          opacity=".12"
          strokeWidth="2"
        />
        {[110, 260, 370, 540, 680, 810].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={90 + (i % 3) * 42}
            r="2"
            fill={region.glow}
            opacity=".55"
          />
        ))}
        {boss && (
          <path
            d="M450 20 477 60 450 100 423 60ZM430 60H470"
            fill="none"
            stroke="#ff997d"
            strokeWidth="3"
            opacity=".7"
          />
        )}
      </svg>
      <span className="battle-region-label">
        {region.name}
        {boss ? " · 보스 구역" : ""}
      </span>
    </>
  );
}

type Visual = {
  id: number;
  kind: string;
  label: string;
  color: string;
  enemy: boolean;
  ultimate: boolean;
  amount?: number;
};
const HERO_FX: Record<string, [string, string]> = {
  wei: ["shockwave", "#c09aff"],
  nineveh: ["arrow", "#87efff"],
  thirain: ["slash", "#ffe5a2"],
  shandi: ["rune", "#96f0ce"],
  azena_inanna: ["flame", "#d5a0ff"],
  balthorr: ["impact", "#ffbe6a"],
};
export function BattleEffects({ battle }: { battle: PublicBattle }) {
  const seen = useRef(battle.logSequence);
  const [queue, setQueue] = useState<Visual[]>([]);
  useEffect(() => {
    const fresh = battle.logs.filter((log) => log.id > seen.current);
    seen.current = battle.logSequence;
    const visuals: Visual[] = [];
    for (const log of fresh) {
      if (!(
        (log.kind === "attack" && log.amount === undefined) ||
        log.kind === "heal"
      ))
        continue;
      const actor = battle.party.find((f) => f.id === log.actor);
      const skill = (HERO_SKILLS[actor?.heroId ?? ""] ?? []).find((s) =>
        log.text.includes(s.name),
      );
      const [kind, color] = HERO_FX[actor?.heroId ?? ""] ?? [
        "slash",
        "#ff8b91",
      ];
      const damage = fresh.find(
        (l) =>
          l.id > log.id &&
          l.actor === log.actor &&
          l.kind === "attack" &&
          l.amount !== undefined,
      );
      visuals.push({
        id: log.id,
        kind:
          log.kind === "heal"
            ? "heal"
            : skill?.shield && !skill.power
              ? "shield"
              : kind,
        color: log.kind === "heal" ? "#a1f5be" : color,
        label:
          log.kind === "heal"
            ? "생명 회복"
            : (skill?.name ?? log.text.split(": ").at(-1) ?? "공격"),
        enemy: !actor,
        ultimate: !!skill?.ultimate,
        amount: log.kind === "heal" ? log.amount : damage?.amount,
      });
    }
    if (visuals.length) setQueue((old) => [...old, ...visuals].slice(-8));
  }, [battle.logs, battle.logSequence, battle.party]);
  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => setQueue((old) => old.slice(1)), 850);
    return () => window.clearTimeout(timer);
  }, [current]);
  if (!current) return null;
  return (
    <div
      key={current.id}
      className={`battle-fx ${current.enemy ? "enemy-fx" : "hero-fx"} ${current.ultimate ? "ultimate-fx" : ""} fx-${current.kind}`}
      style={{ "--fx-color": current.color } as CSSProperties}
      data-effect={current.kind}
      data-actor={current.enemy ? "enemy" : "hero"}
      aria-hidden="true"
    >
      <div className="fx-title">
        {current.ultimate ? "✦ " : ""}
        {current.label}
      </div>
      <svg
        viewBox="0 0 900 300"
        preserveAspectRatio="none"
        className="fx-shapes"
      >
        <g className="fx-projectile">
          <path d="M245 166 650 145 625 155 650 165Z" />
          <path d="M280 183 610 156" fill="none" strokeWidth="3" />
        </g>
        <g className="fx-burst" fill="none" strokeWidth="5">
          <ellipse cx="650" cy="165" rx="55" ry="70" />
          <ellipse cx="650" cy="165" rx="80" ry="40" />
          <path d="M595 220 705 105M600 108 700 220M580 166H720" />
          <path d="M650 90 700 125 700 205 650 240 600 205 600 125Z" />
        </g>
        <g className="fx-motes">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle
              key={i}
              cx={650 + Math.cos((i * Math.PI) / 4) * 95}
              cy={165 + Math.sin((i * Math.PI) / 4) * 65}
              r={i % 2 ? 4 : 7}
            />
          ))}
        </g>
      </svg>
      {current.amount !== undefined && (
        <span className="fx-amount">
          {current.kind === "heal" ? "+" : "−"}
          {current.amount}
        </span>
      )}
    </div>
  );
}
