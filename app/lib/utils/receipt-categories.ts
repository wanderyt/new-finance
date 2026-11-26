import type { AnalyzedLineItem } from "../types/receipt";
import { splitTaxLines } from "./tax-split";

export interface CategoryPair {
  category: string;
  subcategory: string;
}

const keyOf = (category?: string | null, subcategory?: string | null) => JSON.stringify([category ?? null, subcategory ?? null]);

/**
 * Keeps item category suggestions that exist in the user's category list.
 * Chooses the record pair from the merchant rule, or else from the largest item amount.
 * Items that match the record pair, and tax lines, follow the record (null pair).
 * Exempt goods keep their suggestion. Tip lines have no suggestion, so they follow the record too.
 * Last, the tax lines split into one 税 item per category pair of the taxable goods.
 */
export function normalizeReceiptCategories(
  items: AnalyzedLineItem[],
  allowed: CategoryPair[],
  recordPair: Partial<CategoryPair>,
): { lineItems: AnalyzedLineItem[]; suggestedCategory?: string; suggestedSubcategory?: string } {
  const valid = new Set(allowed.map((pair) => keyOf(pair.category, pair.subcategory)));
  const suggested = items.map((item) => item.taxStatus !== "tax" &&
    valid.has(keyOf(item.suggestedCategory, item.suggestedSubcategory))
    ? { category: item.suggestedCategory!, subcategory: item.suggestedSubcategory! } : null);
  let record = recordPair.category && recordPair.subcategory ? recordPair as CategoryPair : undefined;
  if (!record) {
    const totals = new Map<string, { pair: CategoryPair; amount: number }>();
    suggested.forEach((pair, index) => {
      if (!pair) return;
      const entry = totals.get(keyOf(pair.category, pair.subcategory)) ?? { pair, amount: 0 };
      entry.amount += items[index].amount;
      totals.set(keyOf(pair.category, pair.subcategory), entry);
    });
    record = [...totals.values()].sort((a, b) => b.amount - a.amount)[0]?.pair;
  }
  const categorized = items.map((item, index) => {
    const pair = suggested[index];
    const inherit = !pair || (record && keyOf(pair.category, pair.subcategory) === keyOf(record.category, record.subcategory));
    return { ...item, originalAmountCents: item.amount,
      category: inherit ? null : pair.category, subcategory: inherit ? null : pair.subcategory };
  });
  const lineItems = splitTaxLines(categorized, record ?? {}).map(({ originalAmountCents, category, subcategory, ...item }) =>
    ({ ...item, amount: originalAmountCents, suggestedCategory: category ?? null, suggestedSubcategory: subcategory ?? null }));
  return { lineItems, suggestedCategory: record?.category, suggestedSubcategory: record?.subcategory };
}
