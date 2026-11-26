import type { AnalyzedLineItem, ReceiptAnalysisResult } from "../types/receipt";
import { isNecessityLevel, normalizeNecessityReason } from "./necessity";
import { TAX_ITEM_NAME } from "../types/tax";

const taxLabel = /^(?:(?:sales\s+)?tax|(?:hst|gst|pst|qst)(?:\s*[+/&]\s*(?:hst|gst|pst|qst))*|税|税费)(?:\s*\([^)]*\)|\s+\d+(?:\.\d+)?\s*%)?$/i;
const tipLabel = /^(?:tip|tips|gratuity|gratuities|小费)(?:\s*\(\d+(?:\.\d+)?%\))?$/i;
const fineLabel = /^(?:(?:parking|traffic|speeding|tax|late payment)\s+)?(?:fine|fines|penalty|penalties)$|^(?:停车|交通|超速)?罚款$|^滞纳金$/i;

export function normalizeReceiptNecessities(receipt: ReceiptAnalysisResult): AnalyzedLineItem[] {
  const separateTax = Number.isSafeInteger(receipt.taxAmount) && receipt.taxAmount! > 0;
  const separateTip = Number.isSafeInteger(receipt.tipAmount) && receipt.tipAmount! > 0;
  // When the receipt marks some lines as taxed, the unmarked lines are exempt even if the AI returned null.
  const marked = (receipt.lineItems || []).some((item) => item.taxable === true);
  const items = (receipt.lineItems || []).filter((item) =>
    !(separateTax && taxLabel.test(item.name.trim())) && !(separateTip && tipLabel.test(item.name.trim()))
  ).map(({ taxable, ...item }): AnalyzedLineItem => {
    const tax = taxLabel.test(item.name.trim());
    const tip = tipLabel.test(item.name.trim());
    const fine = fineLabel.test(item.name.trim());
    const suggestedNecessityLevel = tax || tip ? null
      : fine ? "unexpected" : isNecessityLevel(item.suggestedNecessityLevel) ? item.suggestedNecessityLevel : "essential";
    return {
      ...item,
      // Tax lines use the name 税. The original label, such as "HST 13%", moves to the notes.
      ...(tax && item.name.trim() !== TAX_ITEM_NAME ? { name: TAX_ITEM_NAME, notes: item.notes || item.name.trim() } : {}),
      taxStatus: tax ? "tax" : tip || taxable === false || (marked && taxable !== true) ? "exempt" : "taxable",
      suggestedNecessityLevel,
      necessityReason: tax || tip || (isNecessityLevel(item.suggestedNecessityLevel) && item.suggestedNecessityLevel !== suggestedNecessityLevel)
        ? null : normalizeNecessityReason(item.necessityReason),
    };
  });
  const brands = [...new Set(items.map((item) => item.brandName?.trim()).filter(Boolean))];
  const sharedBrand = brands.length === 1 ? brands[0] : undefined;
  if (separateTax) items.push({ name: TAX_ITEM_NAME, amount: receipt.taxAmount!, quantity: 1,
    notes: "Tax (HST/GST/PST combined)", brandName: sharedBrand, taxStatus: "tax",
    suggestedNecessityLevel: null, necessityReason: null });
  if (separateTip) items.push({ name: "小费", amount: receipt.tipAmount!, quantity: 1,
    notes: "Tip paid", brandName: receipt.merchant, taxStatus: "exempt",
    suggestedNecessityLevel: null, necessityReason: null });
  return items;
}
