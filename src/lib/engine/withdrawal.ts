/**
 * Strategie di prelievo per la fase di decumulo FIRE.
 * Implementa quattro strategie: regola fissa, VPW, Guyton-Klinger, CAPE-based.
 */

/** Parametri per il prelievo Guyton-Klinger */
export interface GuytonKlingerParams {
	/** Portafoglio attuale */
	portfolio: number;
	/** Prelievo iniziale (anno 0) */
	initialWithdrawal: number;
	/** Tasso di prelievo iniziale (es. 0.04) */
	initialRate: number;
	/** Tasso di inflazione annuale */
	inflationRate: number;
	/** Anno corrente dalla pensione (0-based) */
	year: number;
	/** Prelievo dell'anno precedente */
	previousWithdrawal: number;
}

/** Parametri unificati per la funzione di dispatching */
export interface WithdrawalParams {
	/** Portafoglio iniziale (per strategia fixed) */
	initialPortfolio?: number;
	/** Portafoglio corrente */
	portfolio: number;
	/** Tasso di prelievo (es. 0.04) */
	rate?: number;
	/** Tasso di inflazione */
	inflationRate?: number;
	/** Anno dalla pensione */
	year?: number;
	/** Età dell'utente */
	age?: number;
	/** Aspettativa di vita */
	lifeExpectancy?: number;
	/** Parametri Guyton-Klinger */
	guytonKlinger?: GuytonKlingerParams;
	/** Rapporto CAPE corrente */
	capeRatio?: number;
}

/**
 * Tabella VPW (Variable Percentage Withdrawal).
 * Percentuali di prelievo basate sull'età, derivate da tavole attuariali.
 * I valori intermedi vengono interpolati linearmente.
 */
const VPW_TABLE: [number, number][] = [
	[40, 0.033],
	[45, 0.036],
	[50, 0.040],
	[55, 0.045],
	[60, 0.052],
	[65, 0.063],
	[70, 0.075],
	[75, 0.090],
	[80, 0.110],
	[85, 0.140],
	[90, 0.180],
	[95, 0.250]
];

/**
 * Prelievo a tasso fisso (regola del 4%).
 * Il prelievo iniziale è calcolato come percentuale del portafoglio iniziale,
 * poi aggiustato ogni anno per l'inflazione.
 *
 * Formula: portafoglio_iniziale * tasso * (1 + inflazione)^anno
 *
 * @param initialPortfolio - Portafoglio al momento del pensionamento
 * @param rate - Tasso di prelievo (es. 0.04)
 * @param inflation - Tasso di inflazione annuale (es. 0.02)
 * @param year - Anno dalla pensione (0 = primo anno)
 * @returns Importo del prelievo annuale
 */
export function fixedWithdrawal(
	initialPortfolio: number,
	rate: number,
	inflation: number,
	year: number
): number {
	if (initialPortfolio <= 0 || rate <= 0) return 0;
	return initialPortfolio * rate * Math.pow(1 + inflation, year);
}

/**
 * Prelievo VPW (Variable Percentage Withdrawal).
 * La percentuale di prelievo aumenta con l'età basandosi su tavole attuariali.
 * Usa interpolazione lineare per le età intermedie.
 *
 * @param portfolio - Portafoglio corrente
 * @param age - Età dell'utente
 * @param _lifeExpectancy - Aspettativa di vita (usata per aggiustamento)
 * @returns Importo del prelievo annuale
 */
export function vpwWithdrawal(
	portfolio: number,
	age: number,
	_lifeExpectancy: number
): number {
	if (portfolio <= 0) return 0;
	if (age < VPW_TABLE[0][0]) return portfolio * VPW_TABLE[0][1];
	if (age >= VPW_TABLE[VPW_TABLE.length - 1][0]) {
		return portfolio * VPW_TABLE[VPW_TABLE.length - 1][1];
	}

	// Interpolazione lineare tra i punti della tabella
	for (let i = 0; i < VPW_TABLE.length - 1; i++) {
		const [age1, rate1] = VPW_TABLE[i];
		const [age2, rate2] = VPW_TABLE[i + 1];
		if (age >= age1 && age < age2) {
			const fraction = (age - age1) / (age2 - age1);
			const rate = rate1 + fraction * (rate2 - rate1);
			return portfolio * rate;
		}
	}

	return portfolio * VPW_TABLE[VPW_TABLE.length - 1][1];
}

/**
 * Prelievo con strategia Guyton-Klinger (Guardrails).
 * Il prelievo base viene aggiustato per l'inflazione, ma con guardrail:
 * - Se il tasso di prelievo corrente supera il 120% del tasso iniziale, taglia del 10%
 * - Se il tasso di prelievo corrente è sotto l'80% del tasso iniziale, aumenta del 10%
 *
 * @param params - Parametri Guyton-Klinger
 * @returns Importo del prelievo annuale aggiustato
 */
export function guytonKlingerWithdrawal(params: GuytonKlingerParams): number {
	const {
		portfolio,
		initialWithdrawal,
		initialRate,
		inflationRate,
		year,
		previousWithdrawal
	} = params;

	if (portfolio <= 0) return 0;

	// Anno 0: prelievo iniziale
	if (year === 0) return initialWithdrawal;

	// Prelievo base: precedente aggiustato per inflazione
	let withdrawal = previousWithdrawal * (1 + inflationRate);

	// Calcola il tasso di prelievo corrente
	const currentRate = withdrawal / portfolio;

	// Guardrail superiore: se il tasso è troppo alto, taglia del 10%
	if (currentRate > initialRate * 1.2) {
		withdrawal *= 0.9;
	}

	// Guardrail inferiore: se il tasso è troppo basso, aumenta del 10%
	if (currentRate < initialRate * 0.8) {
		withdrawal *= 1.1;
	}

	return Math.max(0, withdrawal);
}

/**
 * Prelievo basato sul rapporto CAPE (Cyclically Adjusted Price-to-Earnings).
 * Il tasso di prelievo si adatta alle valutazioni di mercato.
 *
 * Formula: portafoglio * (0.02 + 0.5 / CAPE)
 *
 * @param portfolio - Portafoglio corrente
 * @param capeRatio - Rapporto CAPE corrente (es. 25-35 per mercato USA)
 * @returns Importo del prelievo annuale
 */
export function capeBasedWithdrawal(portfolio: number, capeRatio: number): number {
	if (portfolio <= 0) return 0;
	if (capeRatio <= 0) return portfolio * 0.02; // Fallback al minimo
	return portfolio * (0.02 + 0.5 / capeRatio);
}

/**
 * Funzione unificata per calcolare il prelievo in base alla strategia scelta.
 * Dispatcha alla funzione appropriata.
 *
 * @param strategy - Tipo di strategia ('fixed' | 'vpw' | 'guyton-klinger' | 'cape-based')
 * @param params - Parametri del prelievo
 * @returns Importo del prelievo annuale
 */
export function calculateWithdrawal(
	strategy: 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based',
	params: WithdrawalParams
): number {
	switch (strategy) {
		case 'fixed':
			return fixedWithdrawal(
				params.initialPortfolio ?? params.portfolio,
				params.rate ?? 0.04,
				params.inflationRate ?? 0.02,
				params.year ?? 0
			);

		case 'vpw':
			return vpwWithdrawal(
				params.portfolio,
				params.age ?? 65,
				params.lifeExpectancy ?? 90
			);

		case 'guyton-klinger':
			if (params.guytonKlinger) {
				return guytonKlingerWithdrawal(params.guytonKlinger);
			}
			// Fallback: usa i parametri disponibili come fixed
			return fixedWithdrawal(
				params.initialPortfolio ?? params.portfolio,
				params.rate ?? 0.04,
				params.inflationRate ?? 0.02,
				params.year ?? 0
			);

		case 'cape-based':
			return capeBasedWithdrawal(
				params.portfolio,
				params.capeRatio ?? 25
			);

		default:
			return fixedWithdrawal(
				params.initialPortfolio ?? params.portfolio,
				params.rate ?? 0.04,
				params.inflationRate ?? 0.02,
				params.year ?? 0
			);
	}
}
