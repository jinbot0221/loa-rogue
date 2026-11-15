import { test } from "node:test";
import assert from "node:assert/strict";
import { HEROES, partyCost, validateParty } from "./index.js";
test("six initial heroes have exact specification stats and costs", () => {
  assert.deepEqual(
    HEROES.slice(0, 6).map((h) => h.cost),
    [3, 4, 3, 4, 5, 2],
  );
  assert.equal(partyCost(HEROES.slice(0, 6).map((h) => h.id)), 21);
  assert.match(validateParty(HEROES.slice(0, 6).map((h) => h.id))!, /15/);
});
test("party boundaries, duplicates and permanent reductions", () => {
  assert.ok(validateParty([]));
  assert.ok(validateParty(["wei", "wei"]));
  assert.equal(
    validateParty(["wei", "nineveh", "thirain", "azena_inanna"]),
    null,
  );
  const ids = HEROES.slice(0, 6).map((h) => h.id);
  const reduction = Object.fromEntries(ids.map((id) => [id, 1]));
  assert.equal(partyCost(ids, reduction), 15);
  assert.equal(validateParty(ids, reduction), null);
  assert.equal(
    partyCost(["azena_inanna", "balthorr"], { azena_inanna: 99, balthorr: 99 }),
    3,
  );
});

test("expanded roster keeps 20 unique IDs and enforces six slots across new heroes", () => {
  assert.equal(HEROES.length, 20);
  assert.equal(new Set(HEROES.map((h) => h.id)).size, 20);
  assert.equal(validateParty(["echidna", "akkan", "kamen"]), null);
  assert.match(validateParty(["kadan", "valtan", "kamen", "brelshaza"])!, /15/);
  assert.match(validateParty(HEROES.slice(6, 13).map((h) => h.id))!, /6/);
});
