/**
 * Preset di serie storiche per le modalita' "historical" / "block-bootstrap" del
 * Monte Carlo.
 *
 * Due regole di coerenza (rigore metodologico):
 *
 * 1. UNA SOLA VALUTA per preset. Rendimenti e inflazione devono essere nella
 *    stessa moneta, altrimenti il rendimento reale e' falsato. Il preset italiano
 *    e' tutto in lire/EUR: le serie quotate in USD (azioni ex-USA, oro) sono
 *    convertite con i cambi storici (`fx.ts`) nella prospettiva di un investitore
 *    italiano NON coperto dal rischio cambio, e deflazionate con l'ISTAT. Il
 *    preset USA e' tutto in USD (prospettiva di un investitore americano).
 *    Senza conversione (USD deflazionato con ISTAT) il rendimento reale azionario
 *    1970-2024 risultava sottostimato di circa 2 punti l'anno.
 *
 * 2. ALLINEAMENTO PER ANNO. Le serie vengono ritagliate sulla finestra comune
 *    (`alignHistory`) e campionate congiuntamente: ogni anno simulato usa
 *    azioni, obbligazioni, oro e inflazione dello STESSO anno storico.
 */

import type { AnnualReturn } from './utils';
import { internationalReturns } from './international';
import { btpReturns } from './btp';
import { inflationITReturns } from './inflation-it';
import { sp500Returns } from './sp500';
import { bondReturns } from './bonds';
import { inflationUSReturns } from './inflation-us';
import { goldReturns } from './gold';
import { convertUsdReturnsToEur } from './fx';

export type SeriesPresetId = 'it-allworld' | 'it-default' | 'us-classic';

/** Asset class con serie storica propria */
export type HistoricalAsset = 'stocks' | 'bonds' | 'gold';

export interface SeriesPreset {
	id: SeriesPresetId;
	label: string;
	description: string;
	/** Valuta comune a TUTTE le serie del preset (rendimenti e inflazione) */
	currency: 'EUR' | 'USD';
	/** Serie annue in percentuale, con l'anno di calendario */
	series: Record<HistoricalAsset | 'inflation', AnnualReturn[]>;
}

/** Serie azionaria ex-USA convertita in lire/EUR (non coperta dal cambio) */
export const internationalReturnsEur = convertUsdReturnsToEur(internationalReturns);
/** Oro convertito in lire/EUR (non coperto dal cambio) */
export const goldReturnsEur = convertUsdReturnsToEur(goldReturns);

/** Preset IT-centric, tutto in lire/EUR */
export const SERIES_IT_DEFAULT: SeriesPreset = {
	id: 'it-default',
	label: 'Italiano in EUR (MSCI World ex-USA + BTP + ISTAT)',
	description:
		'Tutto in lire/euro: azioni MSCI World ex-USA (1970-2024) e oro convertiti da USD ' +
		'con i cambi storici (investitore non coperto), BTP 7-10y (1991-2024, stimati), ' +
		'inflazione ISTAT. Anni campionati congiuntamente sulla finestra comune.',
	currency: 'EUR',
	series: {
		stocks: internationalReturnsEur,
		bonds: btpReturns,
		gold: goldReturnsEur,
		inflation: inflationITReturns
	}
};

/** S&P 500 convertito in lire/EUR (non coperto dal cambio), 1970-2024 */
export const sp500ReturnsEur = convertUsdReturnsToEur(sp500Returns);

/**
 * Peso USA di default nel preset All-World: 70%, arrotondamento del peso USA
 * nell'MSCI World (factsheet MSCI World USD al 30/06/2026: 72,45%; MSCI World
 * EUR al 27/02/2026: 70,11%). E' il peso di OGGI, non quello storico.
 */
export const ALLWORLD_US_WEIGHT_DEFAULT = 0.7;

/**
 * Mix a peso FISSO ribilanciato ogni anno di due serie (percentuali), sugli anni
 * coperti da entrambe: r = w * r_A + (1 - w) * r_B.
 */
export function blendAnnualReturns(
	a: AnnualReturn[],
	b: AnnualReturn[],
	weightA: number
): AnnualReturn[] {
	const w = Math.min(1, Math.max(0, weightA));
	const mapB = new Map(b.map((r) => [r.year, r.value]));
	const out: AnnualReturn[] = [];
	for (const { year, value } of a) {
		const vb = mapB.get(year);
		if (vb === undefined) continue;
		out.push({ year, value: Math.round((w * value + (1 - w) * vb) * 1e4) / 1e4 });
	}
	return out;
}

/**
 * Preset "All-World in EUR": azioni globali come mix a peso fisso di S&P 500
 * (proxy degli USA) e MSCI World ex-USA, entrambi convertiti in lire/EUR coi
 * cambi storici, ribilanciato ogni anno; BTP, oro in EUR, inflazione ISTAT.
 *
 * Perche' a peso fisso: risponde a "come sarebbe andato un ETF con i pesi di
 * oggi". Non disponiamo di una serie verificata dei pesi storici di
 * capitalizzazione USA/ex-USA, e non la stimiamo.
 *
 * BIAS DICHIARATO: applicare il peso USA attuale (~70%) a tutto il 1970-2024
 * sovrappesa a posteriori il mercato che ha reso di piu' (gli USA erano tra il
 * ~30% e il ~65% del mondo sviluppato nel periodo). Il risultato e' quindi
 * tendenzialmente OTTIMISTA; il preset ex-USA e' all'opposto pessimista.
 * Conviene confrontare entrambi e provare un peso USA piu' basso (es. 50%).
 */
export function buildAllWorldEurPreset(usWeight = ALLWORLD_US_WEIGHT_DEFAULT): SeriesPreset {
	const w = Math.min(1, Math.max(0, usWeight));
	const pct = Math.round(w * 100);
	return {
		id: 'it-allworld',
		label: 'All-World in EUR (S&P 500 + MSCI World ex-USA + BTP + ISTAT)',
		description:
			`Azioni globali a peso fisso ${pct}% USA (S&P 500) / ${100 - pct}% resto del mondo ` +
			'(MSCI World ex-USA), ribilanciate ogni anno e convertite in lire/euro coi cambi ' +
			'storici (1970-2024); BTP 7-10y (1991-2024, stimati), oro in EUR, inflazione ISTAT. ' +
			"Peso USA di oggi applicato al passato: tendenzialmente ottimista, perche' gli USA " +
			"sono il mercato che ha reso di piu' (prova anche un peso piu' basso).",
		currency: 'EUR',
		series: {
			stocks: blendAnnualReturns(sp500ReturnsEur, internationalReturnsEur, w),
			bonds: btpReturns,
			gold: goldReturnsEur,
			inflation: inflationITReturns
		}
	};
}

/** Preset All-World col peso USA di default */
export const SERIES_IT_ALLWORLD: SeriesPreset = buildAllWorldEurPreset();

/** Preset US classic (S&P 500 + Treasury 10y + CPI USA), tutto in USD */
export const SERIES_US_CLASSIC: SeriesPreset = {
	id: 'us-classic',
	label: 'Bogleheads classico in USD (S&P 500 + Treasury + CPI USA)',
	description:
		'Tutto in dollari: S&P 500 e Treasury 10y (1928-2024), oro (1971-2024), CPI USA. ' +
		'Prospettiva di un investitore americano: utile per replicare gli studi USA (Trinity), ' +
		'non include il rischio cambio di chi spende in euro.',
	currency: 'USD',
	series: {
		stocks: sp500Returns,
		bonds: bondReturns,
		gold: goldReturns,
		inflation: inflationUSReturns
	}
};

export const ALL_SERIES_PRESETS: SeriesPreset[] = [
	SERIES_IT_ALLWORLD,
	SERIES_IT_DEFAULT,
	SERIES_US_CLASSIC
];

/**
 * Preset per id. `usWeight` vale solo per 'it-allworld' (peso USA, 0..1).
 * Id sconosciuti o mancanti (risultati salvati prima del preset All-World)
 * restano sul preset ex-USA, come prima.
 */
export function getSeriesPreset(
	id: SeriesPresetId | string | undefined,
	usWeight?: number
): SeriesPreset {
	if (id === 'us-classic') return SERIES_US_CLASSIC;
	if (id === 'it-allworld') {
		return usWeight === undefined || usWeight === ALLWORLD_US_WEIGHT_DEFAULT
			? SERIES_IT_ALLWORLD
			: buildAllWorldEurPreset(usWeight);
	}
	return SERIES_IT_DEFAULT;
}

/** Serie allineate per anno, in decimali (0.07 = 7%) */
export interface AlignedHistory {
	/** Anni di calendario della finestra comune (contigui) */
	years: number[];
	stocks: number[];
	bonds: number[];
	/** Vuoto se l'oro non e' richiesto e non copre la finestra */
	gold: number[];
	inflation: number[];
}

/**
 * Ritaglia le serie del preset sulla finestra di anni CONTIGUI coperta
 * dall'inflazione e da tutte le asset class richieste (quelle con allocazione > 0).
 * Le serie non richieste sono incluse solo se coprono l'intera finestra, altrimenti
 * restituite vuote (il motore usa il rendimento atteso, irrilevante se allocazione 0).
 */
export function alignHistory(preset: SeriesPreset, required: HistoricalAsset[]): AlignedHistory {
	const maps = {
		stocks: new Map(preset.series.stocks.map((r) => [r.year, r.value])),
		bonds: new Map(preset.series.bonds.map((r) => [r.year, r.value])),
		gold: new Map(preset.series.gold.map((r) => [r.year, r.value])),
		inflation: new Map(preset.series.inflation.map((r) => [r.year, r.value]))
	};
	const keys: (HistoricalAsset | 'inflation')[] = ['inflation', ...new Set(required)];
	const covered = (y: number) => keys.every((k) => maps[k].has(y));

	// Finestra contigua piu' lunga, a partire dall'anno piu' recente all'indietro
	const lastYear = Math.max(...preset.series.inflation.map((r) => r.year));
	let end = lastYear;
	while (end > 1800 && !covered(end)) end--;
	let start = end;
	while (covered(start - 1)) start--;
	const years: number[] = [];
	if (covered(end)) for (let y = start; y <= end; y++) years.push(y);

	const take = (k: HistoricalAsset | 'inflation') =>
		years.every((y) => maps[k].has(y)) ? years.map((y) => maps[k].get(y)! / 100) : [];

	return {
		years,
		stocks: take('stocks'),
		bonds: take('bonds'),
		gold: take('gold'),
		inflation: take('inflation')
	};
}
