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

export function t(key: string, params?: Record<string, string | number>): string {
  const raw = translations[currentLocale]?.[key] ?? translations['it']?.[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}
