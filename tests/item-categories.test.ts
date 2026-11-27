import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateSpending, splitByWeight } from "../app/lib/utils/spending-allocation";
import { normalizeReceiptNecessities } from "../app/lib/utils/receipt-necessity";
import { normalizeReceiptCategories } from "../app/lib/utils/receipt-categories";
import { toFinItemRows, validateItemClassification } from "../app/lib/utils/fin-items";
import { taxStatusForName } from "../app/lib/types/tax";
import { splitTaxLines } from "../app/lib/utils/tax-split";
import type { LineItem } from "../app/components/dashboard/LineItemEditor";

const record = { finId: "walmart", type: "expense", necessityLevel: "essential", originalAmountCents: 15390,
  amountCadCents: 15390, category: "生活", subcategory: "买菜原料" };
const sumOf = (rows: { amountCadCents: number }[]) => rows.reduce((sum, row) => sum + row.amountCadCents, 0);

test("a tax line without a category follows the record pair and an explicit pair stays whole", () => {
  const rows = allocateSpending(record, [
    { itemId: 1, lineNo: 1, name: "蔬菜", originalAmountCents: 12000 },
    { itemId: 2, lineNo: 2, name: "衬衫", originalAmountCents: 3000, category: "生活", subcategory: "衣服" },
    { itemId: 3, lineNo: 3, name: "税", originalAmountCents: 290 },
    { itemId: 4, lineNo: 4, name: "税", originalAmountCents: 100, category: "生活", subcategory: "衣服" },
  ]);
  assert.deepEqual(rows.map((row) => [row.name, row.subcategory, row.amountCadCents]),
    [["蔬菜", "买菜原料", 12000], ["衬衫", "衣服", 3000], ["税", "买菜原料", 290], ["税", "衣服", 100]]);
});

test("item priorities stay on their rows and CAD rounding preserves the paid total", () => {
  const rows = allocateSpending({ ...record, originalAmountCents: 1003, amountCadCents: 737 }, [
    { name: "A", originalAmountCents: 301, necessityLevel: "flexible" },
    { name: "B", originalAmountCents: 301, category: "生活", subcategory: "衣服" },
    { name: "C", originalAmountCents: 301, category: "生活", subcategory: "玩具" },
    { name: "税", originalAmountCents: 100, necessityLevel: "personal_priority" },
  ]);
  assert.equal(sumOf(rows), 737);
  assert.deepEqual(rows.map((row) => row.necessityLevel), ["flexible", "essential", "essential", "personal_priority"]);
  assert.deepEqual(splitByWeight(10, [1, 1, 1]), [4, 3, 3]);
  assert.deepEqual(splitByWeight(5, [0, 0]), [0, 0]);
});

test("receipt normalization marks tax, tips, and exempt lines", () => {
  const items = normalizeReceiptNecessities({ totalAmount: 1400, taxAmount: 130, tipAmount: 200, lineItems: [
    { name: "Milk", amount: 500, taxable: false },
    { name: "Shirt", amount: 570, taxable: true },
    { name: "Socks", amount: 0, taxable: null },
  ] });
  assert.deepEqual(items.map((item) => [item.name, item.taxStatus]),
    [["Milk", "exempt"], ["Shirt", "taxable"], ["Socks", "exempt"], ["税", "tax"], ["小费", "exempt"]]);
  const extracted = normalizeReceiptNecessities({ totalAmount: 1130, lineItems: [
    { name: "Shirt", amount: 1000 }, { name: "HST 13%", amount: 130 },
  ] });
  assert.deepEqual(extracted.map((item) => [item.name, item.notes, item.taxStatus]),
    [["Shirt", undefined, "taxable"], ["税", "HST 13%", "tax"]]);
  assert.ok(extracted.every((item) => !("taxable" in item)));
});

test("receipt categories keep valid pairs and inherit the record pair", () => {
  const allowed = [{ category: "生活", subcategory: "买菜原料" }, { category: "生活", subcategory: "衣服" }];
  const items = [
    { name: "蔬菜", amount: 900, taxStatus: "taxable" as const, suggestedCategory: "生活", suggestedSubcategory: "买菜原料" },
    { name: "衬衫", amount: 300, taxStatus: "taxable" as const, suggestedCategory: "生活", suggestedSubcategory: "衣服" },
    { name: "袜子", amount: 50, taxStatus: "exempt" as const, suggestedCategory: "生活", suggestedSubcategory: "衣服" },
    { name: "玩具", amount: 100, taxStatus: "taxable" as const, suggestedCategory: "生活", suggestedSubcategory: "不存在" },
    { name: "税", amount: 40, taxStatus: "tax" as const, suggestedCategory: "生活", suggestedSubcategory: "衣服" },
  ];
  const fromRule = normalizeReceiptCategories(items, allowed, { category: "生活", subcategory: "买菜原料" });
  assert.deepEqual(fromRule.lineItems.map((item) => [item.name, item.amount, item.suggestedSubcategory]), [
    ["蔬菜", 900, null], ["衬衫", 300, "衣服"], ["袜子", 50, "衣服"], ["玩具", 100, null],
    ["税", 31, "买菜原料"], ["税", 9, "衣服"],
  ]);
  assert.equal(fromRule.suggestedSubcategory, "买菜原料");
  const dominant = normalizeReceiptCategories(items, allowed, {});
  assert.equal(dominant.suggestedSubcategory, "买菜原料");
  assert.deepEqual(dominant.lineItems.map((item) => item.suggestedSubcategory), [null, "衣服", "衣服", null, "买菜原料", "衣服"]);
  assert.ok(dominant.lineItems.every((item) => !("originalAmountCents" in item) && !("category" in item)));
  const restaurant = normalizeReceiptCategories(items, [], { category: "周末", subcategory: "晚餐" });
  assert.ok(restaurant.lineItems.every((item) => item.suggestedCategory === null));
  assert.deepEqual(restaurant.lineItems.filter((item) => item.taxStatus === "tax").map((item) => item.amount), [40]);
});

test("item rows store null pairs for inheritance and validate classification", () => {
  const [inherit, explicit] = toFinItemRows([
    { name: "A", originalAmountCents: 1, category: " ", subcategory: "衣服" },
    { name: "B", originalAmountCents: 1, category: "生活", subcategory: "衣服", taxStatus: "exempt" },
  ], "fin");
  assert.deepEqual([inherit.category, inherit.subcategory, inherit.taxStatus], [null, null, "taxable"]);
  assert.deepEqual([explicit.category, explicit.subcategory, explicit.taxStatus], ["生活", "衣服", "exempt"]);
  assert.equal(toFinItemRows([{ name: " 税 ", originalAmountCents: 1 }], "fin")[0].taxStatus, "tax");
  assert.deepEqual([taxStatusForName("税", "taxable"), taxStatusForName("衬衫", "tax"), taxStatusForName("牛奶", "exempt"),
    taxStatusForName("牛奶")], ["tax", "taxable", "exempt", "taxable"]);
  assert.equal(validateItemClassification([{ name: "A", originalAmountCents: 1, taxStatus: "wrong" }]), "An item tax status is invalid.");
  assert.equal(validateItemClassification([{ name: "A", originalAmountCents: 1, subcategory: "衣服" }]), "An item subcategory requires a category.");
  assert.equal(validateItemClassification([{ name: "A", originalAmountCents: 1, category: "生活", subcategory: null }]), null);
});

test("splitTaxLines splits the tax total by the categories of the taxable goods", () => {
  const recordPair = { category: "生活", subcategory: "买菜原料" };
  const items: LineItem[] = [
    { name: "鸡蛋", originalAmountCents: 1899, taxStatus: "exempt" },
    { name: "烘焙纸", originalAmountCents: 1999, category: "生活", subcategory: "生活用品" },
    { name: "维生素", originalAmountCents: 2598, category: "医教", subcategory: "医疗药品", taxStatus: "taxable" },
    { name: "税", originalAmountCents: 500, taxStatus: "tax", notes: "HST", category: "生活", subcategory: "生活用品" },
    { name: "保健品", originalAmountCents: 1299, category: "生活", subcategory: "化妆品" },
    { name: "税", originalAmountCents: 266, taxStatus: "tax" },
  ];
  const split = splitTaxLines(items, recordPair);
  assert.deepEqual(split.map((item) => [item.name, item.originalAmountCents, item.category ?? null, item.subcategory ?? null]), [
    ["鸡蛋", 1899, null, null], ["烘焙纸", 1999, "生活", "生活用品"], ["维生素", 2598, "医教", "医疗药品"],
    ["税", 260, "生活", "生活用品"], ["税", 337, "医教", "医疗药品"], ["税", 169, "生活", "化妆品"],
    ["保健品", 1299, "生活", "化妆品"],
  ]);
  assert.ok(split.filter((item) => item.taxStatus === "tax").every((item) => item.notes === "HST" && item.unitPriceCents === item.originalAmountCents));
  assert.deepEqual(splitTaxLines(split, recordPair), split);

  const groceries = splitTaxLines<LineItem>([{ name: "牛奶", originalAmountCents: 709 }, ...items.slice(3, 4),
    { name: "鸡蛋", originalAmountCents: 1899, category: "生活", subcategory: "买菜原料" }], recordPair);
  assert.deepEqual(groceries.map((item) => [item.name, item.originalAmountCents, item.category ?? null]),
    [["牛奶", 709, null], ["税", 500, null], ["鸡蛋", 1899, "生活"]]);
  assert.equal(splitTaxLines(items.slice(0, 3), recordPair).length, 3);
});
