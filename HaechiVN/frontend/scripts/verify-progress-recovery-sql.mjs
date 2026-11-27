import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";

const source = readFileSync(new URL("../functions/api/progress-recovery.ts", import.meta.url), "utf8");
const marker = "INSERT INTO card_states\n";
const start = source.lastIndexOf("`", source.indexOf(marker));
const end = source.indexOf("`", start + 1);
assert.ok(start >= 0 && end > start, "Recovery SQL exists");
const sql = source.slice(start + 1, end);

const SQL = await initSqlJs();
const db = new SQL.Database();
db.run(`CREATE TABLE card_states (
  id TEXT PRIMARY KEY,user_id TEXT,deck_id TEXT,card_id INTEGER,
  interval INTEGER,ease_factor REAL,due_date TEXT,due_at TEXT,
  reps INTEGER,lapses INTEGER,state TEXT,stability REAL,difficulty REAL,
  learning_steps INTEGER,last_review TEXT,updated_at TEXT,
  UNIQUE(user_id,deck_id,card_id)
)`);
const base = (id, time) => [
  `cs_u_deck_${id}`, "u", "deck", id, 3, 2.5, "2026-11-30", null,
  2, 0, "review", 3, 5, 0, "2026-11-25", time, time,
];
db.run(sql, base(1, "2026-11-26 00:00:00"));
db.run(sql, [...base(1, "2026-11-25 00:00:00").slice(0, 4), 99, ...base(1, "2026-11-25 00:00:00").slice(5)]);
assert.equal(db.exec("SELECT interval FROM card_states WHERE card_id=1")[0].values[0][0], 3, "Older copy cannot overwrite server");
db.run(sql, base(2, "2026-11-25 00:00:00"));
assert.equal(db.exec("SELECT COUNT(*) FROM card_states")[0].values[0][0], 2, "Missing card is restored");
db.run(sql, [...base(1, "2026-11-27 00:00:00").slice(0, 4), 7, ...base(1, "2026-11-27 00:00:00").slice(5)]);
assert.equal(db.exec("SELECT interval FROM card_states WHERE card_id=1")[0].values[0][0], 7, "Newer copy replaces server");
console.log("Recovery SQL preserves newer states and restores missing states.");
