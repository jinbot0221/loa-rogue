import { test } from "node:test";
import assert from "node:assert/strict";
import { HEROES, partyCost, validateParty } from "./index.js";
test("six initial heroes have exact specification stats and costs", () => {
  assert.deepEqual(
    HEROES.map((h) => h.cost),
    [3, 4, 3, 4, 5, 2],
  );
  assert.equal(partyCost(HEROES.map((h) => h.id)), 21);
  assert.match(validateParty(HEROES.map((h) => h.id))!, /15/);
});
test("party boundaries, duplicates and permanent reductions", () => {
  assert.ok(validateParty([]));
  assert.ok(validateParty(["wei", "wei"]));
  assert.equal(
    validateParty(["wei", "nineveh", "thirain", "azena_inanna"]),
    null,
  );
  const ids = HEROES.map((h) => h.id);
  const reduction = Object.fromEntries(ids.map((id) => [id, 1]));
  assert.equal(partyCost(ids, reduction), 15);
  assert.equal(validateParty(ids, reduction), null);
  assert.equal(
    partyCost(["azena_inanna", "balthorr"], { azena_inanna: 99, balthorr: 99 }),
    3,
  );
});
