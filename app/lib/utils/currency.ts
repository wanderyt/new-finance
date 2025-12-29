import {
  fetchExchangeRates,
  convertCurrencyWithRates,
  createFxSnapshot,
  getFxSnapshotById,
  type ExchangeRates
} from "../services/fx.service";

/**
 * Convert amount in cents from one currency to all three currencies
 * Uses exchange rates from FX snapshot if provided, otherwise fetches current rates
 *
 * @param originalCurrency - Source currency (CAD/USD/CNY)
 * @param originalAmountCents - Amount in cents
 * @param fxId - Optional FX snapshot ID to use for conversion
 * @returns Object with amounts in all three currencies (in cents) and fxId
 */
export async function convertCurrency(
  originalCurrency: "CAD" | "USD" | "CNY",
  originalAmountCents: number,
  fxId?: number | null
): Promise<{
  amountCadCents: number;
  amountUsdCents: number;
  amountCnyCents: number;
  amountBaseCadCents: number;
  fxId: number;
}> {
  let rates: ExchangeRates;
  let usedFxId: number;

  if (fxId) {
    // Use existing FX snapshot
    const snapshot = await getFxSnapshotById(fxId);
    if (!snapshot) {
      throw new Error(`FX snapshot with ID ${fxId} not found`);
    }
    rates = snapshot;
    usedFxId = fxId;
  } else {
    // Fetch current rates and create new snapshot
    rates = await fetchExchangeRates();
    usedFxId = await createFxSnapshot(rates);
  }

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
    fxId: usedFxId,
  };
}
