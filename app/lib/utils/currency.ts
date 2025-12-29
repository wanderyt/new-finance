import { fetchExchangeRates, convertCurrencyWithRates } from "../services/fx.service";

/**
 * Convert amount in cents from one currency to all three currencies
 * Uses real-time exchange rates from Frankfurter API
 *
 * @param originalCurrency - Source currency (CAD/USD/CNY)
 * @param originalAmountCents - Amount in cents
 * @returns Object with amounts in all three currencies (in cents)
 */
export async function convertCurrency(
  originalCurrency: "CAD" | "USD" | "CNY",
  originalAmountCents: number
): Promise<{
  amountCadCents: number;
  amountUsdCents: number;
  amountCnyCents: number;
  amountBaseCadCents: number;
}> {
  // Fetch current exchange rates once
  const rates = await fetchExchangeRates();

  // Convert to all three currencies
  const amountCadCents = await convertCurrencyWithRates(
    originalCurrency,
    "CAD",
    originalAmountCents,
    rates
  );
  const amountUsdCents = await convertCurrencyWithRates(
    originalCurrency,
    "USD",
    originalAmountCents,
    rates
  );
  const amountCnyCents = await convertCurrencyWithRates(
    originalCurrency,
    "CNY",
    originalAmountCents,
    rates
  );

  return {
    amountCadCents,
    amountUsdCents,
    amountCnyCents,
    amountBaseCadCents: amountCadCents, // Base is always CAD
  };
}
