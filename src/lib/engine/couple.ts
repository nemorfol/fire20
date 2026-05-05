/**
 * Logica di pianificazione FIRE per nucleo a due redditi: il coniuge / partner
 * ha IRPEF, INPS e pensione INPS proprie (la fiscalita' italiana non prevede
 * filing congiunto: ogni soggetto e' tassato individualmente). Le spese del
 * nucleo restano definite a livello di Profile.annualExpenses.
 *
 * Le funzioni qui sono "puramente additive" rispetto a `fire-calculator.ts`:
 * il chiamante somma il netto del coniuge ai contributi/redditi del nucleo
 * per ogni anno della proiezione.
 */

import type { Spouse } from '$lib/db/index';
import { calculateNetSalary } from './tax-italy';
import { DEFAULT_2026, type AssumptionSet } from './assumptions';

/** Cash flow annuale generato dal coniuge */
export interface SpouseYearlyCashFlow {
	/** Anno di calendario */
	year: number;
	/** Eta' del coniuge in questo anno */
	age: number;
	/** Reddito lordo da lavoro (gia' inflazionato) */
	grossSalary: number;
	/** Netto in busta paga (post-IRPEF + addizionali + INPS) */
	netSalary: number;
	/** IRPEF totale del coniuge (irpef + addizionali) */
	irpef: number;
	/** INPS lavoratore del coniuge */
	inps: number;
	/** Pensione INPS lorda dell'anno (0 se non ancora attiva) */
	pensionGross: number;
	/** Tassa IRPEF sulla pensione (separata dal reddito da lavoro: si somma poi) */
	pensionIrpef: number;
	/** Pensione netta */
	pensionNet: number;
	/** Contributo al fondo pensione (deducibile, riduce IRPEF) */
	pensionFundContribution: number;
	/** Indica se il coniuge e' in fase pensionata in questo anno */
	isRetired: boolean;
}

/**
 * Calcola il cash flow annuale del coniuge per un singolo anno.
 *
 * @param spouse - Profilo del coniuge
 * @param calendarYear - Anno di calendario
 * @param baseYear - Anno iniziale della simulazione
 * @param inflationRate - Tasso di inflazione annuale (per indicizzare reddito + pensione)
 * @param regionalRate - Aliquota regionale (default da assumptions)
 * @param municipalRate - Aliquota comunale (default da assumptions)
 * @param assumptions - Set fiscale (default 2026)
 */
export function spouseYearlyCashFlow(
	spouse: Spouse,
	calendarYear: number,
	baseYear: number,
	inflationRate: number,
	regionalRate: number = DEFAULT_2026.surtaxes.regional,
	municipalRate: number = DEFAULT_2026.surtaxes.municipal,
	assumptions: AssumptionSet = DEFAULT_2026
): SpouseYearlyCashFlow {
	const yearsFromBase = Math.max(0, calendarYear - baseYear);
	const age = calendarYear - spouse.birthYear;
	const isRetired = age >= spouse.retirementAge;

	// Indicizzazione: reddito cresce con incomeGrowthRate (reale) + inflazione
	const realGrowth = Math.pow(1 + spouse.incomeGrowthRate, yearsFromBase);
	const inflationFactor = Math.pow(1 + inflationRate, yearsFromBase);
	const grossSalary = isRetired ? 0 : spouse.annualIncome * realGrowth * inflationFactor;

	// Contributo deducibile al fondo pensione: lo sottraiamo dall'imponibile
	// (entro il tetto di assumptions.pensionFund.maxDeduction)
	const pensionFundContribution = Math.min(
		Math.max(0, spouse.pensionFundContribution || 0) * inflationFactor,
		assumptions.pensionFund.maxDeduction * inflationFactor
	);

	// Busta paga: applichiamo INPS + IRPEF + addizionali sul reddito imponibile
	// post-deduzione fondo pensione.
	let netSalary = 0;
	let irpef = 0;
	let inps = 0;
	if (grossSalary > 0) {
		const taxableForBreakdown = Math.max(0, grossSalary - pensionFundContribution);
		const breakdown = calculateNetSalary(
			taxableForBreakdown,
			spouse.contractType,
			regionalRate,
			municipalRate,
			assumptions
		);
		netSalary = breakdown.net + (grossSalary - taxableForBreakdown);
		// L'eccesso (= contributo fondo pensione) finisce comunque al fondo, NON
		// in busta. Quindi il netto in mano al coniuge e' breakdown.net (taxable
		// dopo deduzione). Ma per il nucleo il "flusso disponibile" e':
		//   netto_busta = breakdown.net  (capitale disponibile)
		//   contributo fondo = pensionFundContribution  (immobilizzato in fondo)
		// Modelliamo netSalary = breakdown.net (eccessi sono "investiti", non spendibili).
		netSalary = breakdown.net;
		irpef = breakdown.totalTax;
		inps = breakdown.inpsContribution;
	}

	// Pensione INPS del coniuge: attiva da spouse.pensionAge
	let pensionGross = 0;
	let pensionIrpef = 0;
	let pensionNet = 0;
	if (age >= spouse.pensionAge && spouse.pensionMonthly > 0) {
		// 13 mensilita' indicizzate
		pensionGross = spouse.pensionMonthly * 13 * inflationFactor;
		// La pensione e' tassata IRPEF (no INPS, no addizionali ridotte: per
		// semplicita' applichiamo IRPEF + addizionali piene)
		const breakdown = calculateNetSalary(
			pensionGross,
			'dipendente',
			regionalRate,
			municipalRate,
			assumptions
		);
		pensionIrpef = breakdown.totalTax;
		// La pensione NON paga INPS, quindi il netto e' gross - irpef (no inps)
		pensionNet = pensionGross - pensionIrpef;
	}

	return {
		year: calendarYear,
		age,
		grossSalary: Math.round(grossSalary),
		netSalary: Math.round(netSalary),
		irpef: Math.round(irpef),
		inps: Math.round(inps),
		pensionGross: Math.round(pensionGross),
		pensionIrpef: Math.round(pensionIrpef),
		pensionNet: Math.round(pensionNet),
		pensionFundContribution: Math.round(pensionFundContribution),
		isRetired
	};
}

/**
 * Reddito netto totale del coniuge in un anno (somma di netSalary + pensionNet).
 * Usato dal projectPortfolio per aggiungere al flusso di nucleo.
 */
export function spouseAnnualNetIncome(
	spouse: Spouse,
	calendarYear: number,
	baseYear: number,
	inflationRate: number,
	regionalRate?: number,
	municipalRate?: number,
	assumptions: AssumptionSet = DEFAULT_2026
): number {
	const cf = spouseYearlyCashFlow(
		spouse,
		calendarYear,
		baseYear,
		inflationRate,
		regionalRate,
		municipalRate,
		assumptions
	);
	return cf.netSalary + cf.pensionNet;
}
