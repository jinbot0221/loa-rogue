import { test } from "node:test";
import assert from "node:assert/strict";
import { createDungeonMap, linked, reachableRooms } from "./map.js";
test("map has 100 fixed layers, unique rooms, seeded reproducibility and a single boss at every tenth floor", () => {
  const a = createDungeonMap(12345),
    b = createDungeonMap(12345);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, createDungeonMap(98642));
  assert.equal(a.layers.length, 100);
  for (const layer of a.layers) {
    assert.equal(layer.nodes.length, layer.floor % 10 === 0 ? 1 : 3);
    assert.equal(
      new Set(layer.nodes.map((n) => n.id)).size,
      layer.nodes.length,
    );
    if (layer.floor % 10 === 0) assert.equal(layer.nodes[0].type, "boss");
  }
});
test("only adjacent lanes are reachable, routes never dead-end and bosses reconnect all three lanes", () => {
  const map = createDungeonMap(55);
  map.visits.push({ floor: 1, nodeId: map.layers[0].nodes[0].id, lane: 0 });
  assert.deepEqual(
    reachableRooms(map, 2).map((n) => n.lane),
    [0, 1],
  );
  assert.equal(linked(map.layers[0].nodes[0], map.layers[1].nodes[2]), false);
  assert.equal(linked(map.layers[0].nodes[0], map.layers[1].nodes[1]), true);
  for (let floor = 2; floor <= 100; floor++) {
    const rooms = reachableRooms(map, floor);
    assert.ok(rooms.length >= 1);
    const n = rooms[rooms.length - 1];
    map.visits.push({ floor, nodeId: n.id, lane: n.lane });
  }
  assert.equal(reachableRooms(map, 11).length, 3);
  assert.equal(reachableRooms(map, 101).length, 0);
});
test("legacy current candidates are preserved while the rest of the future map stays deterministic", () => {
  const candidates = [
    { id: "legacy_a", type: "treasure" as const },
    { id: "legacy_b", type: "rest" as const },
    { id: "legacy_c", type: "shop" as const },
  ];
  const map = createDungeonMap(911, { floor: 13, candidates });
  assert.deepEqual(
    map.layers[12].nodes.map((n) => ({ id: n.id, type: n.type })),
    candidates,
  );
  assert.deepEqual(map.layers[13], createDungeonMap(911).layers[13]);
});
