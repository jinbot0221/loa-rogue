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
import { GameDialog } from "./GameDialog";
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
        HP {fighter.hp}/{fighter.maxHp}
        <progress
          aria-label={`${fighter.name} HP`}
          max={fighter.maxHp}
          value={fighter.hp}
        />
      </label>
      <label className="stagger-bar">
        무력화 {fighter.stagger}/{fighter.maxStagger}
        <progress
          aria-label={`${fighter.name} 무력화`}
          max={fighter.maxStagger}
          value={fighter.stagger}
        />
      </label>
      <small>
        {fighter.staggered ? "무력화 " : ""}
        {fighter.immunity > 0 ? `면역${fighter.immunity}턴 ` : ""}
        {fighter.shield > 0 ? `보호막${fighter.shield} ` : ""}
        {fighter.statuses
          .map((s) => `${statusName[s.kind]}${s.turns}`)
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
}: {
  run: RunView;
  busy: boolean;
  onAction: (a: BattleAction) => void;
  onReward: (c: RewardKind) => void;
  onAbandon: () => void;
  onHome: () => void;
}) {
  const [panel, setPanel] = useState<"log" | "enemy" | null>(null);
  const b = run.battle,
    hero = b.party[b.activeHero],
    enemy = b.enemies[b.activeEnemy],
    ended = run.status !== "active",
    fighting = run.stage === "battle" && !ended;
  return (
    <section className="battle-screen compact-battle">
      <div className="battle-heading">
        <div>
          <h1>
            {run.floor}층 {enemy.boss ? "보스전" : "전투"}
          </h1>
          <p className="muted">
            턴 {b.turn} · 자동 저장 · 골드 {run.gold}
          </p>
        </div>
        <div className="battle-heading-tools">
          <button onClick={() => setPanel("enemy")}>상세 정보</button>
          <button onClick={() => setPanel("log")}>전투 기록</button>
        </div>
      </div>
      <div className="combat-grid">
        <div className="combat-stage">
          <div className="battle-vitals">
            <Vitals fighter={hero} />
            <Vitals fighter={enemy} />
          </div>
          <Suspense
            fallback={
              <div className="scene-wrapper loading">전투 씬 로딩 중…</div>
            }
          >
            <BattleScene
              key={`${run.id}:${run.floor}`}
              battle={b}
              floor={run.floor}
            />
          </Suspense>
          <p className="enemy-intent">
            {fighting
              ? `다음 적 행동: ${enemyIntent(b)}${(enemy.phase ?? 1) > 1 ? " · 2페이즈" : ""}`
              : ended
                ? "도전 종료"
                : "전투 승리"}{" "}
            · 적 {b.activeEnemy + 1}/{b.enemies.length}
          </p>
        </div>
        <aside className="combat-commands">
          {fighting ? (
            <>
              <div className="command-title">
                <strong>
                  {b.needsSwitch ? "영웅 교체 필요" : "행동 선택"}
                </strong>
                <span>궁극기 {hero.gauge}/100</span>
              </div>
              {b.needsSwitch ? (
                <p role="status" className="error">
                  아래의 살아 있는 대기 영웅을 누르세요. 강제 교체는 턴을
                  소모하지 않습니다.
                </p>
              ) : (
                <div className="action-grid">
                  <button
                    disabled={busy}
                    onClick={() => onAction({ type: "attack" })}
                  >
                    {BASIC.name}
                    <small>무력화12 · 게이지+25</small>
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
                          ? "궁극기100"
                          : (hero.cooldowns[skill.id] ?? 0) > 0
                            ? `대기 ${hero.cooldowns[skill.id]}턴`
                            : `쿨타임 ${skill.cooldown}턴`}
                      </small>
                    </button>
                  ))}
                  <button
                    disabled={busy || b.potions <= 0 || hero.hp === hero.maxHp}
                    onClick={() => onAction({ type: "potion" })}
                  >
                    회복약 ({b.potions})<small>HP40% · 1턴</small>
                  </button>
                </div>
              )}
              <p className="passive">{PASSIVES[hero.heroId ?? ""]}</p>
            </>
          ) : run.stage === "reward" ? (
            <div className="battle-reward">
              <h2>{run.floor}층 클리어 · 보상 1개 선택</h2>
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
                          heal: "생존 파티HP25%",
                          gauge: "궁극기+35",
                          gold: `골드+${25 + run.floor * 5}`,
                          equipment:
                            (run.equipment?.length ?? 0) >= 60
                              ? "가방을 정리하세요"
                              : "장비1개",
                        }[choice]
                      }
                    </small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="run-result" role="status">
              <h2>
                {run.status === "cleared"
                  ? "100층 정복"
                  : run.status === "defeated"
                    ? "원정대 전멸"
                    : "도전 포기"}
              </h2>
              <p>
                완료 {run.completedFloor}층 · 최고 {run.floor}층
              </p>
              <strong>아크의 결정 +{run.crystalsAwarded}</strong>
              <p>서버 저장 완료 · 위의 로비로 버튼으로 돌아가세요.</p>
            </div>
          )}
        </aside>
      </div>
      <div className="battle-party">
        {b.party.map((h, i) => (
          <button
            key={h.id}
            aria-pressed={i === b.activeHero}
            disabled={busy || !fighting || i === b.activeHero || h.hp <= 0}
            onClick={() => onAction({ type: "switch", heroId: h.id })}
          >
            <strong>{h.name}</strong>
            <small>{h.hp <= 0 ? "전투 불능" : `HP ${h.hp}/${h.maxHp}`}</small>
            <small>
              {i === b.activeHero
                ? "선봉"
                : b.needsSwitch
                  ? "무료 교체"
                  : "교체 · 1턴"}
            </small>
          </button>
        ))}
      </div>
      {panel && (
        <GameDialog
          title={panel === "log" ? "전투 기록" : "상세 정보"}
          onClose={() => setPanel(null)}
        >
          {panel === "log" ? (
            <ol className="combat-log-list" aria-label="전투 기록">
              {b.logs.slice(-40).map((l) => (
                <li key={l.id}>
                  <small>T{l.turn}</small> {l.text}
                </li>
              ))}
            </ol>
          ) : (
            <>
              <h3>
                {enemy.name} · {enemy.element ?? "물리"}
              </h3>
              <p>
                AI {enemy.ai} · 페이즈 {enemy.phase ?? 1} · 공격 {enemy.attack}{" "}
                · 방어 {enemy.defense} · 속도 {enemy.speed}
              </p>
              <p>
                {enemy.primarySkill?.name ?? "일반 공격"}
                {enemy.pattern
                  ? ` / ${enemy.pattern.interval}라운드마다 ${enemy.pattern.skill.name} · HP${enemy.pattern.threshold * 100}%에서 페이즈 전환`
                  : ""}
              </p>
              <h3>{hero.name}</h3>
              <p>{PASSIVES[hero.heroId ?? ""]}</p>
              {HERO_SKILLS[hero.heroId ?? ""].map((s) => (
                <p key={s.id}>
                  {s.name} · 위력{s.power} · 무력화{s.stagger}
                  {s.heal ? ` · 회복${s.heal}` : ""}
                  {s.shield ? ` · 보호막${s.shield}` : ""}
                </p>
              ))}
            </>
          )}
        </GameDialog>
      )}
    </section>
  );
}
