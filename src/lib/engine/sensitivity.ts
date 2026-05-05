/**
 * Sensitivity analysis (tornado chart) per il piano FIRE.
 *
 * Idea: per ogni variabile chiave (rendimento atteso, inflazione, spese,
 * contributo, eta' di pensionamento, withdrawal rate, allocazione equity)
 * applichiamo un range -X% / +X% rispetto al baseline e misuriamo l'impatto
 * sulla metrica di interesse. Risultato: un array ordinato per ampiezza
 * dell'impatto, da plottare come "tornado chart" (la barra piu' lunga in
 * alto = la variabile piu' influente).
 *
 * Filosofia trasparenza: l'utente non deve fidarsi di una "probabilita' di
 * successo" che esce da Monte Carlo a scatola chiusa: deve poter VEDERE
 * quale leva sposta l'ago. Se +1% di rendimento atteso aggiunge 8 anni di
 * sostenibilita' al portafoglio, e' un'informazione critica.
 */

import { projectPortfolio, type ProjectionParams, type YearlyProjection } from './fire-calculator';

/** Una metrica calcolata da una proiezione */
export type ProjectionMetric =
	| 'finalPortfolio'
	| 'depletionAge'
	| 'cumulativeWithdrawals'
	| 'minPortfolio';

/** Risultato sensitivity per una singola variabile */
export interface SensitivityResult {
	/** Nome leggibile della variabile */
	variable: string;
	/** Identificatore della variabile (per filtri UI) */
	variableId: string;
	/** Valore baseline della variabile */
	baseline: number;
	/** Valore della variabile dopo shock negativo */
	low: number;
	/** Valore della variabile dopo shock positivo */
	high: number;
	/** Metrica al baseline */
	baselineMetric: number;
	/** Metrica con shock negativo */
	lowMetric: number;
	/** Metrica con shock positivo */
	highMetric: number;
	/** Ampiezza dell'impatto (highMetric - lowMetric, segno secondo direzione) */
	impact: number;
	/** Variabile favorisce la metrica (true) o la peggiora (false) quando aumenta */
	positiveImpact: boolean;
}

/** Estrai una metrica da una proiezione */
function extractMetric(projection: YearlyProjection[], metric: ProjectionMetric): number {
	if (projection.length === 0) return 0;
	switch (metric) {
		case 'finalPortfolio':
			return projection[projection.length - 1].portfolio;
		case 'depletionAge': {
			// Eta' a cui il portafoglio raggiunge 0 per la prima volta. Se non
			// si esaurisce, restituisce -1 (codifica "mai").
			const found = projection.find((p) => p.portfolio <= 1);
			return found ? found.age : -1;
		}
		case 'cumulativeWithdrawals':
			return projection.reduce((sum, p) => sum + (p.withdrawals || 0), 0);
		case 'minPortfolio':
			return Math.min(...projection.map((p) => p.portfolio));
	}
}

/** Configurazione di una variabile da testare nel tornado */
export interface SensitivityVariable {
	id: string;
	label: string;
	/** Funzione che modifica i params applicando un delta percentuale (-0.1, +0.1) */
	apply: (params: ProjectionParams, multiplier: number) => ProjectionParams;
	/** Valore baseline da mostrare (estratto dai params) */
	baseline: (params: ProjectionParams) => number;
	/** Direzione: se aumentare la variabile favorisce la metrica (true) o la peggiora (false) */
	positiveImpact: boolean;
}

/** Insieme delle variabili "default" da plottare nel tornado FIRE classico */
export const DEFAULT_FIRE_VARIABLES: SensitivityVariable[] = [
	{
		id: 'expectedReturn',
		label: 'Rendimento atteso',
		baseline: (p) => p.expectedReturn,
		apply: (p, m) => ({ ...p, expectedReturn: p.expectedReturn * (1 + m) }),
		positiveImpact: true
	},
	{
		id: 'inflationRate',
		label: 'Inflazione',
		baseline: (p) => p.inflationRate,
		apply: (p, m) => ({ ...p, inflationRate: p.inflationRate * (1 + m) }),
		positiveImpact: false
	},
	{
		id: 'annualExpenses',
		label: 'Spese annuali',
		baseline: (p) => p.annualExpenses,
		apply: (p, m) => ({ ...p, annualExpenses: p.annualExpenses * (1 + m) }),
		positiveImpact: false
	},
	{
		id: 'annualContribution',
		label: 'Contributo annuo',
		baseline: (p) => p.annualContribution,
		apply: (p, m) => ({ ...p, annualContribution: p.annualContribution * (1 + m) }),
		positiveImpact: true
	},
	{
		id: 'taxRate',
		label: 'Aliquota fiscale rendimenti',
		baseline: (p) => p.taxRate,
		apply: (p, m) => ({ ...p, taxRate: Math.min(0.5, Math.max(0, p.taxRate * (1 + m))) }),
		positiveImpact: false
	},
	{
		id: 'retirementAge',
		label: 'Eta\' pensione FIRE',
		baseline: (p) => p.retirementAge,
		apply: (p, m) => ({ ...p, retirementAge: Math.round(p.retirementAge * (1 + m)) }),
		positiveImpact: true
	},
	{
		id: 'withdrawalRate',
		label: 'Tasso prelievo (SWR)',
		baseline: (p) => p.withdrawalRate,
		apply: (p, m) => ({ ...p, withdrawalRate: p.withdrawalRate * (1 + m) }),
		positiveImpact: false
	}
];

/**
 * Esegue una sensitivity analysis sul `projectPortfolio` per un set di
 * variabili. Per ognuna applica un delta -shock% / +shock% e misura
 * l'impatto su `metric`.
 *
 * @param baseParams - Parametri baseline
 * @param variables - Variabili da testare (default: DEFAULT_FIRE_VARIABLES)
 * @param shock - Ampiezza dello shock (default 0.1 = ±10%)
 * @param metric - Metrica da estrarre (default: finalPortfolio)
 * @returns Array ordinato per ampiezza decrescente di impatto
 */
export function runSensitivity(
	baseParams: ProjectionParams,
	variables: SensitivityVariable[] = DEFAULT_FIRE_VARIABLES,
	shock: number = 0.1,
	metric: ProjectionMetric = 'finalPortfolio'
): SensitivityResult[] {
	const baseline = projectPortfolio(baseParams);
	const baselineMetric = extractMetric(baseline, metric);

	const results: SensitivityResult[] = variables.map((v) => {
		const lowParams = v.apply(baseParams, -shock);
		const highParams = v.apply(baseParams, +shock);
		const lowProjection = projectPortfolio(lowParams);
		const highProjection = projectPortfolio(highParams);
		const lowMetric = extractMetric(lowProjection, metric);
		const highMetric = extractMetric(highProjection, metric);
		return {
			variable: v.label,
			variableId: v.id,
			baseline: v.baseline(baseParams),
			low: v.baseline(lowParams),
			high: v.baseline(highParams),
			baselineMetric,
			lowMetric,
			highMetric,
			impact: Math.abs(highMetric - lowMetric),
			positiveImpact: v.positiveImpact
		};
	});

	return results.sort((a, b) => b.impact - a.impact);
}
