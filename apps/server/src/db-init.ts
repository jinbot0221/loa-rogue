import { openDatabase } from "./db.js";
const db = openDatabase(process.env.DATABASE_PATH ?? "./data/loa.sqlite");
console.log(
  "Migrations applied; integrity:",
  db.prepare("PRAGMA integrity_check").get(),
);
db.close();
