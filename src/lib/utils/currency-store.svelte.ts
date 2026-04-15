/**
 * Svelte 5 runes store for the selected currency.
 * Persists to localStorage.
 */
import { type Currency, getCurrencyInfo, formatCurrencyValue } from './currency';

const STORAGE_KEY = 'fire-currency';

let currentCurrency = $state<Currency>(
  (typeof localStorage !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as Currency)
    : null) || 'EUR'
);

export function getCurrency(): Currency {
  return currentCurrency;
}

export function setCurrency(c: Currency): void {
  currentCurrency = c;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, c);
  }
}

/**
 * Format an amount using the currently selected currency.
 */
export function formatAmount(amount: number): string {
  return formatCurrencyValue(amount, currentCurrency);
}
