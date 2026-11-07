import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";

test("product suggestions sort distinct names by recent use, respect the limit, and isolate users", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fin-autocomplete-"));
  process.env.DATABASE_PATH = join(directory, "finance.db");
  process.env.FINANCE_MCP_KEY = randomUUID();
  const fixture = new Database(process.env.DATABASE_PATH);
  fixture.exec(readFileSync("drizzle/0000_cloudy_vision.sql", "utf8"));
  fixture.exec("INSERT INTO users VALUES (1, 'autocomplete-test', 'test'), (2, 'other-user', 'test')");
  const record = fixture.prepare(`INSERT INTO fin (fin_id,user_id,date,type,original_currency,original_amount_cents,
    amount_cad_cents,amount_usd_cents,amount_cny_cents,amount_base_cad_cents) VALUES (?,?,?,'expense','CAD',1,1,1,1,1)`);
  const item = fixture.prepare("INSERT INTO fin_items(fin_id,name,original_amount_cents) VALUES (?,?,?)");
  function add(name: string, date: string, amount = 1, user = 1) {
    const id = randomUUID();
    record.run(id, user, date);
    item.run(id, name, amount);
  }
  let closeDatabase: (() => void) | undefined;
  try {
    for (let day = 1; day <= 12; day++) add(`Product ${String(day).padStart(2, "0")}`, `2026-01-${String(day).padStart(2, "0")}T12:00:00Z`);
    for (let i = 0; i < 20; i++) add("Product 01", "2026-01-01T12:00:00Z", 99999);
    add("Product private", "2026-01-14T12:00:00Z", 1, 2);
    add("Product future", "2099-01-01T12:00:00Z");
    add("Product 01", "2099-01-01T12:00:00Z");
    add("Clock earlier", "2026-02-01T00:30:00+01:00");
    add("Clock later", "2026-01-31 23:45:00");
    add("Tie first", "2026-03-01T12:00:00Z");
    add("Tie second", "2026-03-01T12:00:00Z");
    const { GET } = await import("../app/api/fin/items/autocomplete/route");
    const { sqlite } = await import("../app/lib/db/drizzle");
    closeDatabase = () => sqlite.close();
    async function suggestions(query = "") {
      const response = await GET(new NextRequest(`http://localhost/api/fin/items/autocomplete?q=${encodeURIComponent(query)}`, {
        headers: { "x-api-key": process.env.FINANCE_MCP_KEY! },
      }));
      assert.equal(response.status, 200);
      return (await response.json()).items as { name: string; count: number; lastPurchased: string }[];
    }
    const products = await suggestions("Product");
    assert.deepEqual(products.map((row) => row.name), Array.from({ length: 10 }, (_, index) => `Product ${String(12 - index).padStart(2, "0")}`));
    assert.ok(!products.some((row) => row.name === "Product private"));
    assert.deepEqual(await suggestions("Product future"), []);
    assert.equal((await suggestions("Product 01"))[0].count, 21);
    add("Product 01", "2026-01-13T12:00:00Z");
    const updated = await suggestions("Product");
    assert.equal(updated[0].name, "Product 01");
    assert.equal(updated[0].count, 22);
    assert.equal(updated[0].lastPurchased, "2026-01-13T12:00:00.000Z");
    assert.equal(updated.filter((row) => row.name === "Product 01").length, 1);
    assert.deepEqual((await suggestions("Clock")).map((row) => row.name), ["Clock later", "Clock earlier"]);
    assert.equal((await suggestions("Clock"))[0].lastPurchased, "2026-01-31T23:45:00.000Z");
    assert.deepEqual((await suggestions("Tie")).map((row) => row.name), ["Tie second", "Tie first"]);
    assert.equal((await suggestions()).length, 10);
    assert.deepEqual(await suggestions("Missing"), []);
  } finally {
    closeDatabase?.();
    fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
