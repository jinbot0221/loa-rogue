import {
  EVENT_INFO,
  type DungeonRoute,
  type EventType,
  type EventCandidate,
  type MapNode,
} from "@loa/shared";
/** Map randomness is independent of combat/equipment RNG and persists in dungeon_json. */
export function createDungeonMap(
  seed: number,
  override?: { floor: number; candidates: EventCandidate[] },
): DungeonRoute {
  let state = (seed ^ 0x4d415000) >>> 0 || 1;
  const roll = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  const layers = Array.from({ length: 100 }, (_, i) => {
    const floor = i + 1;
    if (floor % 10 === 0)
      return {
        floor,
        nodes: [
          { id: `f${floor}_boss`, floor, lane: 1, type: "boss" as const },
        ],
      };
    const pool = (Object.keys(EVENT_INFO) as EventType[]).filter(
      (t) => t !== "battle",
    );
    const types: EventType[] = ["battle"];
    while (types.length < 3) {
      let pick = roll() * pool.reduce((n, t) => n + EVENT_INFO[t].weight, 0);
      let index = 0;
      for (; index < pool.length - 1; index++) {
        pick -= EVENT_INFO[pool[index]].weight;
        if (pick < 0) break;
      }
      types.push(pool.splice(index, 1)[0]);
    }
    return {
      floor,
      nodes: types.map((type, lane) => ({
        id: `f${floor}_${type}`,
        floor,
        lane,
        type,
      })),
    };
  });
  if (override && override.candidates.length) {
    const layer = layers.find((l) => l.floor === override.floor);
    if (layer && override.floor % 10 !== 0)
      layer.nodes = override.candidates.map((c, lane) => ({
        ...c,
        floor: override.floor,
        lane,
      }));
  }
  return { layers, visits: [] };
}
export function linked(from: MapNode, to: MapNode): boolean {
  return (
    to.floor === from.floor + 1 &&
    (from.type === "boss" ||
      to.type === "boss" ||
      Math.abs(from.lane - to.lane) <= 1)
  );
}
export function reachableRooms(map: DungeonRoute, floor: number): MapNode[] {
  const layer = map.layers.find((l) => l.floor === floor);
  if (!layer) return [];
  const previous = map.visits.find((v) => v.floor === floor - 1);
  if (!previous) return layer.nodes;
  return layer.nodes.filter(
    (n) =>
      floor % 10 === 0 ||
      (floor - 1) % 10 === 0 ||
      Math.abs(n.lane - previous.lane) <= 1,
  );
}
