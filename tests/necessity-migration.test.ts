import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { expandNecessityConstraints } from "../scripts/necessity-constraints.mjs";

function fixture() {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  for (const file of ["0000_cloudy_vision.sql", "0003_add_brand_name_to_fin_items.sql", "0004_add_fin_photos.sql", "0005_add_fin_necessity.sql"]) {
    database.exec(readFileSync(`drizzle/${file}`, "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  database.exec(`INSERT INTO users VALUES (1, 'migration-test', 'test');
    INSERT INTO fin(fin_id,user_id,date,type,original_currency,original_amount_cents,amount_cad_cents,amount_usd_cents,amount_cny_cents,amount_base_cad_cents,necessity_level)
      VALUES ('record',1,'2026-01-01T00:00:00Z','expense','CAD',100,100,73,520,100,'personal_priority');
    INSERT INTO fin_items(item_id,fin_id,name,original_amount_cents,necessity_level,necessity_reason)
      VALUES (12,'record','Repair',100,'flexible','Saved reason');
    INSERT INTO fin_photos VALUES (7,'record','saved-photo','photo.png','image/png',10,1,'2026-01-01');
    INSERT INTO receipts VALUES (3,1,'record','saved-receipt','image/png','hash','2026-01-01');
    INSERT INTO tags VALUES (4,1,'saved-tag');
    INSERT INTO fin_tags VALUES ('record',4);
    CREATE VIEW saved_fin_view AS SELECT fin_id, necessity_level FROM fin;
    CREATE TABLE audit(event TEXT);
    CREATE TRIGGER saved_audit AFTER UPDATE ON fin BEGIN INSERT INTO audit VALUES ('updated'); END;`);
  return database;
}

test("expanding priority constraints preserves records, references, indexes, triggers, and views", () => {
  const database = fixture();
  try {
    const tables = ["fin", "fin_items", "fin_photos", "receipts", "tags", "fin_tags"];
    const before = tables.map((table) => database.prepare(`SELECT * FROM ${table}`).all());
    const indexes = database.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('fin','fin_items') ORDER BY name").all();
    assert.equal(expandNecessityConstraints(database, true), 2);
    assert.throws(() => database.exec("UPDATE fin SET necessity_level='unexpected'"));
    assert.equal(expandNecessityConstraints(database), 2);
    assert.deepEqual(tables.map((table) => database.prepare(`SELECT * FROM ${table}`).all()), before);
    assert.deepEqual(database.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('fin','fin_items') ORDER BY name").all(), indexes);
    assert.equal(database.pragma("foreign_keys", { simple: true }), 1);
    assert.deepEqual(database.pragma("foreign_key_check"), []);
    database.exec("UPDATE fin SET necessity_level='unexpected'; UPDATE fin_items SET necessity_level='unexpected'");
    assert.equal((database.prepare("SELECT necessity_level FROM saved_fin_view").get() as { necessity_level: string }).necessity_level, "unexpected");
    assert.equal((database.prepare("SELECT count(*) AS count FROM audit").get() as { count: number }).count, 1);
    assert.throws(() => database.exec("UPDATE fin SET necessity_level='invalid'"));
    assert.throws(() => database.exec("UPDATE fin_items SET necessity_level='invalid'"));
    assert.equal(expandNecessityConstraints(database), 0);
    assert.equal((database.prepare("SELECT necessity_level FROM fin_items").get() as { necessity_level: string }).necessity_level, "unexpected");
  } finally { database.close(); }
});

test("constraint upgrades roll back both tables when the second replacement fails", () => {
  const database = fixture();
  try {
    database.exec("CREATE TABLE __necessity_fin_items (saved TEXT)");
    const before = database.prepare("SELECT name,sql FROM sqlite_master WHERE name IN ('fin','fin_items') ORDER BY name").all();
    assert.throws(() => expandNecessityConstraints(database), /already exists/);
    assert.deepEqual(database.prepare("SELECT name,sql FROM sqlite_master WHERE name IN ('fin','fin_items') ORDER BY name").all(), before);
    assert.equal(database.pragma("foreign_keys", { simple: true }), 1);
    assert.deepEqual(database.pragma("foreign_key_check"), []);
  } finally { database.close(); }
});

test("standalone SQL adds all four levels and remains compatible with Docker startup", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fin-manual-priority-"));
  const databasePath = path.join(directory, "finance.db");
  const database = new Database(databasePath);
  try {
    for (const file of ["0000_cloudy_vision.sql", "0003_add_brand_name_to_fin_items.sql", "0004_add_fin_photos.sql"]) {
      database.exec(readFileSync(`drizzle/${file}`, "utf8"));
    }
    database.exec(`INSERT INTO users VALUES (1,'manual-test','test');
      INSERT INTO fin(fin_id,user_id,date,type,original_currency,original_amount_cents,amount_cad_cents,amount_usd_cents,amount_cny_cents,amount_base_cad_cents)
        VALUES ('manual',1,'2026-01-01T00:00:00Z','expense','CAD',200,200,146,1040,200);
      INSERT INTO fin_items(item_id,fin_id,name,original_amount_cents,notes)
        VALUES (1,'manual','税',100,'Tax (HST/GST/PST combined)'),(2,'manual','Repair',100,NULL);
      INSERT INTO fin_photos VALUES (1,'manual','saved-photo','photo.png','image/png',10,1,'2026-01-01');`);
    database.exec(readFileSync("drizzle/manual-add-fin-necessity.sql", "utf8"));
    assert.equal((database.prepare("SELECT necessity_level FROM fin").get() as { necessity_level: string }).necessity_level, "essential");
    const items = database.prepare("SELECT necessity_level,necessity_reason FROM fin_items ORDER BY item_id").all();
    assert.deepEqual(items, [{ necessity_level: "essential", necessity_reason: null }, { necessity_level: null, necessity_reason: null }]);
    database.exec("UPDATE fin SET necessity_level='unexpected'; UPDATE fin_items SET necessity_level='unexpected' WHERE item_id=2");
    assert.throws(() => database.exec("UPDATE fin SET necessity_level='invalid'"));
    assert.throws(() => database.exec("UPDATE fin_items SET necessity_level='invalid'"));
    assert.deepEqual(database.pragma("foreign_key_check"), []);
    assert.equal((database.prepare("SELECT count(*) AS count FROM fin_photos").get() as { count: number }).count, 1);
    execFileSync(process.execPath, ["scripts/migrate-fin-necessity.mjs"], { env: { ...process.env, DATABASE_PATH: databasePath } });
    assert.equal((database.prepare("SELECT necessity_level FROM fin").get() as { necessity_level: string }).necessity_level, "unexpected");
    assert.equal(expandNecessityConstraints(database, true), 0);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("sqlite3 -bail rolls back standalone SQL after an existing-column error", {
  skip: spawnSync("sqlite3", ["--version"]).status !== 0,
}, () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fin-manual-rollback-"));
  const databasePath = path.join(directory, "finance.db");
  const database = new Database(databasePath);
  try {
    database.exec(readFileSync("drizzle/0000_cloudy_vision.sql", "utf8"));
    database.exec("ALTER TABLE fin_items ADD COLUMN necessity_level TEXT");
    const result = spawnSync("sqlite3", ["-bail", databasePath], {
      input: readFileSync("drizzle/manual-add-fin-necessity.sql", "utf8"), encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate column name/);
    assert.ok(!(database.pragma("table_info(fin)") as { name: string }[]).some((column) => column.name === "necessity_level"));
    assert.ok(!(database.pragma("table_info(fin_items)") as { name: string }[]).some((column) => column.name === "necessity_reason"));
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
