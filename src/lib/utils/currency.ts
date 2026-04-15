/**
 * Multi-currency support: definitions, conversion, formatting.
 */

export type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
}

export const currencies: CurrencyInfo[] = [
  { code: 'EUR', symbol: '\u20ac', name: 'Euro', locale: 'it-IT', flag: '\u{1F1EA}\u{1F1FA}' },
  { code: 'USD', symbol: '$', name: 'Dollaro USA', locale: 'en-US', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco Svizzero', locale: 'de-CH', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'GBP', symbol: '\u00a3', name: 'Sterlina', locale: 'en-GB', flag: '\u{1F1EC}\u{1F1E7}' },
];

/**
 * Approximate exchange rates relative to EUR.
 * 1 EUR = X units of target currency.
 */
export const exchangeRates: Record<Currency, number> = {
  EUR: 1.0,
  USD: 1.08,
  CHF: 0.94,
  GBP: 0.86,
};

/**
 * Convert an amount from one currency to another.
 * Uses EUR as the pivot currency.
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  // Convert to EUR first, then to target
  const amountInEur = amount / exchangeRates[from];
  return amountInEur * exchangeRates[to];
}

/**
 * Format a value in the given currency using Intl.NumberFormat.
 */
export function formatCurrencyValue(amount: number, currency: Currency): string {
  const info = getCurrencyInfo(currency);
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the CurrencyInfo for a given currency code.
 */
export function getCurrencyInfo(code: Currency): CurrencyInfo {
  const found = currencies.find(c => c.code === code);
  if (!found) {
    return currencies[0]; // fallback to EUR
  }
  return found;
}
