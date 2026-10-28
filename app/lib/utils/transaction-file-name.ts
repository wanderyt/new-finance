export interface TransactionFileMetadata {
  merchant?: string | null;
  date?: string | null;
  amountCents?: number | null;
}

export function buildTransactionFileBase(metadata?: TransactionFileMetadata): string | null {
  if (!metadata?.date || metadata.amountCents == null || !Number.isFinite(metadata.amountCents)) return null;
  const date = new Date(metadata.date);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const merchantPart = (metadata.merchant || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30) || "unknown";
  return `${datePart}_${merchantPart}_${(metadata.amountCents / 100).toFixed(2)}`;
}
