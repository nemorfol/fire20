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
	/** Reddito pensionistico nell'anno */
	pensionIncome?: number;
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
	/** Pensione INPS annua lorda (13 mensilita) */
	annualPension?: number;
	/** Eta' di accesso alla pensione INPS */
	pensionAge?: number;
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
 * Calcola il numero FIRE tenendo conto della pensione INPS che arriva solo
 * a una certa eta' (es. 67 anni), diversa dall'eta' di pensionamento FIRE.
 *
 * Se il FIRE avviene PRIMA della pensione INPS, il portafoglio deve coprire:
 * - "Bridge years" con spese piene (eta' FIRE → eta' pensione INPS)
 * - Anni post-pensione INPS con spese ridotte della pensione
 *
 * Il calcolo usa il valore attuale (PV) delle due rendite scontate al rendimento
 * reale, per restituire un capitale necessario oggi (euro di oggi).
 *
 * @returns Il numero FIRE necessario, oppure quello classico se non c'e' pensione
 */
export function calculateFireNumberWithPension(params: {
	annualExpenses: number;
	withdrawalRate: number;
	annualPension?: number;
	retirementAge: number;
	pensionAge: number;
	lifeExpectancy: number;
	realReturn?: number;
}): number {
	const {
		annualExpenses,
		withdrawalRate,
		annualPension = 0,
		retirementAge,
		pensionAge,
		lifeExpectancy,
		realReturn = 0.02
	} = params;

	if (withdrawalRate <= 0) return Infinity;
	if (annualExpenses <= 0) return 0;

	// Nessun beneficio dalla pensione: regola del 4% classica su spese piene
	if (annualPension <= 0 || pensionAge >= lifeExpectancy) {
		return annualExpenses / withdrawalRate;
	}

	// FIRE oltre l'eta' pensionabile: pensione gia' attiva, si applica lo sconto diretto
	if (pensionAge <= retirementAge) {
		return Math.max(0, annualExpenses - annualPension) / withdrawalRate;
	}

	// FIRE prima della pensione INPS: calcolo in due fasi con PV delle rendite
	const bridgeYears = pensionAge - retirementAge;
	const pensionYears = Math.max(0, lifeExpectancy - pensionAge);
	const netExpensesAfterPension = Math.max(0, annualExpenses - annualPension);
	const r = realReturn;

	const annuityPV = (cashflow: number, n: number) => {
		if (n <= 0) return 0;
		if (Math.abs(r) < 1e-9) return cashflow * n;
		return (cashflow * (1 - Math.pow(1 + r, -n))) / r;
	};

	const pvBridge = annuityPV(annualExpenses, bridgeYears);
	const pvPostPensionAtStart = annuityPV(netExpensesAfterPension, pensionYears);
	const pvPostPension = pvPostPensionAtStart / Math.pow(1 + r, bridgeYears);

	return pvBridge + pvPostPension;
}

/**
 * Calcola gli anni necessari per raggiungere il numero FIRE
 * tramite iterazione anno per anno con interesse composto.
 * Il confronto avviene in euro di oggi: portafoglio e contributi crescono al
 * tasso nominale, ma il FIRE target viene inflazionato per ogni anno futuro,
 * in modo che l'utente veda il vero impatto dell'inflazione.
 *
 * @param currentPortfolio - Portafoglio attuale (euro di oggi)
 * @param annualSavings - Risparmio annuale corrente (euro di oggi)
 * @param expectedReturn - Rendimento nominale atteso annuale (es. 0.07)
 * @param fireNumber - Il numero FIRE target in euro di oggi
 * @param inflationRate - Tasso di inflazione annuale (es. 0.02). Default 0.
 * @returns Numero di anni per raggiungere il FIRE, -1 se irraggiungibile
 */
export function calculateYearsToFire(
	currentPortfolio: number,
	annualSavings: number,
	expectedReturn: number,
	fireNumber: number,
	inflationRate: number = 0
): number {
	if (currentPortfolio >= fireNumber) return 0;
	if (annualSavings <= 0 && expectedReturn <= 0) return -1;

	let portfolio = currentPortfolio;
	const maxYears = 100;

	for (let year = 1; year <= maxYears; year++) {
		// I contributi crescono con l'inflazione (stipendio si adegua)
		const inflatedContribution = annualSavings * Math.pow(1 + inflationRate, year - 1);
		portfolio = portfolio * (1 + expectedReturn) + inflatedContribution;
		// Il target FIRE si inflaziona pure: confronto in moneta dell'anno
		const inflatedTarget = fireNumber * Math.pow(1 + inflationRate, year);
		if (portfolio >= inflatedTarget) return year;
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
		annualPension = 0,
		pensionAge = 67,
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

		// Inflazione cumulata dall'inizio
		const inflationCumulative = Math.pow(1 + inflationRate, i);

		// Contributi (solo in fase di accumulazione)
		// I contributi crescono con l'inflazione (stipendio si adegua)
		const contributions = isRetired ? 0 : annualContribution * inflationCumulative;

		// Prelievi (solo in fase di decumulo)
		let actualWithdrawals = 0;
		if (isRetired) {
			// Salva il portafoglio al primo anno di pensione
			if (retirementPortfolio === 0) {
				retirementPortfolio = portfolio;
				retirementYear = i;
			}
			const yearsSinceRetirement = i - retirementYear;

			// Pensione INPS: disponibile solo dopo l'eta' pensionabile
			// La pensione INPS cresce con l'inflazione (perequazione automatica)
			const pensionIncome = age >= pensionAge ? annualPension * inflationCumulative : 0;

			if (withdrawalStrategy === 'fixed') {
				// Regola del 4%: preleva le spese effettive aggiustate per inflazione dall'inizio
				actualWithdrawals = annualExpenses * inflationCumulative;
			} else {
				// Strategie dinamiche (VPW, CAPE, Guyton-Klinger):
				// l'importo dipende dal portafoglio corrente, eta', ecc.
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
			}

			// La pensione riduce quanto serve prelevare dal portafoglio
			actualWithdrawals = Math.max(0, actualWithdrawals - pensionIncome);
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

		// Pensione INPS per la proiezione (calcolata anche fuori dal blocco isRetired)
		const pensionIncomeForProjection = age >= pensionAge ? annualPension : 0;

		projections.push({
			year,
			age,
			portfolio,
			contributions,
			withdrawals: actualWithdrawals,
			returns: netReturns,
			taxes,
			netWorth: portfolio,
			pensionIncome: pensionIncomeForProjection
		});
	}

	return projections;
}

/**
 * Calcola il numero Coast FIRE: il patrimonio necessario oggi
 * per poter smettere di contribuire e raggiungere comunque il FIRE
 * al momento del pensionamento grazie all'interesse composto.
 *
 * Usa il rendimento REALE (depurato dall'inflazione) perché il FIRE target
 * è espresso in euro di oggi. Con rendimento reale negativo (inflazione >
 * rendimento nominale), il Coast FIRE è irraggiungibile senza contributi.
 *
 * @param currentAge - Età attuale
 * @param retirementAge - Età di pensionamento target
 * @param fireNumber - Il numero FIRE target in euro di oggi
 * @param expectedReturn - Rendimento nominale atteso annuale (es. 0.07)
 * @param inflationRate - Tasso di inflazione annuale (es. 0.02). Default 0.
 * @returns Il patrimonio minimo necessario oggi per il Coast FIRE
 */
export function calculateCoastFireNumber(
	currentAge: number,
	retirementAge: number,
	fireNumber: number,
	expectedReturn: number,
	inflationRate: number = 0
): number {
	const years = retirementAge - currentAge;
	if (years <= 0) return fireNumber;
	const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;
	if (realReturn <= -1) return Infinity;
	if (realReturn <= 0) return Infinity; // senza contributi non si recupera il potere d'acquisto
	return fireNumber / Math.pow(1 + realReturn, years);
}
