import type { Locale } from './index';
import { translations } from './translations';

/**
 * L'app e' di fatto solo-italiano: la UI e' quasi interamente in italiano
 * hardcoded (guida inclusa) e la traduzione EN non e' mantenuta. Il selettore
 * lingua e' stato nascosto (vedi /impostazioni). L'infrastruttura i18n resta in
 * piedi per un'eventuale localizzazione futura, ma qui normalizziamo qualsiasi
 * locale residuo (es. 'en' salvato in passato in localStorage) a 'it', cosi' la
 * UI resta coerente per chi aveva selezionato l'inglese.
 */
/** Locali con traduzione completa e mantenuta. Oggi solo l'italiano. */
const COMPLETE_LOCALES: Locale[] = ['it'];

function normalizeLocale(value: string | null): Locale {
	return value && (COMPLETE_LOCALES as string[]).includes(value) ? (value as Locale) : 'it';
}

let currentLocale = $state<Locale>(
	normalizeLocale(typeof localStorage !== 'undefined' ? localStorage.getItem('fire-locale') : null)
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
