import { backup } from "node:sqlite";
import { resolve } from "node:path";
import { openDatabase } from "./db.js";
const target = process.argv[2];
if (!target)
  throw new Error("Usage: npm run db:backup -- /absolute/path/backup.sqlite");
const source = process.env.DATABASE_PATH ?? "./data/loa.sqlite";
if (resolve(source) === resolve(target))
  throw new Error("Backup path must differ from database");
const db = openDatabase(source);
try {
  await backup(db, target);
  console.log("SQLite online backup complete");
} finally {
  db.close();
}
