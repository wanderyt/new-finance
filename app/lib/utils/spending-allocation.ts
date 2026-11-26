import type { NecessityAllocation, NecessityFields, NecessityReport } from "../types/necessity";
import { effectiveNecessity } from "./necessity";

export interface AllocationRecord {
  finId: string;
  type: string;
  necessityLevel?: string | null;
  originalAmountCents: number;
  amountCadCents: number;
  category: string | null;
  subcategory: string | null;
}

export interface AllocationItem extends NecessityFields {
  itemId?: number;
  lineNo?: number | null;
  name: string;
  originalAmountCents: number;
  category?: string | null;
  subcategory?: string | null;
  taxStatus?: string | null;
}

const UNCATEGORIZED = "未分类";

// Splits an integer total across weights with largest-remainder rounding. Ties go to the earlier weight.
export function splitByWeight(total: number, weights: number[]): number[] {
  const denominator = BigInt(weights.reduce((sum, weight) => sum + weight, 0));
  if (!denominator) return weights.map(() => 0);
  const values = weights.map((weight, index) => {
    const numerator = BigInt(total) * BigInt(weight);
    return { index, cents: Number(numerator / denominator), fraction: numerator % denominator };
  });
  const remaining = total - values.reduce((sum, value) => sum + value.cents, 0);
  const order = [...values].sort((a, b) => a.fraction === b.fraction ? a.index - b.index : a.fraction > b.fraction ? -1 : 1);
  for (let i = 0; i < remaining; i++) order[i].cents += 1;
  return values.map((value) => value.cents);
}

type Row = { allocation: Omit<NecessityAllocation, "amountCadCents">; weight: number };

// Allocates a record's CAD total to its items. Items without a category follow the record's pair.
// A tax line without an explicit category splits across the record's taxable items by amount.
export function allocateSpending(record: AllocationRecord, items: AllocationItem[]): NecessityAllocation[] {
  if (record.type !== "expense") return [];
  const source = [...items].filter((item) => item.originalAmountCents > 0)
    .sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0) || (a.itemId ?? 0) - (b.itemId ?? 0));
  const itemSum = source.reduce((sum, item) => sum + item.originalAmountCents, 0);
  const estimated = itemSum > record.originalAmountCents;
  const recordPair = { category: record.category || UNCATEGORIZED, subcategory: record.subcategory || UNCATEGORIZED };
  const pairOf = (item: AllocationItem) => item.category
    ? { category: item.category, subcategory: item.subcategory || UNCATEGORIZED } : recordPair;
  const rowOf = (item: AllocationItem): Row => ({ weight: item.originalAmountCents, allocation: { finId: record.finId,
    itemId: item.itemId ?? null, name: item.name, necessityLevel: effectiveNecessity(item, record.necessityLevel),
    ...pairOf(item), remainder: false, estimated, taxShare: false } });
  const goods = source.filter((item) => item.taxStatus !== "tax");
  const taxable = goods.filter((item) => (item.taxStatus ?? "taxable") === "taxable");
  const rows = goods.map(rowOf);
  for (const tax of source.filter((item) => item.taxStatus === "tax")) {
    if (tax.category || !taxable.length) {
      rows.push(rowOf(tax));
      continue;
    }
    const shares = splitByWeight(tax.originalAmountCents, taxable.map((item) => item.originalAmountCents));
    const merged = new Map<string, Row>();
    taxable.forEach((item, index) => {
      const pair = pairOf(item);
      const key = JSON.stringify([pair.category, pair.subcategory]);
      const row = merged.get(key) ?? { weight: 0, allocation: { ...rowOf(tax).allocation, ...pair, taxShare: true } };
      row.weight += shares[index];
      merged.set(key, row);
    });
    rows.push(...[...merged.values()].filter((row) => row.weight > 0));
  }
  if (!source.length || itemSum < record.originalAmountCents) {
    rows.push({ weight: Math.max(0, record.originalAmountCents - itemSum), allocation: { finId: record.finId, itemId: null,
      name: source.length ? "未分配余额" : "账单总额", necessityLevel: effectiveNecessity({}, record.necessityLevel),
      ...recordPair, remainder: source.length > 0, estimated: false, taxShare: false } });
  }
  const cents = splitByWeight(record.amountCadCents, rows.map((row) => row.weight));
  return rows.map((row, index) => ({ ...row.allocation, amountCadCents: cents[index] }));
}

export function emptyNecessityReport(): NecessityReport {
  return { totalCadCents: 0, estimatedCadCents: 0, estimatedRecordCount: 0, remainderCadCents: 0,
    totals: { essential: 0, personal_priority: 0, flexible: 0, unexpected: 0 }, buckets: [], categories: [] };
}

export function necessityPeriod(period: string | null, value: string | null, now = new Date()) {
  if (!value || (period !== "month" && period !== "year") ||
    !(period === "month" ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}$/).test(value)) {
    throw new Error("Select a valid month or year.");
  }
  const year = Number(value.slice(0, 4));
  if (year < 1000 || year > 9999) throw new Error("Select a year from 1000 to 9999.");
  const month = period === "month" ? Number(value.slice(5)) - 1 : 0;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year + (period === "year" ? 1 : 0), period === "year" ? 0 : month + 1, 1));
  if (start > now) throw new Error("Future periods are not available.");
  return { start: start.toISOString(), end: end.toISOString(), now: now.toISOString() };
}
