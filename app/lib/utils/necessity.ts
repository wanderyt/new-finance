import { NECESSITY_LEVELS, type NecessityLevel, type NecessityFields } from "../types/necessity";

export function isNecessityLevel(value: unknown): value is NecessityLevel {
  return NECESSITY_LEVELS.includes(value as NecessityLevel);
}

export function effectiveNecessity(item: NecessityFields, recordDefault: unknown): NecessityLevel {
  return isNecessityLevel(item.necessityLevel) ? item.necessityLevel
    : isNecessityLevel(recordDefault) ? recordDefault : "essential";
}

export function normalizeNecessityReason(value: unknown): string | null {
  return typeof value === "string" ? value.trim().slice(0, 300) || null : null;
}

export function validateNecessityRequest(body: {
  necessityLevel?: unknown;
  lineItems?: unknown;
}, paidAmount: number): string | null {
  if (!Number.isSafeInteger(paidAmount) || paidAmount < 0) return "The paid amount must be a non-negative integer in cents.";
  if (body.necessityLevel !== undefined && !isNecessityLevel(body.necessityLevel)) {
    return "The spending priority is invalid.";
  }
  if (body.lineItems === undefined) return null;
  if (!Array.isArray(body.lineItems)) return "Line items must be an array.";
  let sum = 0;
  for (const item of body.lineItems) {
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !item.name.trim()) {
      return "Each line item must have a name.";
    }
    if (!Number.isSafeInteger(item.originalAmountCents) || item.originalAmountCents < 0) {
      return "Each item amount must be a non-negative integer in cents.";
    }
    if (item.necessityLevel != null && !isNecessityLevel(item.necessityLevel)) {
      return "An item spending priority is invalid.";
    }
    if (item.necessityReason != null &&
      (typeof item.necessityReason !== "string" || item.necessityReason.length > 300)) {
      return "An item reason must contain 300 characters or fewer.";
    }
    sum += item.originalAmountCents;
  }
  if (!Number.isSafeInteger(sum)) return "The item total is too large.";
  return sum > paidAmount ? "Item amounts exceed the paid total. Reconcile the amounts before saving." : null;
}
