CREATE TABLE runs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('active','defeated','abandoned','cleared')),
 floor INTEGER NOT NULL CHECK(floor BETWEEN 1 AND 100), completed_floor INTEGER NOT NULL DEFAULT 0 CHECK(completed_floor BETWEEN 0 AND 100),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), stage TEXT NOT NULL CHECK(stage IN ('battle','reward','finished')),
 seed INTEGER NOT NULL, battle_json TEXT NOT NULL CHECK(json_valid(battle_json)), party_cost INTEGER NOT NULL CHECK(party_cost BETWEEN 1 AND 15),
 gold INTEGER NOT NULL DEFAULT 0 CHECK(gold>=0), crystals_awarded INTEGER NOT NULL DEFAULT 0 CHECK(crystals_awarded>=0),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, finished_at INTEGER
) STRICT;
CREATE UNIQUE INDEX one_active_run_per_user ON runs(user_id) WHERE status='active';
CREATE TABLE records (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 run_id TEXT NOT NULL UNIQUE REFERENCES runs(id), highest_floor INTEGER NOT NULL CHECK(highest_floor BETWEEN 1 AND 100),
 outcome TEXT NOT NULL CHECK(outcome IN ('defeated','abandoned','cleared')), crystals_awarded INTEGER NOT NULL CHECK(crystals_awarded>=0),
 first_clear_bonus INTEGER NOT NULL DEFAULT 0 CHECK(first_clear_bonus IN (0,1000)), created_at INTEGER NOT NULL
) STRICT;
