/**
 * Generate a unique ID for fin records
 * Format: fin_[timestamp]_[random]
 * Example: fin_1703347200000_a3b5c7
 */
export function generateFinId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `fin_${timestamp}_${random}`;
}
