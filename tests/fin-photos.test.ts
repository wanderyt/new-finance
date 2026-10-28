import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync, utimesSync, renameSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";

test("product photo API and storage", async (suite) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fin-photos-test-"));
  const databasePath = path.join(directory, "finance.db");
  process.env.DATABASE_PATH = databasePath;
  process.env.FINANCE_MCP_KEY = randomUUID();
  const fixture = new Database(databasePath);
  fixture.exec(readFileSync("drizzle/0000_cloudy_vision.sql", "utf8"));
  fixture.exec(readFileSync("drizzle/0003_add_brand_name_to_fin_items.sql", "utf8"));
  fixture.exec("INSERT INTO users VALUES (1, 'photo-test', 'photo-test'), (2, 'other-user', 'other-user')");
  fixture.exec("INSERT INTO fx_snapshots VALUES (1, '2026-10-24T12:00:00Z', 'Test', 'CAD', 0.73, 5.2)");
  const migrate = () => execFileSync(process.execPath, ["scripts/migrate-fin-photos.mjs"], { env: process.env });
  migrate();
  const { POST: create } = await import("../app/api/fin/create/route");
  const { PATCH: update } = await import("../app/api/fin/update/route");
  const { GET: detail, DELETE: remove } = await import("../app/api/fin/[id]/route");
  const { GET: image } = await import("../app/api/fin-photos/[id]/route");
  const { cleanupOrphanProductPhotos, getProductPhotoPath } = await import("../app/lib/utils/fin-photo-storage");
  const { buildTransactionFileBase } = await import("../app/lib/utils/transaction-file-name");
  const { buildReceiptFileName } = await import("../app/lib/utils/receipt-storage");
  const { sqlite } = await import("../app/lib/db/drizzle");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=", "base64");
  const photo = (name = "shoes.png") => new File([png], name, { type: "image/png" });
  const base = { date: "2026-10-24T12:00:00Z", merchant: "Shoe shop", city: "Waterloo", originalCurrency: "CAD", originalAmountCents: 10000 };
  const headers = () => ({ "x-api-key": process.env.FINANCE_MCP_KEY! });
  const request = (url: string, method = "GET", data?: object, photos?: File[]) => {
    if (photos) {
      const form = new FormData();
      form.set("data", JSON.stringify(data));
      photos.forEach((file) => form.append("photos", file));
      return new NextRequest(`http://localhost${url}`, { method, headers: headers(), body: form });
    }
    return new NextRequest(`http://localhost${url}`, { method,
      headers: { ...headers(), "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : undefined });
  };
  const keys = () => readdirSync(path.join(directory, "uploads/product-photos")).sort();
  const count = (table: string) => (fixture.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number }).count;
  let finId: string;
  let photoId: number;

  try {
    await suite.test("creates multiple photos and returns private metadata", async () => {
      const response = await create(request("/api/fin/create", "POST", base, [photo(), photo("box.png")]));
      assert.equal(response.status, 201);
      const { data } = await response.json();
      finId = data.finId;
      photoId = data.photos[0].photoId;
      assert.equal(data.photos.length, 2);
      assert.equal(data.photos[0].storageKey, undefined);
      assert.equal(data.photos[0].originalName, "shoes.png");
      assert.equal(keys().length, 2);
      assert.ok(keys().every((key) => /^20261024_shoe_shop_100\.00_[0-9a-f-]{36}\.png$/.test(key)));
      const loaded = await (await detail(request(`/api/fin/${finId}`))).json();
      assert.deepEqual(loaded.data.photos, data.photos);
      migrate();
      assert.equal(count("fin_photos"), 2);
    });

    await suite.test("shares receipt filename formatting and rejects unsafe storage keys", async () => {
      const metadata = { merchant: "T&T / Market", date: "2026-10-27T23:30:00-04:00", amountCents: 12999 };
      assert.equal(buildTransactionFileBase(metadata), "20261028_t_t_market_129.99");
      assert.equal(await buildReceiptFileName(metadata, "hash", "png", path.join(directory, "receipt-name-tests")), "20261028_t_t_market_129.99.png");
      assert.equal(buildTransactionFileBase({ ...metadata, merchant: "食品" }), "20261028_unknown_129.99");
      assert.equal(buildTransactionFileBase({ ...metadata, merchant: "a".repeat(40) }), `20261028_${"a".repeat(30)}_129.99`);
      assert.equal(buildTransactionFileBase({ ...metadata, date: "invalid" }), null);
      assert.equal(await buildReceiptFileName(undefined, "hash", "png", directory), "hash.png");
      assert.throws(() => getProductPhotoPath("../photo.png"));
      assert.throws(() => getProductPhotoPath(`20261028_../../escape_129.99_${randomUUID()}.png`));
    });

    await suite.test("names new photos from existing or updated record fields without renaming saved photos", async () => {
      const response = await create(request("/api/fin/create", "POST", {
        ...base, merchant: "T&T / Market", date: "2026-10-27T23:30:00-04:00", originalAmountCents: 12999,
      }));
      assert.equal(response.status, 201);
      const record = (await response.json()).data;
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: record.finId }, [photo()]))).status, 200);
      const original = fixture.prepare("SELECT storage_key FROM fin_photos WHERE fin_id = ?").get(record.finId) as { storage_key: string };
      assert.match(original.storage_key, /^20261028_t_t_market_129\.99_[0-9a-f-]{36}\.png$/);
      const changed = await update(request("/api/fin/update", "PATCH", {
        finId: record.finId, merchant: "New Store", date: "2026-10-29T12:00:00Z", originalAmountCents: 5000,
      }, [photo()]));
      assert.equal(changed.status, 200);
      const rows = fixture.prepare("SELECT storage_key FROM fin_photos WHERE fin_id = ? ORDER BY sort_order").all(record.finId) as Array<{ storage_key: string }>;
      assert.equal(rows[0].storage_key, original.storage_key);
      assert.match(rows[1].storage_key, /^20261029_new_store_50\.00_[0-9a-f-]{36}\.png$/);
      assert.ok(existsSync(getProductPhotoPath(original.storage_key)));
      assert.equal((await remove(request(`/api/fin/${record.finId}`, "DELETE"))).status, 200);
      assert.equal(keys().length, 2);
    });

    await suite.test("serves and deletes older UUID-only photo filenames", async () => {
      const response = await create(request("/api/fin/create", "POST", base, [photo()]));
      assert.equal(response.status, 201);
      const record = (await response.json()).data;
      const row = fixture.prepare("SELECT photo_id, storage_key FROM fin_photos WHERE fin_id = ?").get(record.finId) as { photo_id: number; storage_key: string };
      const legacyKey = `${randomUUID()}.png`;
      renameSync(getProductPhotoPath(row.storage_key), getProductPhotoPath(legacyKey));
      fixture.prepare("UPDATE fin_photos SET storage_key = ? WHERE photo_id = ?").run(legacyKey, row.photo_id);
      assert.equal((await image(request(`/api/fin-photos/${row.photo_id}`))).status, 200);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: record.finId, removedPhotoIds: [row.photo_id] }))).status, 200);
      assert.equal(existsSync(getProductPhotoPath(legacyKey)), false);
      await remove(request(`/api/fin/${record.finId}`, "DELETE"));
      assert.equal(keys().length, 2);
    });

    await suite.test("serves image bytes only to the record owner", async () => {
      const response = await image(request(`/api/fin-photos/${photoId}`));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
      fixture.prepare("UPDATE fin SET user_id = 2 WHERE fin_id = ?").run(finId);
      assert.equal((await image(request(`/api/fin-photos/${photoId}`))).status, 404);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId }, [photo()]))).status, 404);
      fixture.prepare("UPDATE fin SET user_id = 1 WHERE fin_id = ?").run(finId);
      assert.equal((await image(new NextRequest(`http://localhost/api/fin-photos/${photoId}`))).status, 401);
    });

    await suite.test("preserves JSON creation and combined receipt uploads", async () => {
      const jsonResponse = await create(request("/api/fin/create", "POST", base));
      assert.equal(jsonResponse.status, 201);
      const jsonRecord = (await jsonResponse.json()).data;
      assert.deepEqual(jsonRecord.photos, []);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: jsonRecord.finId, merchant: "Updated without photos" }))).status, 200);
      const form = new FormData();
      form.append("data", JSON.stringify(base));
      form.append("receipt", photo("receipt.png"));
      form.append("photos", photo("product.png"));
      const response = await create(new NextRequest("http://localhost/api/fin/create", { method: "POST", headers: headers(), body: form }));
      assert.equal(response.status, 201);
      const record = (await response.json()).data;
      const loaded = (await (await detail(request(`/api/fin/${record.finId}`))).json()).data;
      assert.equal(loaded.photos.length, 1);
      assert.equal(loaded.receipts.length, 1);
      assert.equal(path.basename(loaded.receipts[0].filePath), "20261024_shoe_shop_100.00.png");
      await remove(request(`/api/fin/${record.finId}`, "DELETE"));
      await remove(request(`/api/fin/${jsonRecord.finId}`, "DELETE"));
      assert.equal(keys().length, 2);
    });

    await suite.test("bounds request bodies and rejects malformed multipart data", async () => {
      const before = count("fin");
      const response = await create(new NextRequest("http://localhost/api/fin/create", {
        method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: "x".repeat(40 * 1024 * 1024 + 1),
      }));
      assert.equal(response.status, 413);
      const malformed = await create(new NextRequest("http://localhost/api/fin/create", {
        method: "POST", headers: { ...headers(), "Content-Type": "multipart/form-data" }, body: "invalid",
      }));
      assert.equal(malformed.status, 400);
      assert.equal(count("fin"), before);
    });

    await suite.test("adds and removes photos in one multipart update", async () => {
      const before = keys();
      const response = await update(request("/api/fin/update", "PATCH", { finId, removedPhotoIds: [photoId] }, [photo("label.png")]));
      assert.equal(response.status, 200);
      const { data } = await response.json();
      assert.equal(data.photos.length, 2);
      assert.equal(data.photos[1].originalName, "label.png");
      assert.equal(keys().length, 2);
      assert.equal(before.filter((key) => keys().includes(key)).length, 1);
      assert.equal((await image(request(`/api/fin-photos/${photoId}`))).status, 404);
    });

    await suite.test("rejects unsupported, empty, oversized, and spoofed images without creating records", async () => {
      const before = count("fin");
      for (const invalid of [
        new File([png], "photo.svg", { type: "image/svg+xml" }),
        new File([], "empty.png", { type: "image/png" }),
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
        new File(["fake image"], "fake.png", { type: "image/png" }),
      ]) {
        assert.equal((await create(request("/api/fin/create", "POST", base, [invalid]))).status, 400);
      }
      assert.equal((await create(request("/api/fin/create", "POST", base, Array.from({ length: 7 }, () => photo())))).status, 400);
      assert.equal(count("fin"), before);
      assert.equal(keys().length, 2);
    });

    await suite.test("checks photo count inside the transaction during concurrent updates", async () => {
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId }, [photo(), photo(), photo()]))).status, 200);
      const responses = await Promise.all([0, 1].map(() => update(request("/api/fin/update", "PATCH", { finId }, [photo()]))));
      assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
      assert.equal(count("fin_photos"), 6);
      assert.equal(keys().length, 6);
    });

    await suite.test("rejects unrelated photo IDs without changing financial fields", async () => {
      const response = await update(request("/api/fin/update", "PATCH", { finId, merchant: "Should not save", removedPhotoIds: [999999] }));
      assert.equal(response.status, 400);
      assert.equal((fixture.prepare("SELECT merchant FROM fin WHERE fin_id = ?").get(finId) as { merchant: string }).merchant, base.merchant);
      for (const removedPhotoIds of [["1"], [-1], [null]]) {
        assert.equal((await update(request("/api/fin/update", "PATCH", { finId, removedPhotoIds }))).status, 400);
      }
    });

    await suite.test("rolls back failed record creation and removes staged files", async () => {
      const records = count("fin");
      const rules = count("schedule_rules");
      const before = keys();
      const response = await create(request("/api/fin/create", "POST", { ...base, isScheduled: true, frequency: "monthly",
        lineItems: [{ name: "Shoes", originalAmountCents: 10000, personId: 99999 }] }, [photo()]));
      assert.equal(response.status, 500);
      assert.equal(count("fin"), records);
      assert.equal(count("schedule_rules"), rules);
      assert.deepEqual(keys(), before);
    });

    await suite.test("preserves existing photos and fields when an update fails", async () => {
      const before = keys();
      const id = (fixture.prepare("SELECT photo_id FROM fin_photos WHERE fin_id = ? LIMIT 1").get(finId) as { photo_id: number }).photo_id;
      const response = await update(request("/api/fin/update", "PATCH", { finId, merchant: "Should roll back", removedPhotoIds: [id],
        lineItems: [{ name: "Shoes", originalAmountCents: 10000, personId: 99999 }] }, [photo()]));
      assert.equal(response.status, 500);
      assert.deepEqual(keys(), before);
      assert.equal((await image(request(`/api/fin-photos/${id}`))).status, 200);
      assert.equal((fixture.prepare("SELECT merchant FROM fin WHERE fin_id = ?").get(finId) as { merchant: string }).merchant, base.merchant);
    });

    await suite.test("rejects filesystem failures without saving a record", async () => {
      const before = count("fin");
      const blocked = path.join(directory, "blocked");
      writeFileSync(blocked, "not a directory");
      process.env.DATABASE_PATH = path.join(blocked, "finance.db");
      try {
        assert.equal((await create(request("/api/fin/create", "POST", base, [photo()]))).status, 500);
      } finally {
        process.env.DATABASE_PATH = databasePath;
      }
      assert.equal(count("fin"), before);
    });

    await suite.test("keeps scheduled photos on one occurrence and cleans files during scoped deletion", async () => {
      const response = await create(request("/api/fin/create", "POST", { ...base, isScheduled: true, frequency: "monthly" }, [photo()]));
      assert.equal(response.status, 201);
      const { data } = await response.json();
      const future = fixture.prepare("SELECT fin_id FROM fin WHERE schedule_rule_id = ? AND fin_id != ? ORDER BY scheduled_on LIMIT 1")
        .get(data.scheduleRuleId, data.finId) as { fin_id: string };
      assert.equal(count("fin_photos"), 7);
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: data.finId, merchant: "Scheduled shoes", scope: "all" }, [photo("size.png")]))).status, 200);
      const futureData = await (await detail(request(`/api/fin/${future.fin_id}`))).json();
      assert.equal(futureData.data.photos.length, 0);
      assert.equal(futureData.data.merchant, "Scheduled shoes");
      assert.equal((await update(request("/api/fin/update", "PATCH", { finId: future.fin_id }, [photo()]))).status, 200);
      assert.equal((await remove(request(`/api/fin/${data.finId}?scope=single`, "DELETE"))).status, 200);
      assert.equal((await detail(request(`/api/fin/${future.fin_id}`))).status, 200);
      assert.equal(keys().length, 7);
      assert.equal((await remove(request(`/api/fin/${future.fin_id}?scope=all`, "DELETE"))).status, 200);
      assert.equal(keys().length, 6);
      assert.equal(count("fin_photos"), 6);
    });

    await suite.test("retries old orphan cleanup and keeps recent staged files", async () => {
      const oldKey = `${randomUUID()}.jpg`;
      const recentKey = `${randomUUID()}.jpg`;
      const descriptiveKey = `20261024_shoe_shop_100.00_${randomUUID()}.png`;
      const oldPath = path.join(directory, "uploads/product-photos", oldKey);
      const recentPath = path.join(directory, "uploads/product-photos", recentKey);
      const descriptivePath = path.join(directory, "uploads/product-photos", descriptiveKey);
      writeFileSync(oldPath, png);
      writeFileSync(recentPath, png);
      writeFileSync(descriptivePath, png);
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      utimesSync(oldPath, yesterday, yesterday);
      utimesSync(descriptivePath, yesterday, yesterday);
      await cleanupOrphanProductPhotos();
      assert.equal(existsSync(oldPath), false);
      assert.equal(existsSync(descriptivePath), false);
      assert.equal(existsSync(recentPath), true);
      rmSync(recentPath);
    });

    await suite.test("deletes an ordinary record and its photo files", async () => {
      assert.equal((await remove(request(`/api/fin/${finId}`, "DELETE"))).status, 200);
      assert.equal(count("fin_photos"), 0);
      assert.deepEqual(keys(), []);
    });
  } finally {
    sqlite.close();
    fixture.close();
    if (process.env.KEEP_FIN_PHOTO_TEST_DATA) console.log(`Photo test database: ${databasePath}`);
    else rmSync(directory, { recursive: true, force: true });
  }
});
