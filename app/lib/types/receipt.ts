import type { NecessityLevel } from "./necessity";
import type { TaxStatus } from "./tax";

export interface AnalyzedLineItem {
  name: string;
  amount: number;
  quantity?: number;
  unit?: string | null;
  unitPrice?: number;
  unitPriceCents?: number;
  notes?: string;
  brandName?: string | null;
  suggestedNecessityLevel?: NecessityLevel | null;
  necessityReason?: string | null;
  // AI hint from per-line tax codes. Normalization converts it to taxStatus.
  taxable?: boolean | null;
  taxStatus?: TaxStatus;
  // Null means the item follows the record's suggested category.
  suggestedCategory?: string | null;
  suggestedSubcategory?: string | null;
}

export interface ReceiptAnalysisResult {
  lineItems: AnalyzedLineItem[];
  totalAmount: number;
  subtotalAmount?: number;
  taxAmount?: number;
  tipAmount?: number;
  detectedCurrency?: string;
  merchant?: string;
  merchantType?: string;
  date?: string;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
}
