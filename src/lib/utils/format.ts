/**
 * Funzioni di formattazione per valuta, percentuali, numeri e date.
 * Localizzazione italiana (it-IT), valuta EUR.
 */
import { getCurrency } from './currency-store.svelte';
import { getCurrencyInfo } from './currency';

const eurFormatter = new Intl.NumberFormat('it-IT', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});

const eurDetailedFormatter = new Intl.NumberFormat('it-IT', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('it-IT', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
	day: '2-digit',
	month: 'long',
	year: 'numeric'
});

const shortDateFormatter = new Intl.DateTimeFormat('it-IT', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});

/**
 * Formatta un valore in EUR (senza decimali).
 * @example formatCurrency(150000) => "150.000 €"
 */
export function formatCurrency(value: number, detailed = false): string {
	if (detailed) {
		return eurDetailedFormatter.format(value);
	}
	return eurFormatter.format(value);
}

/**
 * Formatta un valore come percentuale.
 * Accetta valori già in formato percentuale (es. 7.5 per 7.5%).
 * @example formatPercent(7.5) => "7,5%"
 */
export function formatPercent(value: number, alreadyPercent = true): string {
	if (alreadyPercent) {
		return percentFormatter.format(value / 100);
	}
	return percentFormatter.format(value);
}

/**
 * Formatta numeri grandi con abbreviazioni italiane.
 * @example formatCompact(1500000) => "1,5M"
 * @example formatCompact(2500) => "2,5K"
 */
export function formatCompact(value: number): string {
	const abs = Math.abs(value);
	const sign = value < 0 ? '-' : '';

	if (abs >= 1_000_000_000) {
		return sign + (abs / 1_000_000_000).toFixed(1).replace('.', ',') + 'Mrd';
	}
	if (abs >= 1_000_000) {
		return sign + (abs / 1_000_000).toFixed(1).replace('.', ',') + 'M';
	}
	if (abs >= 1_000) {
		return sign + (abs / 1_000).toFixed(1).replace('.', ',') + 'K';
	}
	return sign + abs.toFixed(0);
}

/**
 * Formatta una data in formato italiano lungo.
 * @example formatDate(new Date()) => "15 aprile 2026"
 */
export function formatDate(date: Date): string {
	return dateFormatter.format(date);
}

/**
 * Formatta una data in formato italiano breve.
 * @example formatDateShort(new Date()) => "15/04/2026"
 */
export function formatDateShort(date: Date): string {
	return shortDateFormatter.format(date);
}

/**
 * Formatta un numero con separatore migliaia italiano.
 * @example formatNumber(1234567) => "1.234.567"
 */
export function formatNumber(value: number, decimals = 0): string {
	return new Intl.NumberFormat('it-IT', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/**
 * Formatta un valore nella valuta correntemente selezionata dall'utente.
 * Usa il currency store per determinare valuta e locale.
 * @example formatCurrencyDynamic(150000) => "150.000 €" (se EUR) o "$150,000" (se USD)
 */
export function formatCurrencyDynamic(value: number, detailed = false): string {
	const currency = getCurrency();
	const info = getCurrencyInfo(currency);
	return new Intl.NumberFormat(info.locale, {
		style: 'currency',
		currency: info.code,
		minimumFractionDigits: detailed ? 2 : 0,
		maximumFractionDigits: detailed ? 2 : 0
	}).format(value);
}
