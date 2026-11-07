import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expandNecessityConstraints } from "./necessity-constraints.mjs";

const databasePath = process.env.DATABASE_PATH || "db/finance.db";
const dryRun = process.argv.includes("--dry-run");
if (!dryRun) mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath, { readonly: dryRun, fileMustExist: dryRun });
try {
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 10000");
  const columns = (table) => database.pragma(`table_info(${table})`).map((column) => column.name);
  if (!columns("fin").length || !columns("fin_items").length) {
    throw new Error("Initialize the finance database before applying the spending priority migration.");
  }
  const statements = readFileSync(fileURLToPath(new URL("../drizzle/0005_add_fin_necessity.sql", import.meta.url)), "utf8")
    .split("--> statement-breakpoint").map((statement) => statement.trim());
  const changes = statements.filter((statement) => {
    const [, table, column] = statement.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
    return !columns(table).includes(column);
  });
  const legacyTax = "name = '税' AND notes = 'Tax (HST/GST/PST combined)'";
  const candidates = database.prepare("SELECT count(*) AS count FROM fin_items WHERE lower(trim(name)) IN ('tip', 'tips', 'gratuity', '小费')").get();
  if (dryRun) {
    console.log(JSON.stringify({ pendingColumns: changes.length,
      pendingConstraintUpdates: expandNecessityConstraints(database, true) + changes.filter((statement) => /ADD COLUMN necessity_level\b/.test(statement)).length,
      legacyTaxRows: database.prepare(`SELECT count(*) AS count FROM fin_items WHERE ${legacyTax}`).get().count, tipCandidatesForReview: candidates.count }));
  } else {
    database.transaction(() => {
      const backfill = !columns("fin_items").includes("necessity_level");
      for (const statement of statements) {
        const [, table, column] = statement.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
        if (!columns(table).includes(column)) database.exec(statement);
      }
      if (backfill) database.prepare(`UPDATE fin_items SET necessity_level = 'essential' WHERE ${legacyTax} AND necessity_level IS NULL`).run();
    }).immediate();
    expandNecessityConstraints(database);
    console.log(`Spending priority storage is ready. Legacy tip candidates for review: ${candidates.count}.`);
  }
} finally {
  database.close();
}
