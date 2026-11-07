import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";

test("priority migration, mutation APIs, schedules, and complete reports", async (suite) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fin-necessity-"));
  process.env.DATABASE_PATH = path.join(directory, "finance.db");
  process.env.FINANCE_MCP_KEY = randomUUID();
  const fixture = new Database(process.env.DATABASE_PATH);
  fixture.exec(readFileSync("drizzle/0000_cloudy_vision.sql", "utf8"));
  fixture.exec(readFileSync("drizzle/0003_add_brand_name_to_fin_items.sql", "utf8"));
  fixture.exec("INSERT INTO users VALUES (1, 'priority-test', 'test'), (2, 'other-user', 'test')");
  const insertRecord = fixture.prepare(`INSERT INTO fin (fin_id,user_id,date,type,original_currency,original_amount_cents,
    amount_cad_cents,amount_usd_cents,amount_cny_cents,amount_base_cad_cents) VALUES (?,?,?,'expense','CAD',?,?,?, ?,?)`);
  const addRecord = (id: string, cents: number, user = 1, date = "2026-01-15T12:00:00.000Z") =>
    insertRecord.run(id, user, date, cents, cents, cents, cents, cents);
  addRecord("legacy", 100);
  fixture.exec("INSERT INTO fin_items(fin_id,name,original_amount_cents,notes) VALUES ('legacy','税',100,'Tax (HST/GST/PST combined)')");
  const migrate = (...args: string[]) => execFileSync(process.execPath, ["scripts/migrate-fin-necessity.mjs", ...args], { env: process.env }).toString();
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ date: "2026-01-01", rates: { USD: 0.73, CNY: 5.2 } }));
  const request = (url: string, method = "GET", data?: object, multipart = false) => {
    const headers: Record<string, string> = { "x-api-key": process.env.FINANCE_MCP_KEY! };
    let body: string | FormData | undefined;
    if (data && multipart) { const form = new FormData(); form.set("data", JSON.stringify(data)); body = form; }
    else if (data) { headers["Content-Type"] = "application/json"; body = JSON.stringify(data); }
    return new NextRequest(`http://localhost${url}`, { method, headers, body });
  };
  let closeDatabase: (() => void) | undefined;
  try {
    await suite.test("migration preview, constraints, and repeat execution", () => {
      assert.equal(JSON.parse(migrate("--dry-run")).pendingColumns, 3);
      migrate();
      assert.equal(JSON.parse(migrate("--dry-run")).pendingColumns, 0);
      assert.equal((fixture.prepare("SELECT necessity_level FROM fin WHERE fin_id='legacy'").get() as { necessity_level: string }).necessity_level, "essential");
      assert.equal((fixture.prepare("SELECT necessity_level FROM fin_items WHERE fin_id='legacy'").get() as { necessity_level: string }).necessity_level, "essential");
      fixture.exec("UPDATE fin_items SET necessity_level='flexible' WHERE fin_id='legacy'");
      migrate();
      assert.equal((fixture.prepare("SELECT necessity_level FROM fin_items WHERE fin_id='legacy'").get() as { necessity_level: string }).necessity_level, "flexible");
      assert.throws(() => fixture.exec("UPDATE fin SET necessity_level='wrong'"));
      assert.throws(() => fixture.exec("UPDATE fin_items SET necessity_level='wrong'"));
      assert.equal((fixture.pragma("foreign_key_check") as unknown[]).length, 0);
    });
    execFileSync(process.execPath, ["scripts/migrate-fin-photos.mjs"], { env: process.env });
    const { POST: create } = await import("../app/api/fin/create/route");
    const { PATCH: update } = await import("../app/api/fin/update/route");
    const { GET: detail } = await import("../app/api/fin/[id]/route");
    const { GET: report } = await import("../app/api/fin/necessity/route");
    const { sqlite } = await import("../app/lib/db/drizzle");
    closeDatabase = () => sqlite.close();
    const base = { date: "2026-02-15T12:00:00.000Z", merchant: "Pharmacy", category: "生活", subcategory: "健康",
      originalCurrency: "CAD", originalAmountCents: 1000 };
    let finId: string;
    await suite.test("create and edit explicit overrides, inherited reasons, and empty item arrays", async () => {
      const response = await create(request("/api/fin/create", "POST", { ...base, lineItems: [
        { name: "Medicine", originalAmountCents: 600, necessityLevel: null, necessityReason: "Basic care" },
        { name: "Skincare", originalAmountCents: 300, necessityLevel: "personal_priority", necessityReason: "My priority" },
        { name: "Tax", originalAmountCents: 100, necessityLevel: "essential" },
      ] }, true));
      assert.equal(response.status, 201);
      finId = (await response.json()).data.finId;
      const changed = await update(request("/api/fin/update", "PATCH", { finId, necessityLevel: "flexible" }));
      assert.equal(changed.status, 200);
      const saved = (await (await detail(request(`/api/fin/${finId}`))).json()).data;
      assert.equal(saved.necessityLevel, "flexible");
      assert.equal(saved.items.length, 3);
      assert.equal(saved.items[0].necessityReason, null);
      assert.equal(saved.items[1].necessityReason, "My priority");
      assert.equal(saved.items[2].necessityLevel, "essential");
      const edited = await update(request("/api/fin/update", "PATCH", { finId, lineItems: saved.items.map((item: { name: string }) =>
        ({ ...item, necessityReason: item.name === "Skincare" ? "  Updated reason  " : null })) }, true));
      assert.equal(edited.status, 200);
      const loaded = (await (await detail(request(`/api/fin/${finId}`))).json()).data;
      assert.equal(loaded.items[1].necessityReason, "Updated reason");
      const bad = await update(request("/api/fin/update", "PATCH", { finId, lineItems: [{ name: "Too much", originalAmountCents: 1001 }] }));
      assert.equal(bad.status, 400);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId, necessityLevel: "invalid" }))).status, 400);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId, lineItems: [] }))).status, 200);
      assert.equal((await (await detail(request(`/api/fin/${finId}`))).json()).data.items.length, 0);
    });
    await suite.test("scheduled default-only updates preserve each occurrence's overrides", async () => {
      const response = await create(request("/api/fin/create", "POST", { ...base, isScheduled: true, frequency: "annually",
        lineItems: [{ name: "Inherited", originalAmountCents: 500, necessityReason: "Old reason" },
          { name: "Explicit", originalAmountCents: 500, necessityLevel: "personal_priority", necessityReason: "Keep this" }] }));
      assert.equal(response.status, 201);
      const record = (await response.json()).data;
      const occurrences = fixture.prepare("SELECT fin_id FROM fin WHERE schedule_rule_id=? ORDER BY scheduled_on").all(record.scheduleRuleId) as { fin_id: string }[];
      fixture.prepare("UPDATE fin_items SET necessity_level='flexible' WHERE fin_id=? AND name='Explicit'").run(occurrences[2].fin_id);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: occurrences[1].fin_id, scope: "all", necessityLevel: "flexible" }))).status, 200);
      const priorities = fixture.prepare("SELECT necessity_level FROM fin WHERE schedule_rule_id=? ORDER BY scheduled_on").all(record.scheduleRuleId) as { necessity_level: string }[];
      assert.deepEqual(priorities.map((row) => row.necessity_level), ["essential", "flexible", "flexible", "flexible"]);
      const later = fixture.prepare("SELECT necessity_level,necessity_reason FROM fin_items WHERE fin_id=? ORDER BY line_no").all(occurrences[2].fin_id) as { necessity_level: string | null; necessity_reason: string | null }[];
      assert.equal(later[0].necessity_reason, null);
      assert.equal(later[1].necessity_level, "flexible");
      assert.equal(later[1].necessity_reason, "Keep this");
    });
    await suite.test("reports include every batch, scope users, exclude income and future records, and paginate details", async () => {
      const insertItem = fixture.prepare("INSERT INTO fin_items(fin_id,line_no,name,original_amount_cents,necessity_level) VALUES (?,?,?,?,?)");
      fixture.transaction(() => {
        for (let i = 0; i < 205; i++) {
          const id = `batch-${String(i).padStart(4, "0")}`;
          addRecord(id, 600, 1, "2026-03-15T12:00:00.000Z");
          for (let j = 0; j < 6; j++) insertItem.run(id, j + 1, `Item ${j}`, 100, j < 3 ? "essential" : "flexible");
        }
        addRecord("before-boundary", 100, 1, "2026-03-01T00:30:00+01:00");
        addRecord("space-first-day", 100, 1, "2026-03-01 00:00:00");
        addRecord("next-period", 100, 1, "2026-04-01T00:00:00.000Z");
        addRecord("other-user", 999999, 2, "2026-03-15T12:00:00.000Z");
        addRecord("income", 999999, 1, "2026-03-15T12:00:00.000Z");
        fixture.exec("UPDATE fin SET type='income' WHERE fin_id='income'");
        addRecord("future", 999999, 1, "2099-03-15T12:00:00.000Z");
      })();
      const data = (await (await report(request("/api/fin/necessity?period=month&value=2026-03&details=1&level=flexible&offset=200"))).json()).data;
      assert.equal(data.totalCadCents, 205 * 600 + 100);
      assert.equal(data.totals.essential, 205 * 300 + 100);
      assert.equal(data.totals.flexible, 205 * 300);
      assert.equal(data.pagination.total, 205);
      assert.equal(data.details.length, 5);
      assert.equal(data.details[0].matchedCadCents, 300);
      assert.equal(data.details[0].record.amountCadCents, 600);
      assert.equal((await report(request("/api/fin/necessity?period=month&value=2099-03"))).status, 400);
      assert.equal((await report(request("/api/fin/necessity?period=month&value=2026-13"))).status, 400);
      const yearly = (await (await report(request("/api/fin/necessity?period=year&value=2026"))).json()).data;
      assert.equal(yearly.totalCadCents, 100 + 1000 + 1000 + 205 * 600 + 300);
      assert.equal(Object.values(yearly.totals).reduce((sum: number, amount) => sum + Number(amount), 0), yearly.totalCadCents);
    });
    await suite.test("unexpected priorities persist and appear in report drill-downs", async () => {
      const response = await create(request("/api/fin/create", "POST", { ...base, date: "2026-05-15T12:00:00.000Z",
        necessityLevel: "unexpected", lineItems: [
          { name: "Broken heater repair", originalAmountCents: 800, necessityLevel: "unexpected", necessityReason: "Unexpected breakdown" },
          { name: "Tax", originalAmountCents: 100, necessityLevel: "essential" },
          { name: "Tip", originalAmountCents: 100, necessityLevel: "flexible" },
        ] }));
      assert.equal(response.status, 201);
      const record = (await response.json()).data;
      assert.equal(record.necessityLevel, "unexpected");
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: record.finId, necessityLevel: "essential" }))).status, 200);
      const loaded = (await (await detail(request(`/api/fin/${record.finId}`))).json()).data;
      assert.equal(loaded.items[0].necessityLevel, "unexpected");
      assert.equal(loaded.items[0].necessityReason, "Unexpected breakdown");
      const data = (await (await report(request("/api/fin/necessity?period=month&value=2026-05&details=1&level=unexpected"))).json()).data;
      assert.equal(data.totalCadCents, 1000);
      assert.deepEqual(data.totals, { essential: 100, personal_priority: 0, flexible: 100, unexpected: 800 });
      assert.equal(data.pagination.total, 1);
      assert.equal(data.details[0].matchedCadCents, 800);
    });
  } finally {
    global.fetch = originalFetch;
    closeDatabase?.();
    fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
