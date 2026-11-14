CREATE TABLE users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 nickname TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE sessions (
 id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, revoked_at INTEGER
) STRICT;
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE user_currencies (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, ark_crystals INTEGER NOT NULL DEFAULT 0 CHECK(ark_crystals>=0)) STRICT;
CREATE TABLE hero_upgrades (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, hero_id TEXT NOT NULL,
 hp_level INTEGER NOT NULL DEFAULT 0 CHECK(hp_level BETWEEN 0 AND 20),
 attack_level INTEGER NOT NULL DEFAULT 0 CHECK(attack_level BETWEEN 0 AND 20),
 defense_level INTEGER NOT NULL DEFAULT 0 CHECK(defense_level BETWEEN 0 AND 20),
 crit_level INTEGER NOT NULL DEFAULT 0 CHECK(crit_level BETWEEN 0 AND 10),
 speed_level INTEGER NOT NULL DEFAULT 0 CHECK(speed_level BETWEEN 0 AND 10),
 cost_reduction INTEGER NOT NULL DEFAULT 0 CHECK(cost_reduction BETWEEN 0 AND 3), PRIMARY KEY(user_id,hero_id)
) STRICT;
CREATE TABLE party_presets (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, hero_ids_json TEXT NOT NULL CHECK(json_valid(hero_ids_json))) STRICT;
CREATE TABLE processed_actions (scope TEXT NOT NULL, action_id TEXT NOT NULL, fingerprint TEXT NOT NULL, status_code INTEGER NOT NULL, response_json TEXT NOT NULL CHECK(json_valid(response_json)), created_at INTEGER NOT NULL, PRIMARY KEY(scope,action_id)) STRICT;
