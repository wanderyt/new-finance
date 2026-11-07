import type { AnalyzedLineItem, ReceiptAnalysisResult } from "../types/receipt";
import { isNecessityLevel, normalizeNecessityReason } from "./necessity";

const taxLabel = /^(?:(?:sales\s+)?tax|(?:hst|gst|pst|qst)(?:\s*[+/&]\s*(?:hst|gst|pst|qst))*|税|税费)(?:\s*\([^)]*\)|\s+\d+(?:\.\d+)?\s*%)?$/i;
const tipLabel = /^(?:tip|tips|gratuity|gratuities|小费)(?:\s*\(\d+(?:\.\d+)?%\))?$/i;
const fineLabel = /^(?:(?:parking|traffic|speeding|tax|late payment)\s+)?(?:fine|fines|penalty|penalties)$|^(?:停车|交通|超速)?罚款$|^滞纳金$/i;

export function normalizeReceiptNecessities(receipt: ReceiptAnalysisResult): AnalyzedLineItem[] {
  const separateTax = Number.isSafeInteger(receipt.taxAmount) && receipt.taxAmount! > 0;
  const separateTip = Number.isSafeInteger(receipt.tipAmount) && receipt.tipAmount! > 0;
  const items = (receipt.lineItems || []).filter((item) =>
    !(separateTax && taxLabel.test(item.name.trim())) && !(separateTip && tipLabel.test(item.name.trim()))
  ).map((item): AnalyzedLineItem => {
    const tax = taxLabel.test(item.name.trim());
    const tip = tipLabel.test(item.name.trim());
    const fine = fineLabel.test(item.name.trim());
    const suggestedNecessityLevel = tax || tip ? null
      : fine ? "unexpected" : isNecessityLevel(item.suggestedNecessityLevel) ? item.suggestedNecessityLevel : "essential";
    return {
      ...item,
      suggestedNecessityLevel,
      necessityReason: tax || tip || (isNecessityLevel(item.suggestedNecessityLevel) && item.suggestedNecessityLevel !== suggestedNecessityLevel)
        ? null : normalizeNecessityReason(item.necessityReason),
    };
  });
  const brands = [...new Set(items.map((item) => item.brandName?.trim()).filter(Boolean))];
  const sharedBrand = brands.length === 1 ? brands[0] : undefined;
  if (separateTax) items.push({ name: "税", amount: receipt.taxAmount!, quantity: 1,
    notes: "Tax (HST/GST/PST combined)", brandName: sharedBrand,
    suggestedNecessityLevel: null, necessityReason: null });
  if (separateTip) items.push({ name: "小费", amount: receipt.tipAmount!, quantity: 1,
    notes: "Tip paid", brandName: receipt.merchant,
    suggestedNecessityLevel: null, necessityReason: null });
  return items;
}
