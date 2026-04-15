import type { Locale } from './index';
import { translations } from './translations';

let currentLocale = $state<Locale>(
  (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('fire-locale') as Locale)
    : null) || 'it'
);

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('fire-locale', locale);
  }
  // Update html lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function t(key: string): string {
  return translations[currentLocale]?.[key] ?? translations['it']?.[key] ?? key;
}
