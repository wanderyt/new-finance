// Mock exchange rates (CAD as base currency)
// TODO: Replace with real FX API integration (e.g., exchangerate-api.com)
const MOCK_FX_RATES = {
  CAD_TO_USD: 0.73, // 1 CAD = 0.73 USD
  CAD_TO_CNY: 5.2, // 1 CAD = 5.20 CNY
  USD_TO_CAD: 1.37, // 1 USD = 1.37 CAD
  USD_TO_CNY: 7.12, // 1 USD = 7.12 CNY
  CNY_TO_CAD: 0.19, // 1 CNY = 0.19 CAD
  CNY_TO_USD: 0.14, // 1 CNY = 0.14 USD
};

/**
 * Convert amount in cents from one currency to all three currencies
 * @param originalCurrency - Source currency (CAD/USD/CNY)
 * @param originalAmountCents - Amount in cents
 * @returns Object with amounts in all three currencies (in cents)
 */
export function convertCurrency(
  originalCurrency: "CAD" | "USD" | "CNY",
  originalAmountCents: number
): {
  amountCadCents: number;
  amountUsdCents: number;
  amountCnyCents: number;
  amountBaseCadCents: number;
} {
  let amountCadCents: number;
  let amountUsdCents: number;
  let amountCnyCents: number;

  switch (originalCurrency) {
    case "CAD":
      amountCadCents = originalAmountCents;
      amountUsdCents = Math.round(originalAmountCents * MOCK_FX_RATES.CAD_TO_USD);
      amountCnyCents = Math.round(originalAmountCents * MOCK_FX_RATES.CAD_TO_CNY);
      break;
    case "USD":
      amountCadCents = Math.round(originalAmountCents * MOCK_FX_RATES.USD_TO_CAD);
      amountUsdCents = originalAmountCents;
      amountCnyCents = Math.round(originalAmountCents * MOCK_FX_RATES.USD_TO_CNY);
      break;
    case "CNY":
      amountCadCents = Math.round(originalAmountCents * MOCK_FX_RATES.CNY_TO_CAD);
      amountUsdCents = Math.round(originalAmountCents * MOCK_FX_RATES.CNY_TO_USD);
      amountCnyCents = originalAmountCents;
      break;
    default:
      throw new Error(`Unsupported currency: ${originalCurrency}`);
  }

  return {
    amountCadCents,
    amountUsdCents,
    amountCnyCents,
    amountBaseCadCents: amountCadCents, // Base is always CAD
  };
}
