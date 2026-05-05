/**
 * Scelta della "serie storica di default" per il calcolatore. Per un risparmiatore
 * italiano, la combinazione piu' rappresentativa e':
 *   - Equity: MSCI World (proxy: international.ts) -> world stock index
 *   - Bond: BTP 7-10y (proxy: btp.ts) -> obbligazionario IT
 *   - Inflazione: ISTAT CPI (inflation-it.ts)
 *
 * Manteniamo i dataset US (sp500, bonds, inflation-us) come "preset alternativo"
 * per chi vuole il classico set Bogleheads. L'utente potra' switchare nel
 * pannello configurazione del Monte Carlo.
 */

import { internationalReturns } from './international';
import { btpReturns } from './btp';
import { inflationITReturns } from './inflation-it';
import { sp500Returns } from './sp500';
import { bondReturns } from './bonds';
import { inflationUSReturns } from './inflation-us';
import { goldReturns } from './gold';

export type SeriesPresetId = 'it-default' | 'us-classic';

export interface SeriesPreset {
	id: SeriesPresetId;
	label: string;
	description: string;
	stocks: number[]; // decimali (0.07 = 7%)
	bonds: number[];
	inflation: number[];
	gold: number[];
}

const toDecimals = (xs: { value: number }[]) => xs.map((x) => x.value / 100);

/** Preset IT-centric (MSCI World + BTP + inflazione ISTAT) */
export const SERIES_IT_DEFAULT: SeriesPreset = {
	id: 'it-default',
	label: 'Italiano (MSCI World + BTP + ISTAT)',
	description:
		'Default IT-centric: MSCI World ex-USA (1970-2024), BTP 7-10y (1991-2024 stimati), ' +
		'inflazione ISTAT (1960-2024). Piu\' rappresentativo di un portafoglio italiano EUR.',
	stocks: toDecimals(internationalReturns),
	bonds: toDecimals(btpReturns),
	inflation: toDecimals(inflationITReturns),
	gold: toDecimals(goldReturns)
};

/** Preset US classic (S&P 500 + bond aggregato US + inflazione US) */
export const SERIES_US_CLASSIC: SeriesPreset = {
	id: 'us-classic',
	label: 'Bogleheads classico (S&P 500 + US Bonds + CPI USA)',
	description:
		'Preset USA: S&P 500 (1928-2024), bond aggregato USA, inflazione CPI US. ' +
		'Comodo per backtest Trinity / replicate degli studi americani, ma poco ' +
		'rappresentativo del rischio cambio per un risparmiatore EUR.',
	stocks: toDecimals(sp500Returns),
	bonds: toDecimals(bondReturns),
	inflation: toDecimals(inflationUSReturns),
	gold: toDecimals(goldReturns)
};

export const ALL_SERIES_PRESETS: SeriesPreset[] = [SERIES_IT_DEFAULT, SERIES_US_CLASSIC];

export function getSeriesPreset(id: SeriesPresetId | string | undefined): SeriesPreset {
	if (id === 'us-classic') return SERIES_US_CLASSIC;
	return SERIES_IT_DEFAULT;
}
