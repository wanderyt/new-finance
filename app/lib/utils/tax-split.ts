import { TAX_ITEM_NAME, type TaxStatus } from "../types/tax";
import { splitByWeight } from "./spending-allocation";

interface SplittableItem {
  name: string;
  originalAmountCents: number;
  category?: string | null;
  subcategory?: string | null;
  taxStatus?: TaxStatus;
  unitPriceCents?: number;
}

type Pair = [category: string | null, subcategory: string | null];

// Replaces all tax lines with one 税 line per category pair of the taxable goods.
// The shares follow the goods amounts and add up to the current tax total. The app does not use tax rates.
// When all taxable goods follow the record, one tax line without a category stays, so it also follows the record.
export function splitTaxLines<T extends SplittableItem>(items: T[], record: { category?: string; subcategory?: string }): T[] {
  const taxLines = items.filter((item) => item.taxStatus === "tax");
  const total = taxLines.reduce((sum, item) => sum + item.originalAmountCents, 0);
  if (!taxLines.length || total <= 0) return items;
  const recordKey = JSON.stringify([record.category || null, record.subcategory || null]);
  const groups = new Map<string, { pair: Pair; weight: number }>();
  for (const item of items) {
    if (item.taxStatus === "tax" || item.taxStatus === "exempt" || item.originalAmountCents <= 0) continue;
    const pair: Pair = item.category ? [item.category, item.subcategory || null] : [record.category || null, record.subcategory || null];
    const key = JSON.stringify(pair);
    const group = groups.get(key) ?? groups.set(key, { pair, weight: 0 }).get(key)!;
    group.weight += item.originalAmountCents;
  }
  const followsRecord = [...groups.keys()].every((key) => key === recordKey);
  const targets = followsRecord ? [{ pair: [null, null] as Pair, weight: 1 }] : [...groups.values()];
  const shares = splitByWeight(total, targets.map((target) => target.weight));
  const template = taxLines[0];
  const split = targets.map(({ pair: [category, subcategory] }, index): T => ({ ...template, name: TAX_ITEM_NAME,
    originalAmountCents: shares[index], unitPriceCents: shares[index], category, subcategory }))
    .filter((line) => line.originalAmountCents > 0);
  const goods = items.filter((item) => item.taxStatus !== "tax");
  // No tax line comes before the first one, so its index is also its position among the goods.
  const at = items.indexOf(template);
  return [...goods.slice(0, at), ...split, ...goods.slice(at)];
}
