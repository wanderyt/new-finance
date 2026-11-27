import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";

test("item category migration, mutation APIs, and category report", async (suite) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fin-item-categories-"));
  process.env.DATABASE_PATH = path.join(directory, "finance.db");
  process.env.FINANCE_MCP_KEY = randomUUID();
  const fixture = new Database(process.env.DATABASE_PATH);
  fixture.exec(readFileSync("drizzle/0000_cloudy_vision.sql", "utf8"));
  fixture.exec(readFileSync("drizzle/0003_add_brand_name_to_fin_items.sql", "utf8"));
  fixture.exec(`INSERT INTO users VALUES (1, 'category-test', 'test');
    INSERT INTO categories (user_id, category, subcategory) VALUES (1, '生活', '买菜原料'), (1, '生活', '衣服');
    INSERT INTO fin (fin_id,user_id,date,type,original_currency,original_amount_cents,amount_cad_cents,amount_usd_cents,
      amount_cny_cents,amount_base_cad_cents,category,subcategory)
      VALUES ('legacy',1,'2026-01-15T12:00:00.000Z','expense','CAD',1200,1200,1200,1200,1200,'生活','买菜原料');
    INSERT INTO fin_items (fin_id,line_no,name,original_amount_cents,category,subcategory,notes) VALUES
      ('legacy',1,'蔬菜',800,'生活','买菜原料',NULL),
      ('legacy',2,'衬衫',200,'生活','衣服',NULL),
      ('legacy',3,'理发',100,'生活','旧名称',NULL),
      ('legacy',4,'税',50,'生活','买菜原料','Tax (HST/GST/PST combined)'),
      ('legacy',5,'小费',50,'生活','买菜原料',NULL);`);
  const run = (script: string, ...args: string[]) =>
    execFileSync(process.execPath, [`scripts/${script}`, ...args], { env: process.env }).toString();
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ date: "2026-01-01", rates: { USD: 0.73, CNY: 5.2 } }));
  const request = (url: string, method = "GET", data?: object) => {
    const headers: Record<string, string> = { "x-api-key": process.env.FINANCE_MCP_KEY! };
    if (data) headers["Content-Type"] = "application/json";
    return new NextRequest(`http://localhost${url}`, { method, headers, body: data ? JSON.stringify(data) : undefined });
  };
  let closeDatabase: (() => void) | undefined;
  try {
    await suite.test("migration converts legacy rows once and constrains tax status", () => {
      run("migrate-fin-necessity.mjs");
      run("migrate-fin-photos.mjs");
      assert.deepEqual(JSON.parse(run("migrate-item-categories.mjs", "--dry-run")),
        { pendingColumns: 1, taxRows: 1, tipRows: 1, copiedCategoryRows: 3, staleCategoryRows: 1 });
      run("migrate-item-categories.mjs");
      const rows = fixture.prepare("SELECT name, category, subcategory, tax_status FROM fin_items ORDER BY line_no").all();
      assert.deepEqual(rows.map((row) => Object.values(row as object)), [
        ["蔬菜", null, null, "taxable"], ["衬衫", "生活", "衣服", "taxable"], ["理发", null, null, "taxable"],
        ["税", null, null, "tax"], ["小费", null, null, "exempt"],
      ]);
      fixture.exec("UPDATE fin_items SET category = '生活', subcategory = '买菜原料' WHERE name = '蔬菜'");
      run("migrate-item-categories.mjs");
      assert.equal((fixture.prepare("SELECT category FROM fin_items WHERE name = '蔬菜'").get() as { category: string }).category, "生活");
      assert.equal(JSON.parse(run("migrate-item-categories.mjs", "--dry-run")).pendingColumns, 0);
      assert.throws(() => fixture.exec("UPDATE fin_items SET tax_status = 'wrong'"));
    });

    const { POST: create } = await import("../app/api/fin/create/route");
    const { PATCH: update } = await import("../app/api/fin/update/route");
    const { GET: detail } = await import("../app/api/fin/[id]/route");
    const { GET: report } = await import("../app/api/fin/necessity/route");
    const { sqlite } = await import("../app/lib/db/drizzle");
    closeDatabase = () => sqlite.close();
    const base = { date: "2026-02-10T12:00:00.000Z", merchant: "Walmart", category: "生活", subcategory: "买菜原料",
      originalCurrency: "CAD", originalAmountCents: 15390 };

    await suite.test("create, update, and report item categories with a split tax line", async () => {
      const created = await create(request("/api/fin/create", "POST", { ...base, lineItems: [
        { name: "蔬菜", originalAmountCents: 12000, taxStatus: "exempt" },
        { name: "衬衫", originalAmountCents: 3000, category: "生活", subcategory: "衣服" },
        { name: "税", originalAmountCents: 390, taxStatus: "tax", category: "生活", subcategory: "衣服" },
      ] }));
      assert.equal(created.status, 201);
      const finId = (await created.json()).data.finId;
      const saved = (await (await detail(request(`/api/fin/${finId}`))).json()).data;
      assert.deepEqual(saved.items.map((item: { category: string | null; taxStatus: string }) => [item.category, item.taxStatus]),
        [[null, "exempt"], ["生活", "taxable"], ["生活", "tax"]]);

      const month = await (await report(request("/api/fin/necessity?period=month&value=2026-02"))).json();
      const total = (subcategory: string | null) => month.data.categories.find((row: { subcategory: string | null }) =>
        row.subcategory === subcategory);
      assert.equal(total("衣服").amountCadCents, 3390);
      assert.equal(total("买菜原料").amountCadCents, 12000);
      assert.equal(total(null).amountCadCents, 15390);
      assert.equal(total(null).recordCount, 1);

      const clothes = await (await report(request(
        `/api/fin/necessity?period=month&value=2026-02&category=${encodeURIComponent("生活")}&subcategory=${encodeURIComponent("衣服")}&details=1`))).json();
      assert.deepEqual(clothes.data.details[0].allocations.map((row: { name: string; amountCadCents: number }) =>
        [row.name, row.amountCadCents]), [["衬衫", 3000], ["税", 390]]);

      const changed = await update(request("/api/fin/update", "PATCH", { finId, category: "生活", subcategory: "衣服" }));
      assert.equal(changed.status, 200);
      const after = await (await report(request("/api/fin/necessity?period=month&value=2026-02"))).json();
      assert.equal(after.data.categories.find((row: { subcategory: string | null }) => row.subcategory === "衣服").amountCadCents, 15390);
    });

    await suite.test("invalid item classification is rejected", async () => {
      for (const item of [{ taxStatus: "wrong" }, { subcategory: "衣服" }, { category: 5 }]) {
        const response = await create(request("/api/fin/create", "POST", { ...base,
          lineItems: [{ name: "A", originalAmountCents: 100, ...item }] }));
        assert.equal(response.status, 400);
      }
    });
  } finally {
    global.fetch = originalFetch;
    closeDatabase?.();
    fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
