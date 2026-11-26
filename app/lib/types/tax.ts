// How a line item relates to sales tax in category reports:
// taxable items receive a share of the record's tax lines, exempt items do not,
// and tax lines split their amount across the taxable items.
export const TAX_STATUSES = ["taxable", "exempt", "tax"] as const;
export type TaxStatus = (typeof TAX_STATUSES)[number];

// Goods choose one of these two statuses. The item name identifies a tax line.
export const GOODS_TAX_STATUSES = ["taxable", "exempt"] as const;

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  taxable: "计税",
  exempt: "免税",
  tax: "税",
};

export const TAX_ITEM_NAME = "税";

// An item named 税 is a tax line. A renamed tax line becomes a taxable good.
export function taxStatusForName(name: string, current?: TaxStatus): TaxStatus {
  if (name.trim() === TAX_ITEM_NAME) return "tax";
  return current === "exempt" ? "exempt" : "taxable";
}
