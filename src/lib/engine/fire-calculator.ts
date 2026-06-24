/**
 * Modulo di calcolo FIRE (Financial Independence Retire Early).
 * Contiene le funzioni principali per il calcolo del numero FIRE,
 * proiezioni del portafoglio e metriche correlate.
 */

import { calculateWithdrawal } from './withdrawal';
import {
	calculateNetSalary,
	invertNetSalary,
	calculatePortfolioStampDuties
} from './tax-italy';
import { DEFAULT_2026, type AssumptionSet } from './assumptions';
import { totalFamilyExpenses } from './family';
import { computeYearlyImpact, type LifeEvent } from './life-events';
import { spouseYearlyCashFlow } from './couple';
import type { Child, Mortgage, Spouse } from '$lib/db/index';

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
	/** Rendimenti ottenuti nell'anno (netti di tasse sui rendimenti) */
	returns: number;
	/** Tasse pagate nell'anno sui rendimenti del portafoglio */
	taxes: number;
	/** Patrimonio netto totale */
	netWorth: number;
	/** Reddito pensionistico nell'anno */
	pensionIncome?: number;
	// --- Breakdown dettagliato (cash flow) ---
	/** Reddito lordo da lavoro in questo anno (inflazionato) */
	grossSalary?: number;
	/** IRPEF + addizionali stimate sul reddito da lavoro */
	irpef?: number;
	/** Contributi INPS a carico del lavoratore trattenuti in busta */
	inpsContributions?: number;
	/** Netto stimato in busta paga */
	netSalary?: number;
	/** Altri redditi percepiti nell'anno (affitti/dividendi/rendite) */
	otherIncomeActive?: number;
	/** Rendimenti lordi (prima delle tasse) */
	investmentReturnsGross?: number;
	/** Spese per figli a carico nell'anno */
	childrenExpenses?: number;
	/** Rata annuale mutuo */
	mortgagePayment?: number;
	/** Spese base (da profile.annualExpenses inflazionato), esclude famiglia/mutuo */
	baseExpenses?: number;
	/** Spese totali dell'anno (base + famiglia + mutuo + life events) */
	totalExpenses?: number;
	/** Bonus / income una-tantum da life events attivi nell'anno */
	lifeEventBonus?: number;
	/** Spese una-tantum da life events attivi nell'anno */
	lifeEventExpense?: number;
	/** Etichette descrittive degli eventi di vita attivi (per tooltip UI) */
	lifeEventLabels?: string[];
	/** Bollo titoli pagato nell'anno (parte italiana del portafoglio) */
	stampDuty?: number;
	/** IVAFE pagata nell'anno (parte estera del portafoglio) */
	ivafe?: number;
	/** Allocazione equity effettiva applicata in questo anno (post glide path) */
	equityShare?: number;
	/** Netto del coniuge nell'anno (lavoro + pensione, post-IRPEF separata) */
	spouseNetIncome?: number;
}

/** Parametri per la proiezione deterministica del portafoglio */
export interface ProjectionParams {
	/** Portafoglio iniziale (solo asset liquidi!) */
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
	/** Altri redditi annui (affitti, dividendi, rendite): flusso passivo */
	otherIncome?: number;
	/** Eta' fino a cui otherIncome continua. Se <= retirementAge = solo reddito attivo */
	otherIncomeEndAge?: number;
	/** Età attuale */
	currentAge: number;
	/** Età di pensionamento FIRE */
	retirementAge: number;
	/** Aspettativa di vita */
	lifeExpectancy: number;
	/** Anno di calendario iniziale */
	startYear: number;
	/** Figli a carico (spese ricorrenti + universita) */
	children?: Child[];
	/** Mutuo attivo */
	mortgage?: Mortgage;
	/** Tipo di contratto per il calcolo della busta paga (breakdown) */
	contractType?: 'dipendente' | 'autonomo' | 'parasubordinato';
	/** Aliquota addizionale regionale (default media IT 1.73%) */
	regionalTaxRate?: number;
	/** Aliquota addizionale comunale (default media IT 0.7%) */
	municipalTaxRate?: number;
	/** Eventi di vita parametrici (bonus, disoccupazione, spese una-tantum, part-time) */
	lifeEvents?: LifeEvent[];
	/**
	 * Set di ipotesi fiscali/normative (aliquote IRPEF, INPS, capital gain,
	 * bollo titoli, IVAFE, fondo pensione). Se omesso usa DEFAULT_2026.
	 */
	assumptions?: AssumptionSet;
	/**
	 * Quota del portafoglio detenuta su intermediari ESTERI (es. IBKR, Trade
	 * Republic). 0 = tutto in deposito italiano, 1 = tutto estero. Influenza
	 * il calcolo di IVAFE vs bollo titoli (stessa aliquota di default ma
	 * concettualmente diversi). Default 0.
	 */
	foreignBrokerShare?: number;
	/**
	 * Glide path: se true, l'allocazione equity decresce linearmente da
	 * `glidePathStartEquity` (oggi) a `glidePathEndEquity` (a `lifeExpectancy`).
	 * Influenza il rendimento atteso applicato ogni anno (mix equity/bond).
	 */
	glidePathEnabled?: boolean;
	glidePathStartEquity?: number;
	glidePathEndEquity?: number;
	/**
	 * Rendimento atteso lordo dell'asset class equity (decimale, es. 0.07).
	 * Usato dal glide path per modulare il rendimento.
	 */
	expectedEquityReturn?: number;
	/** Rendimento atteso lordo dell'asset class bond/cash (decimale) */
	expectedBondReturn?: number;
	/**
	 * Coniuge / partner. Quando presente il proiettore aggiunge il netto
	 * del coniuge ai contributi/redditi di nucleo. IRPEF e INPS sono
	 * calcolati separatamente sul reddito del coniuge (no joint filing).
	 */
	spouse?: Spouse;
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
	/** Altri redditi perpetui / a termine (affitti, dividendi, rendite) */
	otherIncome?: number;
	/** Eta' fino alla quale otherIncome continua. <= retirementAge = non conta in FIRE */
	otherIncomeEndAge?: number;
	/** Figli a carico: aggiungono flussi futuri da finanziare */
	children?: Child[];
	/** Mutuo attivo: la rata residua post-FIRE fa parte del fabbisogno */
	mortgage?: Mortgage;
	/** Anno di inizio della simulazione (default: anno corrente). Serve per
	 *  proiettare le spese future di figli e mutuo. */
	baseYear?: number;
	/** Eta attuale (serve a mappare retirementAge → calendar year) */
	currentAge?: number;
}): number {
	const {
		annualExpenses,
		withdrawalRate,
		annualPension = 0,
		retirementAge,
		pensionAge,
		lifeExpectancy,
		realReturn = 0.02,
		otherIncome = 0,
		otherIncomeEndAge = 0,
		children,
		mortgage,
		baseYear = new Date().getFullYear(),
		currentAge = retirementAge
	} = params;

	if (withdrawalRate <= 0) return Infinity;
	if (annualExpenses <= 0) return 0;

	const r = realReturn;
	const annuityPV = (cashflow: number, n: number) => {
		if (n <= 0 || cashflow === 0) return 0;
		if (Math.abs(r) < 1e-9) return cashflow * n;
		return (cashflow * (1 - Math.pow(1 + r, -n))) / r;
	};

	// Calcolo PV del flusso "altri redditi" attivo dopo il FIRE fino a otherIncomeEndAge
	const otherIncomeYears = Math.max(0, Math.min(otherIncomeEndAge, lifeExpectancy) - retirementAge);
	const pvOtherIncome = annuityPV(otherIncome, otherIncomeYears);

	// PV delle spese familiari future che cadono DOPO il FIRE: figli ancora a
	// carico dopo il retirementAge, rate di mutuo residue. Usiamo euro di oggi
	// (inflazione gia' neutralizzata dal rendimento reale).
	let pvFamilyPostFire = 0;
	const yearsToFire = Math.max(0, retirementAge - currentAge);
	const yearsInFire = Math.max(0, lifeExpectancy - retirementAge);
	if (children && children.length > 0) {
		for (let offset = 0; offset < yearsInFire; offset++) {
			const calendarYear = baseYear + yearsToFire + offset;
			let yearCost = 0;
			for (const c of children) {
				// Usiamo euro di oggi (inflationRate=0) per coerenza col realReturn
				const age = calendarYear - c.birthYear;
				const indep = c.independenceAge ?? 25;
				if (age < 0 || age >= indep) continue;
				yearCost += (c.monthlyExpense || 0) * 12;
				const uniStart = c.universityStartAge;
				const uniYears = c.universityYears ?? 0;
				const uniCost = c.universityAnnualCost ?? 0;
				if (uniStart !== undefined && uniYears > 0 && uniCost > 0) {
					if (age >= uniStart && age < uniStart + uniYears) yearCost += uniCost;
				}
			}
			if (yearCost > 0) pvFamilyPostFire += yearCost / Math.pow(1 + r, offset);
		}
	}
	if (mortgage && mortgage.monthlyPayment > 0 && mortgage.remainingMonths > 0) {
		// Mesi di mutuo che cadono dopo il FIRE
		const monthsBeforeFire = yearsToFire * 12;
		const monthsAfterFire = Math.max(0, mortgage.remainingMonths - monthsBeforeFire);
		const annualMortgage = mortgage.monthlyPayment * 12;
		const fullYearsAfter = Math.floor(monthsAfterFire / 12);
		const residualMonths = monthsAfterFire - fullYearsAfter * 12;
		// PV delle rate intere
		for (let y = 0; y < fullYearsAfter; y++) {
			pvFamilyPostFire += annualMortgage / Math.pow(1 + r, y);
		}
		// PV dell'ultimo anno frazionario
		if (residualMonths > 0) {
			pvFamilyPostFire += (mortgage.monthlyPayment * residualMonths) / Math.pow(1 + r, fullYearsAfter);
		}
	}

	// Nessun beneficio dalla pensione: regola del 4% classica su spese piene,
	// ridotta dal PV degli altri redditi e aumentata dal PV delle spese familiari
	if (annualPension <= 0 || pensionAge >= lifeExpectancy) {
		const base = annualExpenses / withdrawalRate;
		return Math.max(0, base - pvOtherIncome + pvFamilyPostFire);
	}

	// FIRE oltre l'eta' pensionabile: pensione gia' attiva
	if (pensionAge <= retirementAge) {
		const base = Math.max(0, annualExpenses - annualPension) / withdrawalRate;
		return Math.max(0, base - pvOtherIncome + pvFamilyPostFire);
	}

	// FIRE prima della pensione INPS: calcolo in due fasi con PV delle rendite
	const bridgeYears = pensionAge - retirementAge;
	const pensionYears = Math.max(0, lifeExpectancy - pensionAge);
	const netExpensesAfterPension = Math.max(0, annualExpenses - annualPension);

	const pvBridge = annuityPV(annualExpenses, bridgeYears);
	const pvPostPensionAtStart = annuityPV(netExpensesAfterPension, pensionYears);
	const pvPostPension = pvPostPensionAtStart / Math.pow(1 + r, bridgeYears);

	return Math.max(0, pvBridge + pvPostPension - pvOtherIncome + pvFamilyPostFire);
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
 * Asset liquidi: prelevabili direttamente o quasi, usati per il calcolo
 * del FIRE Number e della proiezione con SWR (regola del 4%).
 */
export const LIQUID_ASSET_KEYS = [
	'stocks', 'bonds', 'cash', 'gold', 'crypto', 'pensionFund', 'other'
] as const;

/**
 * Asset illiquidi: producono reddito (affitti) o hanno vincoli di prelievo
 * (TFR). NON fanno parte del portafoglio da cui si applica la regola del 4%.
 */
export const ILLIQUID_ASSET_KEYS = ['realEstate', 'tfr'] as const;

/**
 * Patrimonio liquido: somma degli asset dai quali si puo' effettivamente
 * prelevare con la regola del 4% per coprire le spese in FIRE.
 */
export function calculateLiquidNetWorth(portfolio: Record<string, number>): number {
	return LIQUID_ASSET_KEYS.reduce((sum, key) => sum + (portfolio[key] || 0), 0);
}

/**
 * Patrimonio illiquido: immobili e TFR. Non prelevabile al 4% ma puo'
 * generare redditi passivi (affitti) o essere liquidato eccezionalmente.
 */
export function calculateIlliquidNetWorth(portfolio: Record<string, number>): number {
	return ILLIQUID_ASSET_KEYS.reduce((sum, key) => sum + (portfolio[key] || 0), 0);
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
		otherIncome = 0,
		otherIncomeEndAge = 0,
		currentAge,
		retirementAge,
		lifeExpectancy,
		startYear,
		children,
		mortgage,
		contractType = 'dipendente',
		regionalTaxRate,
		municipalTaxRate,
		lifeEvents,
		assumptions = DEFAULT_2026,
		foreignBrokerShare = 0,
		glidePathEnabled = false,
		glidePathStartEquity = 0.7,
		glidePathEndEquity = 0.3,
		expectedEquityReturn,
		expectedBondReturn,
		spouse
	} = params;
	// Se non passati esplicitamente, derivo i rendimenti per asset class dal
	// rendimento medio: equity = expectedReturn + 2 punti, bond = expectedReturn - 2.
	const equityReturn = expectedEquityReturn ?? Math.max(0, expectedReturn + 0.02);
	const bondReturn = expectedBondReturn ?? Math.max(0, expectedReturn - 0.02);
	const useSurtaxes = {
		regional: regionalTaxRate ?? assumptions.surtaxes.regional,
		municipal: municipalTaxRate ?? assumptions.surtaxes.municipal
	};

	const totalYears = lifeExpectancy - currentAge;
	if (totalYears <= 0) return [];

	const projections: YearlyProjection[] = [];
	let portfolio = initialPortfolio;
	let retirementPortfolio = 0; // portafoglio al momento del pensionamento
	let previousWithdrawal = 0;
	let retirementYear = 0; // anno (0-based) di inizio pensione

	// Stima del reddito lordo da lavoro per l'anno base: partiamo dal contributo
	// annuo come upper bound (non abbiamo annualIncome qui). Se il caller vuole
	// un breakdown piu' preciso dovra' passare grossSalaryBase via futura estensione.
	// Per ora inferiamo gross dal netto con busta-paga inversa: se il contributo
	// e' positivo e pari a savings, il gross si puo' derivare approssimativamente
	// assumendo che annualContribution sia il risparmio annuo e quindi la busta
	// contenga annualContribution + annualExpenses come netto totale.
	const workingNetEstimate = Math.max(0, annualContribution + annualExpenses);

	for (let i = 0; i < totalYears; i++) {
		const age = currentAge + i + 1;
		const year = startYear + i + 1;
		const isRetired = age > retirementAge;

		// Inflazione cumulata dall'inizio
		const inflationCumulative = Math.pow(1 + inflationRate, i);

		// "Altri redditi" attivi in questo anno (se l'eta' non ha ancora superato
		// otherIncomeEndAge). Vengono inflazionati come gli altri flussi.
		const otherIncomeActive = otherIncome > 0 && age <= otherIncomeEndAge
			? otherIncome * inflationCumulative
			: 0;

		// Spese familiari (figli + mutuo) dell'anno: in euro dell'anno (gia'
		// inflazionate per i figli; mutuo nominale perche' la rata e' fissa).
		const family = totalFamilyExpenses(children, mortgage, year, startYear, inflationRate);

		// Cash flow del coniuge in questo anno (se presente). IRPEF e INPS
		// sono calcolati separatamente sul reddito del coniuge.
		const spouseCF = spouse
			? spouseYearlyCashFlow(
					spouse,
					year,
					startYear,
					inflationRate,
					useSurtaxes.regional,
					useSurtaxes.municipal,
					assumptions
			  )
			: null;
		const spouseTotalNet = spouseCF ? spouseCF.netSalary + spouseCF.pensionNet : 0;

		// Life events (bonus, disoccupazione, part-time, spese una-tantum)
		const lifeImpact = computeYearlyImpact(lifeEvents, year);
		const lifeBonusNominal = lifeImpact.bonusIncome * inflationCumulative;
		const lifeExpenseNominal = lifeImpact.oneTimeExpenses * inflationCumulative;
		const lifeIncomeDeltaNominal = lifeImpact.incomeDelta * inflationCumulative;

		// Contributi (solo in fase di accumulazione)
		// Base: annualContribution inflazionato, ridotto dalle spese familiari
		// e dagli eventi di vita. incomeMultiplier modula il reddito (0 = disoccupato).
		// Il bonus si aggiunge ai contributi, le spese una-tantum li riducono.
		// Se la pensione INPS arriva DURANTE l'accumulazione, viene aggiunta.
		const accumPensionIncome = !isRetired && age >= pensionAge
			? annualPension * inflationCumulative
			: 0;
		const nominalContribution = annualContribution * inflationCumulative;
		const incomeAdjusted = nominalContribution * lifeImpact.incomeMultiplier + lifeIncomeDeltaNominal;
		// Contributi e prelievi: calcolo unificato che gestisce pre-FIRE
		// (accumulazione) e post-FIRE (decumulo con surplus reinvestito).
		let contributions = 0;
		let actualWithdrawals = 0;

		if (!isRetired) {
			// PRE-FIRE: il "risparmio netto" disponibile da reddito e' il
			// contributo base, modulato dagli eventi di vita. Il netto del
			// coniuge si somma al risparmio del nucleo.
			const savingsBase =
				incomeAdjusted - family.total - lifeExpenseNominal + lifeBonusNominal + spouseTotalNet;
			if (savingsBase >= 0) {
				contributions = savingsBase + accumPensionIncome;
			} else {
				// Deficit: spese superano il reddito (es. grossa spesa una-tantum).
				// Preleviamo la differenza dal portafoglio, accumPensionIncome comunque entra.
				contributions = accumPensionIncome;
				actualWithdrawals = -savingsBase;
			}
		} else {
			// POST-FIRE: calcolo spese e redditi passivi dell'anno, poi
			// determino se serve prelevare dal portafoglio o se c'e' surplus
			// da reinvestire.
			if (retirementPortfolio === 0) {
				retirementPortfolio = portfolio;
				retirementYear = i;
			}
			const yearsSinceRetirement = i - retirementYear;

			// Pensione INPS cresce con l'inflazione (perequazione automatica)
			const pensionIncome = age >= pensionAge ? annualPension * inflationCumulative : 0;

			// Prelievo BASE calcolato dalla strategia (per coprire annualExpenses)
			let baseWithdrawal: number;
			if (withdrawalStrategy === 'fixed') {
				baseWithdrawal = annualExpenses * inflationCumulative;
			} else {
				baseWithdrawal = calculateWithdrawal(withdrawalStrategy, {
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

			// Bilancio di cassa dell'anno:
			// entrate passive = pensione + altri redditi + bonus una-tantum + netto coniuge
			// uscite = prelievo base + spese famiglia + spese una-tantum
			const totalPassiveIncome =
				pensionIncome + otherIncomeActive + lifeBonusNominal + spouseTotalNet;
			const totalCashNeeds = baseWithdrawal + family.total + lifeExpenseNominal;
			const netNeed = totalCashNeeds - totalPassiveIncome;

			if (netNeed > 0) {
				// Serve prelevare: le entrate non coprono le uscite.
				actualWithdrawals = netNeed;
			} else {
				// Surplus: le entrate coprono tutto, l'eccesso va reinvestito
				// nel portafoglio come contribuzione.
				actualWithdrawals = 0;
				contributions = -netNeed;
			}
			// Guyton-Klinger (e strategie path-dependent) tracciano il LIVELLO di
			// prelievo generato dalla strategia, NON il prelievo netto dal portafoglio
			// dopo i redditi passivi: usare actualWithdrawals faceva collassare a 0 la
			// baseline GK negli anni di surplus. Coerente con monte-carlo.ts.
			previousWithdrawal = baseWithdrawal;
		}

		// Rendimento atteso dell'anno: se glide path attivo modula tra equity
		// e bond linearmente in funzione dell'eta'.
		let yearReturn = expectedReturn;
		if (glidePathEnabled) {
			const ageProgress = Math.min(
				1,
				Math.max(0, (age - currentAge) / Math.max(1, lifeExpectancy - currentAge))
			);
			const equityShare =
				glidePathStartEquity + (glidePathEndEquity - glidePathStartEquity) * ageProgress;
			yearReturn = equityShare * equityReturn + (1 - equityShare) * bondReturn;
		}

		// Rendimenti lordi
		const grossReturns = (portfolio + contributions) * yearReturn;

		// Tasse sui rendimenti (solo se positivi)
		const taxes = grossReturns > 0 ? grossReturns * taxRate : 0;

		// Bollo titoli + IVAFE: si calcolano sul controvalore di FINE anno
		// (cioe' sul portafoglio risultante dopo contributi/prelievi/rendimenti
		// netti). Per semplicita' di calcolo applichiamo le aliquote sul
		// portafoglio "lavorato" (portfolio + contributions + netReturns).
		const portfolioPreStamp = portfolio + contributions + (grossReturns - taxes) - actualWithdrawals;
		const stampBase = Math.max(0, portfolioPreStamp);
		const italianShare = Math.max(0, Math.min(1, 1 - foreignBrokerShare));
		const stampDuties = calculatePortfolioStampDuties(
			stampBase * italianShare,
			stampBase * (1 - italianShare),
			assumptions
		);

		// Rendimenti netti (al netto di capital gain tax e imposte patrimoniali)
		const netReturns = grossReturns - taxes - stampDuties.total;

		// Aggiorna portafoglio
		portfolio = portfolio + contributions + (grossReturns - taxes) - actualWithdrawals - stampDuties.total;

		// Il portafoglio non può essere negativo (si è esaurito)
		if (portfolio < 0) portfolio = 0;

		// Pensione INPS per la proiezione (calcolata anche fuori dal blocco isRetired)
		const pensionIncomeForProjection = age >= pensionAge ? annualPension * inflationCumulative : 0;

		// --- Breakdown stipendio pre-FIRE (busta paga) ---
		// Stima del lordo che produce il netto target (contributo + spese personali).
		// Approssimazione: aumento del ~30% per coprire IRPEF e INPS medi.
		let grossSalary = 0;
		let netSalary = 0;
		let irpef = 0;
		let inpsContributions = 0;
		if (!isRetired && workingNetEstimate > 0) {
			// Lordo→netto: invertNetSalary inverte numericamente (bisezione) la
			// funzione gross→net, ora comprensiva di detrazioni e cuneo (tax-italy.ts).
			const netTargetNominal = (annualContribution + annualExpenses) * inflationCumulative;
			const grossExact = invertNetSalary(
				netTargetNominal,
				contractType,
				useSurtaxes.regional,
				useSurtaxes.municipal,
				assumptions
			);
			const finalBreakdown = calculateNetSalary(
				grossExact,
				contractType,
				useSurtaxes.regional,
				useSurtaxes.municipal,
				assumptions
			);
			grossSalary = finalBreakdown.gross;
			netSalary = finalBreakdown.net;
			irpef = finalBreakdown.totalTax;
			inpsContributions = finalBreakdown.inpsContribution;
		}

		// Spese base dell'anno (senza famiglia/mutuo): post-FIRE e' annualExpenses
		// inflazionato, pre-FIRE e' annualExpenses inflazionato (vita corrente).
		const baseExpensesYear = annualExpenses * inflationCumulative;
		const totalExpensesYear = baseExpensesYear + family.total + lifeExpenseNominal;

		projections.push({
			year,
			age,
			portfolio,
			contributions,
			withdrawals: actualWithdrawals,
			returns: netReturns,
			taxes,
			netWorth: portfolio,
			pensionIncome: pensionIncomeForProjection,
			grossSalary: isRetired ? 0 : Math.round(grossSalary),
			irpef: isRetired ? 0 : Math.round(irpef),
			inpsContributions: isRetired ? 0 : Math.round(inpsContributions),
			netSalary: isRetired ? 0 : Math.round(netSalary),
			otherIncomeActive: Math.round(otherIncomeActive),
			investmentReturnsGross: Math.round(grossReturns),
			childrenExpenses: Math.round(family.children),
			mortgagePayment: Math.round(family.mortgage),
			baseExpenses: Math.round(baseExpensesYear),
			totalExpenses: Math.round(totalExpensesYear),
			lifeEventBonus: Math.round(lifeBonusNominal),
			lifeEventExpense: Math.round(lifeExpenseNominal),
			lifeEventLabels: lifeImpact.activeLabels.length > 0 ? lifeImpact.activeLabels : undefined,
			stampDuty: Math.round(stampDuties.stampDuty),
			ivafe: Math.round(stampDuties.ivafe),
			equityShare: glidePathEnabled
				? Math.max(
						0,
						Math.min(
							1,
							glidePathStartEquity +
								(glidePathEndEquity - glidePathStartEquity) *
									Math.min(
										1,
										Math.max(0, (age - currentAge) / Math.max(1, lifeExpectancy - currentAge))
									)
						)
				  )
				: undefined,
			spouseNetIncome: spouseCF ? Math.round(spouseTotalNet) : undefined
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

/** Una variante FIRE calcolata sui numeri dell'utente. */
export interface FireVariant {
	key: 'lean' | 'standard' | 'barista' | 'chubby' | 'fat';
	label: string;
	/** Tenore di vita annuo (spesa) assunto dalla variante. */
	annualExpenses: number;
	/** Capitale FIRE necessario per la variante. */
	fireNumber: number;
	/** Spiegazione sintetica in italiano. */
	description: string;
}

/** Parametri per il calcolo delle varianti FIRE. */
export interface FireVariantsParams {
	/** Spesa annua "standard" di riferimento (tenore di vita attuale). */
	annualExpenses: number;
	/** Tasso di prelievo sicuro (SWR). */
	withdrawalRate: number;
	/** Moltiplicatore LeanFIRE sulle spese (default 0.7). */
	leanMultiplier?: number;
	/** Moltiplicatore ChubbyFIRE (default 1.5). */
	chubbyMultiplier?: number;
	/** Moltiplicatore FatFIRE (default 2.0). */
	fatMultiplier?: number;
	/** Reddito da lavoro leggero nel BaristaFIRE (default 12.000€/anno). */
	baristaIncome?: number;
}

/**
 * Calcola le principali varianti FIRE (Lean/Standard/Barista/Chubby/Fat) sui
 * numeri dell'utente, con lo stesso SWR. Le soglie sono IPOTESI editabili
 * (moltiplicatori delle spese), non regole fisse: servono a quantificare in
 * euro i termini del vocabolario FIRE invece di lasciarli come sola teoria.
 */
export function calculateFireVariants(params: FireVariantsParams): FireVariant[] {
	const swr = params.withdrawalRate;
	const e = Math.max(0, params.annualExpenses);
	const lean = params.leanMultiplier ?? 0.7;
	const chubby = params.chubbyMultiplier ?? 1.5;
	const fat = params.fatMultiplier ?? 2.0;
	const barista = Math.max(0, params.baristaIncome ?? 12000);
	const fn = (exp: number) => calculateFireNumber(Math.max(0, exp), swr);
	const baristaPortfolioNeed = Math.max(0, e - barista);
	return [
		{
			key: 'lean',
			label: 'LeanFIRE',
			annualExpenses: Math.round(e * lean),
			fireNumber: Math.round(fn(e * lean)),
			description: `Stile di vita essenziale (~${Math.round(lean * 100)}% delle spese attuali).`
		},
		{
			key: 'standard',
			label: 'FIRE',
			annualExpenses: Math.round(e),
			fireNumber: Math.round(fn(e)),
			description: 'Mantieni il tenore di vita attuale.'
		},
		{
			key: 'barista',
			label: 'BaristaFIRE',
			annualExpenses: Math.round(e),
			fireNumber: Math.round(fn(baristaPortfolioNeed)),
			description: 'FIRE parziale: un lavoro leggero copre parte delle spese, il portafoglio il resto.'
		},
		{
			key: 'chubby',
			label: 'ChubbyFIRE',
			annualExpenses: Math.round(e * chubby),
			fireNumber: Math.round(fn(e * chubby)),
			description: `Tenore di vita piu' alto (${chubby}× le spese attuali).`
		},
		{
			key: 'fat',
			label: 'FatFIRE',
			annualExpenses: Math.round(e * fat),
			fireNumber: Math.round(fn(e * fat)),
			description: `Stile di vita agiato (${fat}× le spese attuali).`
		}
	];
}
