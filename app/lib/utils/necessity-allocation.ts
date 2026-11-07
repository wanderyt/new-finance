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
}

export function allocateNecessity(record: AllocationRecord, items: AllocationItem[]): NecessityAllocation[] {
  if (record.type !== "expense") return [];
  const source = [...items].filter((item) => item.originalAmountCents > 0)
    .sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0) || (a.itemId ?? 0) - (b.itemId ?? 0));
  const itemSum = source.reduce((sum, item) => sum + item.originalAmountCents, 0);
  const estimated = itemSum > record.originalAmountCents;
  const rows = source.map((item) => ({
    finId: record.finId,
    itemId: item.itemId ?? null,
    name: item.name,
    necessityLevel: effectiveNecessity(item, record.necessityLevel),
    category: (item.category ? item.category : record.category) || "未分类",
    subcategory: (item.category ? item.subcategory : record.subcategory) || "未分类",
    weight: item.originalAmountCents,
    remainder: false,
    estimated,
  }));
  if (!rows.length || itemSum < record.originalAmountCents) {
    rows.push({ finId: record.finId, itemId: null, name: rows.length ? "未分配余额" : "账单总额",
      necessityLevel: effectiveNecessity({}, record.necessityLevel),
      category: record.category || "未分类", subcategory: record.subcategory || "未分类",
      weight: Math.max(0, record.originalAmountCents - itemSum), remainder: rows.length > 0, estimated: false });
  }
  const denominator = BigInt(rows.reduce((sum, row) => sum + row.weight, 0));
  if (!denominator) return rows.map((row) => ({ finId: row.finId, itemId: row.itemId, name: row.name, necessityLevel: row.necessityLevel,
    category: row.category, subcategory: row.subcategory, remainder: row.remainder, estimated: row.estimated, amountCadCents: 0 }));
  const values = rows.map((row, index) => {
    const numerator = BigInt(record.amountCadCents) * BigInt(row.weight);
    return { index, cents: Number(numerator / denominator), fraction: numerator % denominator };
  });
  const remaining = record.amountCadCents - values.reduce((sum, value) => sum + value.cents, 0);
  const order = [...values].sort((a, b) => a.fraction === b.fraction ? a.index - b.index : a.fraction > b.fraction ? -1 : 1);
  for (let i = 0; i < remaining; i++) order[i].cents += 1;
  return rows.map((row, index) => ({ finId: row.finId, itemId: row.itemId, name: row.name, necessityLevel: row.necessityLevel,
    category: row.category, subcategory: row.subcategory, remainder: row.remainder, estimated: row.estimated, amountCadCents: values[index].cents }));
}

export function emptyNecessityReport(): NecessityReport {
  return { totalCadCents: 0, estimatedCadCents: 0, estimatedRecordCount: 0, remainderCadCents: 0,
    totals: { essential: 0, personal_priority: 0, flexible: 0, unexpected: 0 }, buckets: [] };
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
