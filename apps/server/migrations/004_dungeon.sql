ALTER TABLE runs ADD COLUMN dungeon_json TEXT CHECK(dungeon_json IS NULL OR json_valid(dungeon_json));
CREATE TABLE run_events (
 run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE, floor INTEGER NOT NULL CHECK(floor BETWEEN 1 AND 100),
 candidates_json TEXT NOT NULL CHECK(json_valid(candidates_json)), selected_event TEXT,
 revealed_event_json TEXT CHECK(revealed_event_json IS NULL OR json_valid(revealed_event_json)), state_json TEXT NOT NULL CHECK(json_valid(state_json)),
 status TEXT NOT NULL CHECK(status IN ('offered','active','complete')), PRIMARY KEY(run_id,floor)
) STRICT;
CREATE TABLE run_equipment (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE, template_id TEXT NOT NULL,
 rarity INTEGER NOT NULL CHECK(rarity BETWEEN 0 AND 4), slot TEXT NOT NULL CHECK(slot IN ('weapon','armor','accessory','relic')),
 stats_json TEXT NOT NULL CHECK(json_valid(stats_json)), equipped_to TEXT, created_at INTEGER NOT NULL
) STRICT;
CREATE UNIQUE INDEX equipment_slot ON run_equipment(run_id,equipped_to,slot) WHERE equipped_to IS NOT NULL;
CREATE INDEX equipment_inventory ON run_equipment(run_id);
CREATE TABLE discovered_recipes (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, recipe_id TEXT NOT NULL, discovered_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,recipe_id)
) STRICT;
CREATE INDEX records_user ON records(user_id,created_at);
