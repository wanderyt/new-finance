/**
 * Foreign Exchange Service
 *
 * Fetches real-time exchange rates from Frankfurter API (https://frankfurter.dev)
 * Free, open-source API with no API key required and no rate limits.
 */

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

interface ExchangeRates {
  cadToUsd: number;
  cadToCny: number;
  date: string;
  provider: string;
}

/**
 * Fetch current exchange rates from Frankfurter API
 * Base currency: CAD
 * Target currencies: USD, CNY
 *
 * @returns Exchange rates with CAD as base currency
 * @throws Error if API request fails
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    // Fetch rates with CAD as base currency
    const response = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=CAD&symbols=USD,CNY',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 1 hour to reduce API calls
        next: { revalidate: 3600 }
      }
    );

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
    }

    const data: FrankfurterResponse = await response.json();

    // Validate response
    if (!data.rates || !data.rates.USD || !data.rates.CNY) {
      throw new Error('Invalid response from Frankfurter API: missing rate data');
    }

    return {
      cadToUsd: data.rates.USD,
      cadToCny: data.rates.CNY,
      date: data.date,
      provider: 'Frankfurter',
    };
  } catch (error) {
    console.error('Failed to fetch exchange rates from Frankfurter API:', error);

    // Fall back to mock rates if API fails
    console.warn('Falling back to mock exchange rates');
    return {
      cadToUsd: 0.73,
      cadToCny: 5.2,
      date: new Date().toISOString().split('T')[0],
      provider: 'Mock (Fallback)',
    };
  }
}

/**
 * Convert amount in cents from one currency to another using real-time rates
 *
 * @param fromCurrency - Source currency (CAD/USD/CNY)
 * @param toCurrency - Target currency (CAD/USD/CNY)
 * @param amountCents - Amount in cents
 * @param rates - Exchange rates object (optional, will fetch if not provided)
 * @returns Converted amount in cents
 */
export async function convertCurrencyWithRates(
  fromCurrency: 'CAD' | 'USD' | 'CNY',
  toCurrency: 'CAD' | 'USD' | 'CNY',
  amountCents: number,
  rates?: ExchangeRates
): Promise<number> {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return amountCents;
  }

  // Fetch rates if not provided
  const fxRates = rates || await fetchExchangeRates();

  let convertedAmount: number;

  // All conversions go through CAD as base currency
  if (fromCurrency === 'CAD') {
    // CAD to USD or CNY
    const rate = toCurrency === 'USD' ? fxRates.cadToUsd : fxRates.cadToCny;
    convertedAmount = Math.round(amountCents * rate);
  } else if (toCurrency === 'CAD') {
    // USD or CNY to CAD
    const rate = fromCurrency === 'USD' ? fxRates.cadToUsd : fxRates.cadToCny;
    convertedAmount = Math.round(amountCents / rate);
  } else {
    // USD <-> CNY (convert through CAD)
    // First convert to CAD, then to target currency
    const cadAmount = await convertCurrencyWithRates(fromCurrency, 'CAD', amountCents, fxRates);
    convertedAmount = await convertCurrencyWithRates('CAD', toCurrency, cadAmount, fxRates);
  }

  return convertedAmount;
}
