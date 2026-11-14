import { useEffect, useState } from "react";
import { EVENT_INFO, type RunView, type MapNode } from "@loa/shared";
import { linked } from "@loa/game-engine";
const icons = {
  battle: "⚔",
  elite: "♜",
  rest: "♧",
  shop: "◈",
  forge: "⚒",
  treasure: "✦",
  rift: "?",
  boss: "♛",
};
const name = (node: MapNode) =>
  node.type === "boss" ? "보스" : EVENT_INFO[node.type].name;
export function RouteMap({
  run,
  busy,
  onChoose,
}: {
  run: RunView;
  busy: boolean;
  onChoose: (candidateId: string) => void;
}) {
  const map = run.dungeon?.map;
  const [offset, setOffset] = useState(
      Math.floor(((run.floor - 1) % 10) / 5) * 5,
    ),
    [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    setOffset(Math.floor(((run.floor - 1) % 10) / 5) * 5);
    setFocused(null);
  }, [run.floor]);
  if (!map) return <p>현재 층을 완료하면 경로 지도를 이용할 수 있습니다.</p>;
  const chapter = Math.floor((run.floor - 1) / 10) * 10 + 1,
    first = chapter + offset;
  const layers = map.layers.filter(
    (l) => l.floor >= first && l.floor < first + 5,
  );
  const available =
    run.status === "active" &&
    run.dungeon?.phase === "choice" &&
    run.stage === "event"
      ? run.dungeon.candidates
      : [];
  const nodes = layers.flatMap((l) => l.nodes),
    focus = nodes.find((n) => n.id === focused);
  const canGo = !!focus && available.some((c) => c.id === focus.id);
  const positions = (node: MapNode) => ({
    x: ((node.floor - first + 0.5) / 5) * 100,
    y: ((node.lane + 0.5) / 3) * 100,
  });
  const visited = (id: string) => map.visits.some((v) => v.nodeId === id);
  return (
    <div className="route-map">
      <div className="route-board">
        <div className="route-pagination">
          <button disabled={offset === 0} onClick={() => setOffset(0)}>
            ← {chapter}~{chapter + 4}층
          </button>
          <span>현재 {run.floor}층 · 연결된 방만 이동</span>
          <button disabled={offset === 5} onClick={() => setOffset(5)}>
            {chapter + 5}~{chapter + 9}층 →
          </button>
        </div>
        <div className="route-floor-labels">
          {layers.map((l) => (
            <span key={l.floor}>{l.floor}층</span>
          ))}
        </div>
        <div className="route-graph" role="group" aria-label="던전 경로 지도">
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {nodes.flatMap((from) =>
              nodes
                .filter((to) => linked(from, to))
                .map((to) => {
                  const a = positions(from),
                    b = positions(to);
                  return (
                    <line
                      key={`${from.id}-${to.id}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={
                        visited(from.id) && visited(to.id) ? "taken" : ""
                      }
                    />
                  );
                }),
            )}
          </svg>
          {nodes.map((node) => {
            const p = positions(node),
              allowed = available.some((c) => c.id === node.id),
              seen = visited(node.id);
            return (
              <button
                key={node.id}
                data-nodeid={node.id}
                className={`map-node ${node.type} ${allowed ? "reachable" : ""} ${seen ? "visited" : ""} ${focused === node.id ? "focused" : ""}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-label={`${node.floor}층 ${name(node)} 방 ${allowed ? "선택" : seen ? "방문 완료" : "이동 불가"}`}
                aria-pressed={focused === node.id}
                disabled={busy || !allowed}
                onClick={() => setFocused(node.id)}
              >
                <span>{icons[node.type]}</span>
                <small>
                  {name(node)}
                  {seen ? " ✓" : ""}
                </small>
              </button>
            );
          })}
        </div>
        <div className="map-legend">
          <span>● 이동 가능</span>
          <span>✓ 선택 경로</span>
          <span>연결선: 다음 층 인접 방</span>
          <span>♛ 10층마다 보스</span>
        </div>
      </div>
      <aside className="route-detail">
        <p className="eyebrow">CHOOSE YOUR PATH</p>
        <h2>
          {focus ? `${focus.floor}층 ${name(focus)}` : "다음 방을 선택하세요"}
        </h2>
        <p>
          {focus && focus.type !== "boss"
            ? EVENT_INFO[focus.type].description
            : "밝게 표시된 방을 누르고 이동을 확정하세요. 앞으로의 방을 보며 경로를 계획할 수 있습니다."}
        </p>
        <small>선택한 경로는 자동 저장됩니다.</small>
        <button
          className="primary"
          disabled={busy || !canGo}
          onClick={() => {
            if (focus) onChoose(focus.id);
          }}
        >
          이 방으로 이동
        </button>
      </aside>
    </div>
  );
}
