import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const databasePath = process.env.DATABASE_PATH || "db/finance.db";
mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
try {
  database.pragma("foreign_keys = ON");
  const migration = fileURLToPath(new URL("../drizzle/0004_add_fin_photos.sql", import.meta.url));
  database.transaction(() => database.exec(readFileSync(migration, "utf8")))();
  mkdirSync(path.join(path.dirname(databasePath), "uploads/product-photos"), { recursive: true });
  console.log("Product photo storage is ready.");
} finally {
  database.close();
}
