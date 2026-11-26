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
import { msciWorldReturns } from './msci-world';
import { convertUsdReturnsToEur } from './fx';

export type SeriesPresetId = 'it-world' | 'it-allworld' | 'it-default' | 'us-classic';

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
		'Tutto in lire/euro: azioni MSCI World ex-USA (1970-2025) e oro convertiti da USD ' +
		'con i cambi storici (investitore non coperto), BTP ~10 anni (1970-2020 misurati JST, ' +
		'2021-2025 stima/proxy ETF), ' +
		'inflazione ISTAT. Anni campionati congiuntamente sulla finestra comune.',
	currency: 'EUR',
	series: {
		stocks: internationalReturnsEur,
		bonds: btpReturns,
		gold: goldReturnsEur,
		inflation: inflationITReturns
	}
};

/** S&P 500 convertito in lire/EUR (non coperto dal cambio), 1970-2025 */
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
		label: 'Mix USA/resto del mondo a peso fisso in EUR + BTP + ISTAT',
		description:
			`Azioni globali a peso fisso ${pct}% USA (S&P 500) / ${100 - pct}% resto del mondo ` +
			'(MSCI World ex-USA), ribilanciate ogni anno e convertite in lire/euro coi cambi ' +
			'storici (1970-2025); BTP ~10 anni (JST dal 1970), oro in EUR, inflazione ISTAT. ' +
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

/** MSCI World (lordo, USD) convertito in lire/EUR, non coperto dal cambio */
export const msciWorldReturnsEur = convertUsdReturnsToEur(msciWorldReturns);

/**
 * Preset predefinito "MSCI World in EUR": l'indice MSCI World vero, pesato per
 * capitalizzazione, quindi con il peso USA STORICO di ogni anno (nessun peso
 * scelto col senno di poi). Convertito in lire/EUR coi cambi storici, con BTP,
 * oro in EUR e inflazione ISTAT come gli altri preset italiani.
 */
export const SERIES_IT_WORLD: SeriesPreset = {
	id: 'it-world',
	label: 'MSCI World in EUR (pesi storici) + BTP + ISTAT',
	description:
		"Azioni: indice MSCI World (rendimento lordo, pesato per capitalizzazione: il peso USA e' " +
		"quello storico di ogni anno, ~2/3 negli anni '70, ~1/3 a fine anni '80, ~72% oggi), " +
		"convertito in lire/euro coi cambi storici (1970-2025). Prima del 1986 e' un back-test MSCI. " +
		'BTP ~10 anni (1970-2020 misurati JST, poi stima/proxy ETF), oro in EUR, inflazione ISTAT.',
	currency: 'EUR',
	series: {
		stocks: msciWorldReturnsEur,
		bonds: btpReturns,
		gold: goldReturnsEur,
		inflation: inflationITReturns
	}
};

/** Preset US classic (S&P 500 + Treasury 10y + CPI USA), tutto in USD */
export const SERIES_US_CLASSIC: SeriesPreset = {
	id: 'us-classic',
	label: 'Bogleheads classico in USD (S&P 500 + Treasury + CPI USA)',
	description:
		'Tutto in dollari: S&P 500 e Treasury 10y (1928-2025), oro (1971-2025), CPI USA. ' +
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
	SERIES_IT_WORLD,
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
	if (id === 'it-world') return SERIES_IT_WORLD;
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
export function alignHistory(
	preset: SeriesPreset,
	required: HistoricalAsset[],
	/** Primo anno ammesso (verifica per sottoperiodi): es. 1999 = solo era euro */
	fromYear?: number
): AlignedHistory {
	const maps = {
		stocks: new Map(preset.series.stocks.map((r) => [r.year, r.value])),
		bonds: new Map(preset.series.bonds.map((r) => [r.year, r.value])),
		gold: new Map(preset.series.gold.map((r) => [r.year, r.value])),
		inflation: new Map(preset.series.inflation.map((r) => [r.year, r.value]))
	};
	const keys: (HistoricalAsset | 'inflation')[] = ['inflation', ...new Set(required)];
	const covered = (y: number) =>
		(fromYear === undefined || y >= fromYear) && keys.every((k) => maps[k].has(y));

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

/** Obiettivi di rendimento REALE medio (decimali, aritmetici) per asset class */
export type RealReturnTargets = Partial<Record<HistoricalAsset, number>>;

/** Media aritmetica dei rendimenti reali (1+r)/(1+pi)-1 di una serie allineata */
export function meanRealReturn(nominal: number[], inflation: number[]): number {
	if (nominal.length === 0 || nominal.length !== inflation.length) return 0;
	let s = 0;
	for (let i = 0; i < nominal.length; i++) s += (1 + nominal[i]) / (1 + inflation[i]) - 1;
	return s / nominal.length;
}

/**
 * Bootstrap storico "ricentrato" (ipotesi dichiarate + shock storici).
 *
 * Per ogni asset class con obiettivo, riscala il rendimento reale lordo di ogni
 * anno storico in modo che la MEDIA aritmetica del rendimento reale sia pari
 * all'obiettivo dichiarato dall'utente:
 *
 *   g_t = (1 + r_t) / (1 + pi_t)          rendimento reale lordo dell'anno t
 *   g'_t = g_t * (1 + m*) / mean(g)       stessa forma, media spostata su m*
 *   r'_t = g'_t * (1 + pi_t) - 1          di nuovo nominale, stessa inflazione
 *
 * La trasformazione e' moltiplicativa: conserva la forma della distribuzione
 * (code grasse, crolli, sequenze di anni negativi), la volatilita' relativa,
 * l'inflazione dell'anno e quindi le correlazioni tra asset e inflazione. Cambia
 * solo il livello medio, che smette di essere "quello che e' successo" e
 * diventa un'ipotesi esplicita sul futuro (risposta alla critica "lo storico
 * non e' una previsione"). Non altera le serie non indicate in `targets`.
 */
export function recenterHistory(h: AlignedHistory, targets: RealReturnTargets): AlignedHistory {
	const recenter = (series: number[], target: number | undefined): number[] => {
		if (target === undefined || series.length === 0 || series.length !== h.inflation.length) {
			return series;
		}
		const meanGross = 1 + meanRealReturn(series, h.inflation);
		if (!(meanGross > 0)) return series;
		const k = (1 + target) / meanGross;
		// g'_t * (1 + pi_t) = (1 + r_t) * k: basta riscalare il lordo nominale.
		// Floor a -99%: il motore richiede rendimenti > -100%.
		return series.map((r) => Math.max(-0.99, (1 + r) * k - 1));
	};
	return {
		...h,
		stocks: recenter(h.stocks, targets.stocks),
		bonds: recenter(h.bonds, targets.bonds),
		gold: recenter(h.gold, targets.gold)
	};
}

/**
 * Finestre per la verifica di robustezza: lo stesso piano simulato su periodi
 * storici diversi. Se il successo cambia molto, il risultato dipende dal
 * periodo scelto (e va letto con prudenza).
 */
export const ROBUSTNESS_WINDOWS: { fromYear?: number; label: string }[] = [
	{ label: 'Tutto lo storico disponibile' },
	{ fromYear: 1991, label: 'Dal 1991' },
	{ fromYear: 1999, label: "Dal 1999 (solo era dell'euro)" }
];
