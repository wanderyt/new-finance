import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Adds fin_items.tax_status and, on the first run only, converts legacy data:
// 1. Importer tax rows become 'tax', so reports split them across taxable items.
// 2. Tip rows become 'exempt', so they do not receive a tax share.
// 3. Item category pairs that equal their record pair, or no longer exist in the
//    user's category list, become NULL, so they follow the record.
const databasePath = process.env.DATABASE_PATH || "db/finance.db";
const dryRun = process.argv.includes("--dry-run");
if (!dryRun) mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath, { readonly: dryRun, fileMustExist: dryRun });
try {
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 10000");
  const columns = database.pragma("table_info(fin_items)").map((column) => column.name);
  if (!columns.length) throw new Error("Initialize the finance database before applying the item category migration.");
  const pending = !columns.includes("tax_status");
  const legacyTax = "name = '税' AND (notes IS NULL OR notes = 'Tax (HST/GST/PST combined)')";
  const tip = "lower(trim(name)) IN ('tip', 'tips', 'gratuity', '小费')";
  const copiedCategory = `category IS NOT NULL AND EXISTS (SELECT 1 FROM fin WHERE fin.fin_id = fin_items.fin_id
    AND fin.category IS fin_items.category AND fin.subcategory IS fin_items.subcategory)`;
  const staleCategory = `category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM fin JOIN categories c ON c.user_id = fin.user_id
    WHERE fin.fin_id = fin_items.fin_id AND c.category = fin_items.category AND c.subcategory IS fin_items.subcategory)`;
  if (dryRun) {
    const count = (where) => database.prepare(`SELECT count(*) AS count FROM fin_items WHERE ${where}`).get().count;
    console.log(JSON.stringify(pending ? { pendingColumns: 1, taxRows: count(legacyTax), tipRows: count(tip),
      copiedCategoryRows: count(copiedCategory), staleCategoryRows: count(`${staleCategory} AND NOT (${copiedCategory})`) }
      : { pendingColumns: 0 }));
  } else if (pending) {
    const statement = readFileSync(fileURLToPath(new URL("../drizzle/0006_add_item_tax_status.sql", import.meta.url)), "utf8");
    const update = (assignment, where) => database.prepare(`UPDATE fin_items SET ${assignment} WHERE ${where}`).run().changes;
    const summary = database.transaction(() => {
      database.exec(statement);
      return { taxRows: update("tax_status = 'tax'", legacyTax), tipRows: update("tax_status = 'exempt'", tip),
        inheritedCategoryRows: update("category = NULL, subcategory = NULL", `(${copiedCategory}) OR (${staleCategory})`) };
    }).immediate();
    console.log(`Item category storage is ready. ${JSON.stringify(summary)}`);
  } else {
    console.log("Item category storage is already up to date.");
  }
} finally {
  database.close();
}
