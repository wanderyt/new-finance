import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateNecessity, necessityPeriod } from "../app/lib/utils/necessity-allocation";
import { effectiveNecessity, validateNecessityRequest } from "../app/lib/utils/necessity";
import { normalizeReceiptNecessities } from "../app/lib/utils/receipt-necessity";

const record = { finId: "record", type: "expense", originalAmountCents: 10000, amountCadCents: 10000,
  necessityLevel: "essential", category: "生活", subcategory: "购物" };

test("priority inheritance preserves explicit overrides", () => {
  assert.equal(effectiveNecessity({}, "flexible"), "flexible");
  assert.equal(effectiveNecessity({ necessityLevel: "essential" }, "flexible"), "essential");
  assert.equal(effectiveNecessity({ necessityLevel: null }, "personal_priority"), "personal_priority");
  assert.equal(validateNecessityRequest({ necessityLevel: null }, 100), "The spending priority is invalid.");
  assert.equal(validateNecessityRequest({ lineItems: [{ name: "A", originalAmountCents: 101 }] }, 100), null);
  assert.match(validateNecessityRequest({ lineItems: [{ name: "A", originalAmountCents: 1, necessityReason: "x".repeat(301) }] }, 100)!, /300/);
  assert.equal(validateNecessityRequest({ lineItems: [] }, 100), null);
});

test("allocations reconcile mixed priorities, categories, and an unexplained remainder", () => {
  const rows = allocateNecessity(record, [
    { name: "Medicine", originalAmountCents: 5000 },
    { name: "Skincare", originalAmountCents: 2500, necessityLevel: "personal_priority", category: "健康" },
    { name: "Tip", originalAmountCents: 1500, necessityLevel: "flexible" },
  ]);
  assert.equal(rows.reduce((sum, row) => sum + row.amountCadCents, 0), 10000);
  assert.deepEqual(rows.map((row) => row.amountCadCents), [5000, 2500, 1500, 1000]);
  assert.equal(rows[1].subcategory, "未分类");
  assert.equal(rows[3].remainder, true);
  assert.deepEqual(allocateNecessity({ ...record, type: "income" }, []), []);
  assert.equal(allocateNecessity(record, [])[0].amountCadCents, 10000);
});

test("FX rounding and legacy over-total estimates preserve the paid total", () => {
  const items = [1, 2, 3].map((itemId) => ({ itemId, lineNo: itemId, name: String(itemId), originalAmountCents: 100,
    necessityLevel: "flexible" as const }));
  const rows = allocateNecessity({ ...record, originalAmountCents: 300, amountCadCents: 101 }, items.reverse());
  assert.deepEqual(rows.map((row) => row.amountCadCents), [34, 34, 33]);
  const estimated = allocateNecessity({ ...record, originalAmountCents: 200, amountCadCents: 200 }, items);
  assert.ok(estimated.every((row) => row.estimated));
  assert.equal(estimated.reduce((sum, row) => sum + row.amountCadCents, 0), 200);
  assert.ok(estimated.every((row) => row.necessityLevel === "flexible"));
  assert.equal(allocateNecessity({ ...record, originalAmountCents: 0, amountCadCents: 0 }, [])[0].amountCadCents, 0);
});

test("receipt normalization applies tax and tip rules without duplicate charges", () => {
  const items = normalizeReceiptNecessities({ totalAmount: 1300, taxAmount: 100, tipAmount: 200, merchant: "Cafe", lineItems: [
    { name: "Meal", amount: 1000, suggestedNecessityLevel: "personal_priority", necessityReason: "My choice" },
    { name: "Tax", amount: 100, suggestedNecessityLevel: "flexible" },
    { name: "Tip", amount: 200, suggestedNecessityLevel: "essential" },
  ] });
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((item) => item.suggestedNecessityLevel), ["personal_priority", null, null]);
  assert.equal(items.reduce((sum, item) => sum + item.amount, 0), 1300);
  assert.equal(items[0].necessityReason, "My choice");
  assert.deepEqual(items.slice(1).map((item) => item.necessityReason), [null, null]);
  const routine = normalizeReceiptNecessities({ totalAmount: 4, lineItems: [
    { name: "Milk", amount: 1 }, { name: "Tax", amount: 1 },
    { name: "Tip", amount: 1 }, { name: "Parking fine", amount: 1 },
  ] });
  assert.ok(routine.every((item) => item.necessityReason === null));
  const fallback = normalizeReceiptNecessities({ totalAmount: 1, lineItems: [{ name: "Unknown", amount: 1,
    suggestedNecessityLevel: "invalid" as never, necessityReason: "x".repeat(500) }] });
  assert.equal(fallback[0].suggestedNecessityLevel, "essential");
  assert.equal(fallback[0].necessityReason?.length, 300);
  assert.equal(normalizeReceiptNecessities({ totalAmount: 1, lineItems: [{ name: "小费", amount: 1 }] })[0].suggestedNecessityLevel, null);
});

test("unexpected fines and repairs retain their own priority and reconcile with other levels", () => {
  assert.equal(effectiveNecessity({}, "unexpected"), "unexpected");
  assert.equal(validateNecessityRequest({ necessityLevel: "unexpected" }, 100), null);
  const items = normalizeReceiptNecessities({ totalAmount: 1000, lineItems: [
    { name: "Parking fine", amount: 300, suggestedNecessityLevel: "essential" },
    { name: "Emergency repair", amount: 400, suggestedNecessityLevel: "unexpected", necessityReason: "Unexpected breakdown" },
    { name: "Tax", amount: 200, suggestedNecessityLevel: "unexpected" },
    { name: "Tip", amount: 100, suggestedNecessityLevel: "unexpected" },
  ] });
  assert.deepEqual(items.map((item) => item.suggestedNecessityLevel), ["unexpected", "unexpected", null, null]);
  assert.equal(items[1].necessityReason, "Unexpected breakdown");
  assert.deepEqual(items.filter((_, index) => index !== 1).map((item) => item.necessityReason), [null, null, null]);
  const corrected = normalizeReceiptNecessities({ totalAmount: 1, lineItems: [{ name: "Tax", amount: 1,
    suggestedNecessityLevel: "flexible", necessityReason: "Can skip this expense" }] });
  assert.equal(corrected[0].necessityReason, null);
  const allocations = allocateNecessity({ ...record, originalAmountCents: 1000, amountCadCents: 1000 },
    items.map((item) => ({ name: item.name, originalAmountCents: item.amount, necessityLevel: item.suggestedNecessityLevel })));
  assert.equal(allocations.filter((item) => item.necessityLevel === "unexpected").reduce((sum, item) => sum + item.amountCadCents, 0), 700);
  assert.equal(allocations.reduce((sum, item) => sum + item.amountCadCents, 0), 1000);
});

test("receipt tax and tips request the record priority as initial suggestions on uniform and mixed purchases", () => {
  const separate = normalizeReceiptNecessities({ totalAmount: 1280, taxAmount: 130, tipAmount: 150, lineItems: [
    { name: "Aesthetic treatment", amount: 1000, suggestedNecessityLevel: "personal_priority" },
  ] });
  const extracted = normalizeReceiptNecessities({ totalAmount: 1280, lineItems: [
    { name: "Medicine", amount: 500, suggestedNecessityLevel: "essential" },
    { name: "Skincare", amount: 500, suggestedNecessityLevel: "personal_priority" },
    { name: "HST", amount: 130, suggestedNecessityLevel: "essential", necessityReason: "Tax is always essential" },
    { name: "Gratuity", amount: 150, suggestedNecessityLevel: "flexible", necessityReason: "Tips are always optional" },
  ] });
  for (const items of [separate, extracted]) {
    for (const charge of items.slice(-2)) {
      assert.equal(charge.suggestedNecessityLevel, null);
      assert.equal(charge.necessityReason, null);
    }
    assert.equal(items.reduce((sum, item) => sum + item.amount, 0), 1280);
  }
  const penalty = normalizeReceiptNecessities({ totalAmount: 100, lineItems: [{ name: "Tax penalty", amount: 100 }] });
  assert.equal(penalty[0].suggestedNecessityLevel, "unexpected");
});

test("report periods use UTC boundaries and reject malformed or future periods", () => {
  const now = new Date("2026-11-03T23:00:00Z");
  assert.equal(necessityPeriod("month", "2026-02", now).end, "2026-03-01T00:00:00.000Z");
  assert.equal(necessityPeriod("year", "2026", now).start, "2026-01-01T00:00:00.000Z");
  assert.throws(() => necessityPeriod("month", "2026-13", now));
  assert.throws(() => necessityPeriod("month", "2026-12", now));
  assert.throws(() => necessityPeriod("year", "2027", now));
});
