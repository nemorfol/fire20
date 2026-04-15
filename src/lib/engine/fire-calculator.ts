/**
 * Modulo di calcolo FIRE (Financial Independence Retire Early).
 * Contiene le funzioni principali per il calcolo del numero FIRE,
 * proiezioni del portafoglio e metriche correlate.
 */

import { calculateWithdrawal } from './withdrawal';

/** Proiezione anno per anno del portafoglio */
export interface YearlyProjection {
	/** Anno di calendario */
	year: number;
	/** Età dell'utente */
	age: number;
	/** Valore del portafoglio a fine anno */
	portfolio: number;
	/** Contributi versati nell'anno */
	contributions: number;
	/** Prelievi effettuati nell'anno */
	withdrawals: number;
	/** Rendimenti ottenuti nell'anno */
	returns: number;
	/** Tasse pagate nell'anno */
	taxes: number;
	/** Patrimonio netto totale */
	netWorth: number;
}

/** Parametri per la proiezione deterministica del portafoglio */
export interface ProjectionParams {
	/** Portafoglio iniziale */
	initialPortfolio: number;
	/** Contributo annuale (durante accumulazione) */
	annualContribution: number;
	/** Spese annuali (in pensione) */
	annualExpenses: number;
	/** Rendimento atteso annuale (es. 0.07 per 7%) */
	expectedReturn: number;
	/** Tasso di inflazione annuale (es. 0.02 per 2%) */
	inflationRate: number;
	/** Aliquota fiscale media sui rendimenti (es. 0.26) */
	taxRate: number;
	/** Tasso di prelievo (es. 0.04 per 4%) */
	withdrawalRate: number;
	/** Strategia di prelievo */
	withdrawalStrategy?: 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based';
	/** Età attuale */
	currentAge: number;
	/** Età di pensionamento FIRE */
	retirementAge: number;
	/** Aspettativa di vita */
	lifeExpectancy: number;
	/** Anno di calendario iniziale */
	startYear: number;
}

/**
 * Calcola il numero FIRE: il patrimonio necessario per raggiungere
 * l'indipendenza finanziaria.
 *
 * Formula: spese_annuali / tasso_di_prelievo
 *
 * @param annualExpenses - Spese annuali previste in pensione
 * @param withdrawalRate - Tasso di prelievo sicuro (es. 0.04 per la regola del 4%)
 * @returns Il numero FIRE necessario
 */
export function calculateFireNumber(annualExpenses: number, withdrawalRate: number): number {
	if (withdrawalRate <= 0) return Infinity;
	if (annualExpenses <= 0) return 0;
	return annualExpenses / withdrawalRate;
}

/**
 * Calcola gli anni necessari per raggiungere il numero FIRE
 * tramite iterazione anno per anno con interesse composto.
 *
 * @param currentPortfolio - Portafoglio attuale
 * @param annualSavings - Risparmio annuale
 * @param expectedReturn - Rendimento atteso annuale (es. 0.07)
 * @param fireNumber - Il numero FIRE target
 * @returns Numero di anni per raggiungere il FIRE, -1 se irraggiungibile
 */
export function calculateYearsToFire(
	currentPortfolio: number,
	annualSavings: number,
	expectedReturn: number,
	fireNumber: number
): number {
	if (currentPortfolio >= fireNumber) return 0;
	if (annualSavings <= 0 && expectedReturn <= 0) return -1;

	let portfolio = currentPortfolio;
	const maxYears = 100;

	for (let year = 1; year <= maxYears; year++) {
		portfolio = portfolio * (1 + expectedReturn) + annualSavings;
		if (portfolio >= fireNumber) return year;
	}

	return -1; // Irraggiungibile entro 100 anni
}

/**
 * Calcola il tasso di risparmio.
 *
 * @param income - Reddito annuale
 * @param expenses - Spese annuali
 * @returns Tasso di risparmio come percentuale (0..1)
 */
export function calculateSavingsRate(income: number, expenses: number): number {
	if (income <= 0) return 0;
	const rate = (income - expenses) / income;
	return Math.max(0, Math.min(1, rate));
}

/**
 * Calcola il patrimonio netto sommando tutti gli asset del portafoglio.
 *
 * @param portfolio - Oggetto con le allocazioni del portafoglio
 * @returns Somma totale del patrimonio
 */
export function calculateNetWorth(portfolio: Record<string, number>): number {
	return Object.values(portfolio).reduce((sum, value) => sum + (value || 0), 0);
}

/**
 * Genera una proiezione deterministica anno per anno del portafoglio.
 * Include fase di accumulazione e fase di decumulo.
 *
 * @param params - Parametri della proiezione
 * @returns Array di proiezioni annuali
 */
export function projectPortfolio(params: ProjectionParams): YearlyProjection[] {
	const {
		initialPortfolio,
		annualContribution,
		annualExpenses,
		expectedReturn,
		inflationRate,
		taxRate,
		withdrawalRate,
		withdrawalStrategy = 'fixed',
		currentAge,
		retirementAge,
		lifeExpectancy,
		startYear
	} = params;

	const totalYears = lifeExpectancy - currentAge;
	if (totalYears <= 0) return [];

	const projections: YearlyProjection[] = [];
	let portfolio = initialPortfolio;
	let retirementPortfolio = 0; // portafoglio al momento del pensionamento
	let previousWithdrawal = 0;
	let retirementYear = 0; // anno (0-based) di inizio pensione

	for (let i = 0; i < totalYears; i++) {
		const age = currentAge + i + 1;
		const year = startYear + i + 1;
		const isRetired = age > retirementAge;

		// Contributi (solo in fase di accumulazione)
		const contributions = isRetired ? 0 : annualContribution;

		// Prelievi (solo in fase di decumulo)
		let actualWithdrawals = 0;
		if (isRetired) {
			// Salva il portafoglio al primo anno di pensione
			if (retirementPortfolio === 0) {
				retirementPortfolio = portfolio;
				retirementYear = i;
			}
			const yearsSinceRetirement = i - retirementYear;

			actualWithdrawals = calculateWithdrawal(withdrawalStrategy, {
				initialPortfolio: retirementPortfolio,
				portfolio,
				rate: withdrawalRate,
				inflationRate,
				year: yearsSinceRetirement,
				age,
				lifeExpectancy,
				guytonKlinger: withdrawalStrategy === 'guyton-klinger' ? {
					portfolio,
					initialWithdrawal: retirementPortfolio * withdrawalRate,
					initialRate: withdrawalRate,
					inflationRate,
					year: yearsSinceRetirement,
					previousWithdrawal: previousWithdrawal || retirementPortfolio * withdrawalRate
				} : undefined
			});
			previousWithdrawal = actualWithdrawals;
		}

		// Rendimenti lordi
		const grossReturns = (portfolio + contributions) * expectedReturn;

		// Tasse sui rendimenti (solo se positivi)
		const taxes = grossReturns > 0 ? grossReturns * taxRate : 0;

		// Rendimenti netti
		const netReturns = grossReturns - taxes;

		// Aggiorna portafoglio
		portfolio = portfolio + contributions + netReturns - actualWithdrawals;

		// Il portafoglio non può essere negativo (si è esaurito)
		if (portfolio < 0) portfolio = 0;

		projections.push({
			year,
			age,
			portfolio,
			contributions,
			withdrawals: actualWithdrawals,
			returns: netReturns,
			taxes,
			netWorth: portfolio
		});
	}

	return projections;
}

/**
 * Calcola il numero Coast FIRE: il patrimonio necessario oggi
 * per poter smettere di contribuire e raggiungere comunque il FIRE
 * al momento del pensionamento grazie all'interesse composto.
 *
 * Formula: fireNumber / (1 + expectedReturn)^(retirementAge - currentAge)
 *
 * @param currentAge - Età attuale
 * @param retirementAge - Età di pensionamento target
 * @param fireNumber - Il numero FIRE target
 * @param expectedReturn - Rendimento atteso annuale (es. 0.07)
 * @returns Il patrimonio minimo necessario oggi per il Coast FIRE
 */
export function calculateCoastFireNumber(
	currentAge: number,
	retirementAge: number,
	fireNumber: number,
	expectedReturn: number
): number {
	const years = retirementAge - currentAge;
	if (years <= 0) return fireNumber;
	if (expectedReturn <= -1) return Infinity;
	return fireNumber / Math.pow(1 + expectedReturn, years);
}
