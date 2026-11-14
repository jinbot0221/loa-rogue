import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export function openDatabase(path: string) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY) STRICT;",
  );
  // Run commands from the repository root; migrations are retained as SQL files.
  for (const name of readdirSync(resolve("apps/server/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    transaction(db, () => {
      if (
        db.prepare("SELECT name FROM schema_migrations WHERE name=?").get(name)
      )
        return;
      db.exec(readFileSync(resolve("apps/server/migrations", name), "utf8"));
      db.prepare("INSERT INTO schema_migrations VALUES (?)").run(name);
    });
  }
  return db;
}
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
