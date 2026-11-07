import type { NecessityLevel } from "./necessity";

export interface AnalyzedLineItem {
  name: string;
  amount: number;
  quantity?: number;
  unit?: string | null;
  unitPrice?: number;
  unitPriceCents?: number;
  notes?: string;
  brandName?: string | null;
  suggestedNecessityLevel?: NecessityLevel;
  necessityReason?: string | null;
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
