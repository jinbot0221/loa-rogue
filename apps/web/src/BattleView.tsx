import { useState, lazy, Suspense } from "react";
import {
  BASIC,
  HERO_SKILLS,
  PASSIVES,
  type Fighter,
  type RunView,
  type BattleAction,
  type RewardKind,
} from "@loa/shared";
import { enemyIntent } from "@loa/game-engine";
const BattleScene = lazy(() => import("./BattleScene"));
const statusName = { burn: "화상", bleed: "출혈", stun: "기절", slow: "감속" };
function Vitals({ fighter }: { fighter: Fighter }) {
  return (
    <section className="vitals">
      <div>
        <h2>{fighter.name}</h2>
        <span>{fighter.boss ? "BOSS" : fighter.heroId ? "HERO" : "ENEMY"}</span>
      </div>
      <label>
        HP {fighter.hp} / {fighter.maxHp}
        <progress
          aria-label={`${fighter.name} HP`}
          max={fighter.maxHp}
          value={fighter.hp}
        />
      </label>
      <label className="stagger-bar">
        무력화 {fighter.stagger} / {fighter.maxStagger}
        <progress
          aria-label={`${fighter.name} 무력화`}
          max={fighter.maxStagger}
          value={fighter.stagger}
        />
      </label>
      <small>
        {fighter.staggered ? "무력화 · 다음 행동 봉쇄 " : ""}
        {fighter.immunity > 0 ? `무력화·기절 면역 ${fighter.immunity}턴 ` : ""}
        {fighter.shield > 0
          ? `보호막 ${fighter.shield} (${fighter.shieldTurns}턴) `
          : ""}
        {fighter.statuses
          .map(
            (s) =>
              `${statusName[s.kind]} ${s.turns}${s.kind === "stun" ? "행동" : "턴"}`,
          )
          .join(" · ") || "상태이상 없음"}
      </small>
    </section>
  );
}
export function BattleView({
  run,
  busy,
  onAction,
  onReward,
  onAbandon,
  onHome,
}: {
  run: RunView;
  busy: boolean;
  onAction: (action: BattleAction) => void;
  onReward: (choice: RewardKind) => void;
  onAbandon: () => void;
  onHome: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const battle = run.battle,
    hero = battle.party[battle.activeHero],
    enemy = battle.enemies[battle.activeEnemy];
  const ended = run.status !== "active",
    fighting = run.stage === "battle" && !ended;
  return (
    <section className="battle-screen">
      <div className="battle-heading">
        <div>
          <p className="eyebrow">
            RIFT EXPEDITION ·{" "}
            {run.dungeon?.selected === "elite" ? "정예전" : "던전 전투"}
          </p>
          <h1>
            {run.floor}층 {enemy.boss ? "보스전" : "전투"}
          </h1>
          <p className="muted">
            턴 {battle.turn} · 저장 REV {run.revision} · 골드 {run.gold} ·
            회복약 {battle.potions}
          </p>
        </div>
        <button onClick={onHome} disabled={busy}>
          로비로 {ended ? "" : "(진행 유지)"}
        </button>
      </div>
      <div className="battle-layout">
        <div className="battle-field">
          <div className="battle-vitals">
            <Vitals fighter={hero} />
            <Vitals fighter={enemy} />
          </div>
          <Suspense
            fallback={
              <div className="scene-wrapper loading">전투 씬 로딩 중…</div>
            }
          >
            <BattleScene battle={battle} />
          </Suspense>
          <p className="enemy-intent">
            {fighting
              ? `다음 적 행동: ${enemyIntent(battle)}${enemy.boss && enemy.hp <= enemy.maxHp / 2 ? " · 광폭화" : ""}`
              : battle.outcome === "victory"
                ? "전투 승리"
                : "도전 종료"}{" "}
            · 적 {battle.activeEnemy + 1}/{battle.enemies.length}
          </p>
          <details className="monster-entry">
            <summary>적 정보 · {enemy.name}</summary>
            <p>
              {enemy.element ?? "물리"} · AI {enemy.ai} · 페이즈{" "}
              {enemy.phase ?? 1}
            </p>
            <p>
              공격 {enemy.attack} · 방어 {enemy.defense} · 속도 {enemy.speed}
            </p>
            <p>
              {enemy.primarySkill?.name ?? "일반 공격"}
              {enemy.pattern
                ? ` · ${enemy.pattern.interval}턴마다 ${enemy.pattern.skill.name} / HP ${enemy.pattern.threshold * 100}% 페이즈 전환`
                : ""}
            </p>
          </details>
          {fighting && (
            <div className="battle-controls">
              <p className="passive">
                {PASSIVES[hero.heroId ?? ""]} · 궁극기 {hero.gauge}/100
              </p>
              {battle.needsSwitch ? (
                <p role="status" className="error">
                  선봉이 전투 불능입니다. 아래의 살아 있는 대기 영웅으로
                  교체하세요. 턴은 소모하지 않습니다.
                </p>
              ) : (
                <div className="action-grid">
                  <button
                    disabled={busy}
                    onClick={() => onAction({ type: "attack" })}
                  >
                    {BASIC.name}
                    <small>무력화 12 · 게이지 +25</small>
                  </button>
                  {HERO_SKILLS[hero.heroId ?? ""].map((skill) => (
                    <button
                      key={skill.id}
                      className={skill.ultimate ? "ultimate" : ""}
                      disabled={
                        busy ||
                        (hero.cooldowns[skill.id] ?? 0) > 0 ||
                        (skill.ultimate && hero.gauge < 100)
                      }
                      onClick={() =>
                        onAction({ type: "skill", skillId: skill.id })
                      }
                    >
                      {skill.name}
                      <small>
                        {skill.ultimate
                          ? "궁극기 · 게이지 100"
                          : (hero.cooldowns[skill.id] ?? 0) > 0
                            ? `재사용 ${hero.cooldowns[skill.id]}턴`
                            : `재사용 ${skill.cooldown}턴`}
                        {skill.heal
                          ? ` · 회복 ${skill.heal}`
                          : skill.shield
                            ? ` · 보호막 ${skill.shield}`
                            : ` · 위력 ${skill.power}`}
                      </small>
                    </button>
                  ))}
                  <button
                    disabled={
                      busy || battle.potions <= 0 || hero.hp === hero.maxHp
                    }
                    onClick={() => onAction({ type: "potion" })}
                  >
                    회복약 ({battle.potions})
                    <small>현재 영웅 HP 40% · 1턴</small>
                  </button>
                </div>
              )}
            </div>
          )}
          {run.stage === "reward" && (
            <section className="battle-reward">
              <h2>{run.floor}층 클리어 · 보상 1개 선택</h2>
              <p className="muted">
                선택 후 다음 층으로 이동합니다. 전투 불능 영웅은 회복되지
                않습니다.
              </p>
              <div className="action-grid">
                {(
                  run.dungeon?.rewardChoices ??
                  (["heal", "gauge", "gold"] as RewardKind[])
                ).map((choice) => (
                  <button
                    key={choice}
                    disabled={
                      busy ||
                      (choice === "equipment" &&
                        (run.equipment?.length ?? 0) >= 60)
                    }
                    onClick={() => onReward(choice)}
                  >
                    {
                      {
                        heal: "휴식의 기운",
                        gauge: "전투의 고양",
                        gold: "금빛 주머니",
                        equipment: "장비 획득",
                      }[choice]
                    }
                    <small>
                      {
                        {
                          heal: "생존 파티 HP25% 회복",
                          gauge: "생존 파티 궁극기+35",
                          gold: `골드 +${25 + run.floor * 5}`,
                          equipment:
                            (run.equipment?.length ?? 0) >= 60
                              ? "인벤토리를 정리하세요."
                              : "시드 기반 장비1개",
                        }[choice]
                      }
                    </small>
                  </button>
                ))}
              </div>
            </section>
          )}
          {ended && (
            <section className="run-result" role="status">
              <h2>
                {run.status === "cleared"
                  ? "100층 정복"
                  : run.status === "defeated"
                    ? "원정대 전멸"
                    : "도전 포기"}
              </h2>
              <p>
                완료 {run.completedFloor}층 · 최고 도달 {run.floor}층
              </p>
              <strong>아크의 결정 +{run.crystalsAwarded}</strong>
              <p className="muted">
                보상과 기록이 서버에 저장되었습니다. 로비에서 새 도전을 시작할
                수 있습니다.
              </p>
            </section>
          )}
          <div className="battle-party">
            {battle.party.map((h, i) => (
              <button
                key={h.id}
                aria-pressed={i === battle.activeHero}
                disabled={
                  busy || !fighting || i === battle.activeHero || h.hp <= 0
                }
                onClick={() => onAction({ type: "switch", heroId: h.id })}
              >
                <strong>{h.name}</strong>
                <small>
                  {h.hp <= 0 ? "전투 불능" : `HP ${h.hp}/${h.maxHp}`}
                </small>
                <small>
                  {i === battle.activeHero
                    ? "선봉"
                    : battle.needsSwitch
                      ? "강제 교체 (무료)"
                      : "교체 (1턴)"}
                </small>
              </button>
            ))}
          </div>
          <p className="muted">
            1~100층 · 10층마다 보스 · 장비 관리는 전투 보상/층 이벤트에서
            가능합니다.
          </p>
        </div>
        <aside className="battle-log">
          <h2>전투 기록</h2>
          <ol aria-label="전투 기록">
            {battle.logs.slice(-24).map((log) => (
              <li key={log.id} className={`log-${log.kind}`}>
                <small>T{log.turn}</small> {log.text}
              </li>
            ))}
          </ol>
          {!ended && (
            <div className="abandon-control">
              {confirming ? (
                <>
                  <p>
                    포기 보상: 결정 {run.completedFloor * 5}개<br />이 도전을
                    종료할까요?
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => {
                      onAbandon();
                      setConfirming(false);
                    }}
                  >
                    포기 확정
                  </button>
                  <button disabled={busy} onClick={() => setConfirming(false)}>
                    취소
                  </button>
                </>
              ) : (
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  도전 포기
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
