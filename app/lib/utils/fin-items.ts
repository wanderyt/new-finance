import type { FinLineItem } from "../types/api";
import type { NewFinItem } from "../db/schema";
import { TAX_STATUSES, taxStatusForName, type TaxStatus } from "../types/tax";
import { normalizeNecessityReason } from "./necessity";

function isTaxStatus(value: unknown): value is TaxStatus {
  return TAX_STATUSES.includes(value as TaxStatus);
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() || null : null);

// A null category pair means the item follows its record's category.
function itemCategoryPair(item: Pick<FinLineItem, "category" | "subcategory">) {
  const category = text(item.category);
  return { category, subcategory: category ? text(item.subcategory) : null };
}

export function toFinItemRows(items: FinLineItem[], finId: string): NewFinItem[] {
  return items.map((item, index) => ({
    finId,
    lineNo: index + 1,
    name: item.name,
    qty: item.qty || null,
    unit: item.unit || null,
    unitPriceCents: item.unitPriceCents || null,
    originalAmountCents: item.originalAmountCents,
    personId: item.personId || null,
    ...itemCategoryPair(item),
    notes: item.notes || null,
    brandName: item.brandName || null,
    necessityLevel: item.necessityLevel ?? null,
    necessityReason: normalizeNecessityReason(item.necessityReason),
    // Callers that omit the status, such as MCP tools, get a tax line for an item named 税.
    taxStatus: item.taxStatus ?? taxStatusForName(item.name),
  }));
}

export function validateItemClassification(lineItems: unknown): string | null {
  if (!Array.isArray(lineItems)) return null;
  for (const item of lineItems as FinLineItem[]) {
    if (item.taxStatus != null && !isTaxStatus(item.taxStatus)) return "An item tax status is invalid.";
    for (const value of [item.category, item.subcategory]) {
      if (value != null && (typeof value !== "string" || value.length > 100)) {
        return "An item category must be text with 100 characters or fewer.";
      }
    }
    if (text(item.subcategory) && !text(item.category)) return "An item subcategory requires a category.";
  }
  return null;
}
