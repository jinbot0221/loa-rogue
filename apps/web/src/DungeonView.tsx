import { useState } from "react";
import { RouteMap } from "./RouteMap";
import {
  EVENT_INFO,
  REGIONS,
  RARITY_NAMES,
  EQUIPMENT_TEMPLATES,
  RECIPES,
  MONSTERS,
  type RunView,
  type Equipment,
  type Recipe,
} from "@loa/shared";
export function GearStatsView({ item }: { item: Pick<Equipment, "stats"> }) {
  return (
    <span className="gear-stats">
      {Object.entries(item.stats)
        .filter(([, v]) => v !== 0)
        .map(
          ([k, v]) =>
            `${{ hp: "HP", attack: "공격", defense: "방어", speed: "속도", crit: "치명" }[k]} +${k === "crit" ? (v * 100).toFixed(1) + "%" : v}`,
        )
        .join(" · ")}
    </span>
  );
}
export function DungeonView({
  run,
  busy,
  onCommand,
  onHome,
  onInventory,
}: {
  run: RunView;
  busy: boolean;
  onCommand: (suffix: string, body?: Record<string, unknown>) => void;
  onHome: () => void;
  onInventory: () => void;
}) {
  const w = run.dungeon!;
  return (
    <section className="dungeon-view">
      <div className="battle-heading">
        <div>
          <p className="eyebrow">
            {REGIONS[Math.min(4, Math.floor((run.floor - 1) / 20))]} · FLOOR{" "}
            {run.floor}
          </p>
          <h1>
            {run.floor}층{" "}
            {w.phase === "choice"
              ? "갈림길"
              : w.phase === "rift"
                ? w.rift?.name
                : w.phase === "complete"
                  ? "이벤트 완료"
                  : ["shop", "forge", "rest", "treasure"].includes(w.phase)
                    ? EVENT_INFO[
                        w.phase as "shop" | "forge" | "rest" | "treasure"
                      ].name
                    : "던전"}
          </h1>
          <p className="muted">
            골드 {run.gold} · 회복약 {run.battle.potions}/9 · 경로 저장
          </p>
        </div>
        <span className="saved-label">자동 저장</span>
      </div>
      <div
        className={`dungeon-scroll ${w.phase === "choice" ? "map-mode" : ""}`}
      >
        <p className="event-message" role="status">
          {w.message}
        </p>
        {w.phase === "choice" && (
          <RouteMap
            run={run}
            busy={busy}
            onChoose={(candidateId) =>
              onCommand("select-event", { candidateId })
            }
          />
        )}
        {w.phase === "rest" && (
          <div className="event-panel">
            <h2>원정대의 휴식</h2>
            <p>생존한 영웅 전원의 최대 HP40%를 회복합니다.</p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => onCommand("rest")}
            >
              휴식하기
            </button>
          </div>
        )}
        {w.phase === "treasure" && (
          <div className="event-panel">
            <h2>봉인된 보물 상자</h2>
            <p>장비1개와 골드 {40 + run.floor * 5}를 받습니다.</p>
            <button
              className="primary"
              disabled={busy || (run.equipment?.length ?? 0) >= 60}
              onClick={() => onCommand("treasure/open")}
            >
              보물 열기
            </button>
            {(run.equipment?.length ?? 0) >= 60 && (
              <p className="error">인벤토리에서 미장착 장비를 정리하세요.</p>
            )}
          </div>
        )}
        {w.phase === "shop" && (
          <div className="shop-grid">
            {w.offers.map((o) => (
              <article className="event-panel" key={o.id}>
                <h2>{o.name}</h2>
                <p>
                  {o.equipment
                    ? `${RARITY_NAMES[o.equipment.rarity]} · ${{ weapon: "무기", armor: "방어구", accessory: "장신구", relic: "유물" }[o.equipment.slot]}`
                    : "HP40% 회복약 · 전투에서 사용"}
                </p>
                {o.equipment && <GearStatsView item={o.equipment} />}
                <p>
                  골드 {o.price} · 재고 {o.stock}
                </p>
                <button
                  disabled={
                    busy ||
                    o.stock === 0 ||
                    run.gold < o.price ||
                    (o.kind === "potion"
                      ? run.battle.potions >= 9
                      : (run.equipment?.length ?? 0) >= 60)
                  }
                  onClick={() => onCommand("shop/buy", { offerId: o.id })}
                >
                  {o.stock === 0
                    ? "품절"
                    : run.gold < o.price
                      ? "골드 부족"
                      : o.kind === "potion" && run.battle.potions >= 9
                        ? "회복약 최대 수량"
                        : "구매"}
                </button>
              </article>
            ))}
          </div>
        )}
        {w.phase === "forge" && (
          <div className="event-panel">
            <h2>대장간</h2>
            <p>
              가방을 열고 미장착 장비3개를 고르세요. 일반 합성은 같은
              등급3개, 특수 제작은 레시피에 맞는3개가 필요합니다. 유물은 일반
              합성할 수 없습니다.
            </p>
            <button className="primary" onClick={onInventory}>
              가방 · 대장간 열기
            </button>
          </div>
        )}
        {w.phase === "rift" && w.rift && (
          <div className="event-panel">
            <h2>{w.rift.name}</h2>
            <p>{w.rift.text}</p>
            <div className="rift-choices">
              {w.rift.choices.map((c) => (
                <button
                  key={c.id}
                  disabled={
                    busy ||
                    run.gold < (c.cost ?? 0) ||
                    (["gear", "relic"].includes(c.effect) &&
                      (run.equipment?.length ?? 0) >= 60)
                  }
                  onClick={() =>
                    onCommand("random-event/choose", { choiceId: c.id })
                  }
                >
                  {c.label}
                  {run.gold < (c.cost ?? 0) ? " · 골드 부족" : ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="dungeon-footer">
        {["complete", "shop", "forge"].includes(w.phase) && (
          <button
            className="primary next-floor"
            disabled={busy}
            onClick={() => onCommand("continue")}
          >
            다음 층으로
          </button>
        )}
        <div className="event-party">
          {run.battle.party.map((h) => (
            <div key={h.id}>
              <strong>{h.name}</strong>
              <span>
                HP {h.hp}/{h.maxHp}
              </span>
              <small>
                공격 {h.attack} · 방어 {h.defense} · 속도 {h.speed}
              </small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Inventory({
  run,
  busy,
  onCommand,
  forceOpen = false,
}: {
  run: RunView;
  busy: boolean;
  onCommand: (suffix: string, body?: Record<string, unknown>) => void;
  forceOpen?: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [rarity, setRarity] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [targets, setTargets] = useState<Record<string, string>>({}),
    [recipe, setRecipe] = useState(RECIPES[0].id);
  const items = run.equipment ?? [],
    usable = run.status === "active" && run.stage !== "battle",
    forge = run.dungeon?.phase === "forge" && usable;
  const ids = selected.filter((id) =>
    items.some((i) => i.id === id && !i.equippedTo),
  );
  const materials = ids.map((id) => items.find((i) => i.id === id)!);
  const canFuse =
    forge &&
    ids.length === 3 &&
    materials.every(
      (i) =>
        i.rarity === materials[0].rarity && i.slot !== "relic" && i.rarity < 4,
    );
  const formula = RECIPES.find((r) => r.id === recipe)!;
  const canCraft =
    forge &&
    ids.length === 3 &&
    materials
      .map((i) => i.templateId)
      .sort()
      .join(",") === [...formula.ingredients].sort().join(",");
  const toggle = (id: string) =>
    setSelected((old) =>
      old.includes(id)
        ? old.filter((i) => i !== id)
        : old.filter((i) => items.some((e) => e.id === i)).length < 3
          ? [...old.filter((i) => items.some((e) => e.id === i)), id]
          : old,
    );
  return (
    <details className="inventory-panel" open={forge || forceOpen}>
      <summary>
        장비 인벤토리 ({items.length}/60) ·{" "}
        {usable ? "관리 가능" : "전투/종료 중에는 변경 불가"}
      </summary>
      <div className="inventory-filters">
        <label>
          부위
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">전체 부위</option>
            {[
              ["weapon", "무기"],
              ["armor", "방어구"],
              ["accessory", "장신구"],
              ["relic", "유물"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          등급
          <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
            <option value="all">전체 등급</option>
            {RARITY_NAMES.map((r, i) => (
              <option key={i} value={i}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="gear-grid">
        {items
          .filter(
            (i) =>
              (filter === "all" || i.slot === filter) &&
              (rarity === "all" || i.rarity === Number(rarity)),
          )
          .map((item) => {
            const target =
              targets[item.id] ??
              (item.slot === "relic" ? "party:0" : run.battle.party[0].id);
            return (
              <article
                className={`gear-card grade-${item.rarity}`}
                key={item.id}
                data-testid={`gear-${item.id}`}
              >
                <h3>{item.name}</h3>
                <p>
                  {RARITY_NAMES[item.rarity]} ·{" "}
                  {
                    {
                      weapon: "무기",
                      armor: "방어구",
                      accessory: "장신구",
                      relic: "공유 유물",
                    }[item.slot]
                  }
                </p>
                <GearStatsView item={item} />
                <small>
                  {item.equippedTo
                    ? `장착: ${item.equippedTo.startsWith("party:") ? `공유 ${Number(item.equippedTo.at(-1)) + 1}` : run.battle.party.find((h) => h.id === item.equippedTo)?.name}`
                    : "미장착"}
                </small>
                {item.equippedTo ? (
                  <button
                    disabled={busy || !usable}
                    onClick={() =>
                      onCommand("equipment/unequip", { itemId: item.id })
                    }
                  >
                    장착 해제
                  </button>
                ) : (
                  <>
                    <label>
                      장착 대상
                      <select
                        aria-label={`${item.name} 장착 대상 ${item.id}`}
                        value={target}
                        disabled={busy || !usable}
                        onChange={(e) =>
                          setTargets((old) => ({
                            ...old,
                            [item.id]: e.target.value,
                          }))
                        }
                      >
                        {item.slot === "relic" ? (
                          <>
                            <option value="party:0">공유 유물1</option>
                            <option value="party:1">공유 유물2</option>
                          </>
                        ) : (
                          run.battle.party.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <button
                      disabled={busy || !usable}
                      onClick={() =>
                        onCommand("equipment/equip", {
                          itemId: item.id,
                          target,
                        })
                      }
                    >
                      장착
                    </button>
                  </>
                )}
                <div className="gear-actions">
                  <button
                    disabled={busy || !usable || !!item.equippedTo}
                    onClick={() =>
                      onCommand("equipment/salvage", { itemId: item.id })
                    }
                  >
                    분해 +{(item.rarity + 1) * 5}G
                  </button>
                  <button
                    disabled={busy || !usable || !!item.equippedTo}
                    onClick={() =>
                      onCommand("equipment/discard", { itemId: item.id })
                    }
                  >
                    버리기
                  </button>
                </div>
                {forge && (
                  <label className="material-check">
                    <input
                      type="checkbox"
                      checked={ids.includes(item.id)}
                      disabled={
                        busy ||
                        !!item.equippedTo ||
                        item.slot === "relic" ||
                        (ids.length >= 3 && !ids.includes(item.id))
                      }
                      onChange={() => toggle(item.id)}
                    />
                    합성/제작 재료
                  </label>
                )}
              </article>
            );
          })}
      </div>
      {items.length === 0 && (
        <p className="muted">
          전투 장비 보상, 보물방, 상점, 랜덤 이벤트에서 장비를 얻으세요.
        </p>
      )}
      {forge && (
        <section className="forge-controls">
          <h2>선택 재료 {ids.length}/3</h2>
          <p>
            {materials.map((i) => i.name).join(" + ") ||
              "미장착 장비를 선택하세요."}
          </p>
          <button
            className="primary"
            disabled={busy || !canFuse}
            onClick={() => onCommand("equipment/fuse", { itemIds: ids })}
          >
            동급3개 합성 → 다음 등급1개
          </button>
          <label>
            특수 레시피
            <select value={recipe} onChange={(e) => setRecipe(e.target.value)}>
              {RECIPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {formula.ingredients
              .map((id) => EQUIPMENT_TEMPLATES.find((t) => t.id === id)!.name)
              .join(" + ")}{" "}
            → {RARITY_NAMES[formula.rarity]} {formula.name}
          </p>
          <button
            disabled={busy || !canCraft}
            onClick={() =>
              onCommand("equipment/craft", { itemIds: ids, recipeId: recipe })
            }
          >
            특수 제작 · 조합법 영구 발견
          </button>
        </section>
      )}
    </details>
  );
}
export function Bestiary({ forceOpen = false }: { forceOpen?: boolean }) {
  const [rank, setRank] = useState("all"),
    [region, setRegion] = useState("all");
  return (
    <details className="bestiary records" open={forceOpen}>
      <summary>몬스터 도감 · 일반30 / 정예10 / 보스10</summary>
      <div className="inventory-filters">
        <label>
          분류
          <select
            aria-label="몬스터 분류"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
          >
            <option value="all">전체50종</option>
            <option value="normal">일반30종</option>
            <option value="elite">정예10종</option>
            <option value="boss">보스10종</option>
          </select>
        </label>
        <label>
          지역
          <select
            aria-label="몬스터 지역"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">전체 지역</option>
            {REGIONS.map((r, i) => (
              <option key={r} value={i}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="monster-grid">
        {MONSTERS.filter(
          (m) =>
            (rank === "all" || m.rank === rank) &&
            (region === "all" || m.region === Number(region)),
        ).map((m) => (
          <details className="monster-entry" key={m.id}>
            <summary>
              {m.floor ? `${m.floor}층 ` : ""}
              {m.name} ·{" "}
              {{ normal: "일반", elite: "정예", boss: "보스" }[m.rank]}
            </summary>
            <p>
              {REGIONS[m.region]} · {m.element} · AI {m.ai}
            </p>
            <p>
              기본 HP {m.hp} / 공격 {m.attack} / 방어 {m.defense} / 속도{" "}
              {m.speed} · 층별 스케일링
            </p>
            <p>
              {m.skill.name} · 위력 {m.skill.power} · 무력화 {m.skill.stagger}
            </p>
            {m.pattern && (
              <p>
                예고: {m.pattern.interval}라운드마다 {m.pattern.skill.name} · HP{" "}
                {m.pattern.threshold * 100}%에서2페이즈 ·{" "}
                {
                  {
                    shield: "보호막",
                    heal: "회복",
                    stagger: "충격파",
                    enrage: "광폭화",
                  }[m.pattern.mechanic]
                }
              </p>
            )}
          </details>
        ))}
      </div>
    </details>
  );
}
export function RecipeBook({
  recipes,
  forceOpen = false,
}: {
  recipes: Recipe[];
  forceOpen?: boolean;
}) {
  return (
    <details className="records" open={forceOpen}>
      <summary>
        발견한 조합법 ({recipes.length}/{RECIPES.length})
      </summary>
      {recipes.length ? (
        recipes.map((r) => (
          <p key={r.id}>
            {r.name}:{" "}
            {r.ingredients
              .map((id) => EQUIPMENT_TEMPLATES.find((t) => t.id === id)!.name)
              .join(" + ")}{" "}
            → {RARITY_NAMES[r.rarity]} 장비
          </p>
        ))
      ) : (
        <p>대장간에서 특수 제작을 성공하면 계정에 영구 저장됩니다.</p>
      )}
    </details>
  );
}
