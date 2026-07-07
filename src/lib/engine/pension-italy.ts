/**
 * Sistema pensionistico italiano (INPS) per la pianificazione FIRE.
 * Implementa il metodo contributivo e i requisiti di accesso alla pensione.
 */
import { getTransformationCoefficient } from './assumptions.js';

// Re-export per retrocompatibilita': altri moduli (es. pension-fund.ts)
// importano getTransformationCoefficient da qui. La fonte unica e' ora
// assumptions.ts (coefficienti 2025-2026, DM 20/11/2024).
export { getTransformationCoefficient };

/** Parametri per il calcolo della pensione contributiva */
export interface ContributivePensionParams {
	/** Stipendio annuo lordo attuale */
	currentSalary: number;
	/** Tasso di crescita annuale dello stipendio */
	salaryGrowthRate: number;
	/** Anni di contribuzione già maturati */
	currentContributionYears: number;
	/** Età attuale */
	currentAge: number;
	/** Età di pensionamento prevista */
	retirementAge: number;
	/** Tasso di inflazione medio annuale */
	inflationRate: number;
	/** Tasso di rivalutazione del montante (media PIL nominale, default 1.5%) */
	montanteRevaluationRate?: number;
	/**
	 * Età di fine contribuzione (fine lavoro / FIRE). Oltre questa età non si
	 * versano nuovi contributi ma il montante continua a rivalutarsi fino alla
	 * pensione. Default: `retirementAge` (contribuzione piena, legacy). Issue #37.
	 */
	contributionEndAge?: number;
}

/** Risultato del calcolo della pensione contributiva */
export interface ContributivePensionResult {
	/** Pensione mensile lorda stimata */
	monthlyPension: number;
	/** Pensione annuale lorda stimata */
	annualPension: number;
	/** Tasso di sostituzione (pensione / ultimo stipendio) */
	replacementRate: number;
	/** Montante contributivo totale */
	totalMontante: number;
	/** Coefficiente di trasformazione applicato */
	transformationCoefficient: number;
}

/** Requisiti pensionistici italiani */
export interface PensionRequirements {
	/** Pensione di vecchiaia */
	oldAge: {
		age: number;
		minContributionYears: number;
		description: string;
	};
	/** Pensione anticipata (basata sugli anni di contributi) */
	early: {
		menYears: number;
		menMonths: number;
		womenYears: number;
		womenMonths: number;
		description: string;
	};
	/** Pensione anticipata contributiva */
	earlyContributive: {
		age: number;
		minContributionYears: number;
		minPensionMultiple: number;
		socialAllowanceMonthly: number;
		description: string;
	};
}

/**
 * Aliquota contributiva IVS per lavoratori dipendenti.
 * 33% dello stipendio lordo (di cui ~9.19% a carico del lavoratore).
 */
const CONTRIBUTION_RATE = 0.33;

/**
 * Calcola la pensione con il metodo contributivo INPS.
 *
 * Il calcolo:
 * 1. Si calcola il montante contributivo: somma dei contributi versati (33% dello stipendio)
 *    rivalutati annualmente con il tasso medio del PIL nominale
 * 2. Si applica il coefficiente di trasformazione basato sull'età di pensionamento
 * 3. Pensione annuale = montante * coefficiente
 *
 * @param params - Parametri per il calcolo
 * @returns Risultato con pensione mensile, annuale e tasso di sostituzione
 */
export function calculateContributivePension(
	params: ContributivePensionParams
): ContributivePensionResult {
	const {
		currentSalary,
		salaryGrowthRate,
		currentContributionYears,
		currentAge,
		retirementAge,
		inflationRate,
		montanteRevaluationRate = 0.015,
		contributionEndAge
	} = params;

	if (currentSalary <= 0 || retirementAge <= currentAge) {
		return {
			monthlyPension: 0,
			annualPension: 0,
			replacementRate: 0,
			totalMontante: 0,
			transformationCoefficient: 0
		};
	}

	const yearsToRetirement = retirementAge - currentAge;

	// Stima del montante già accumulato (contributi passati rivalutati)
	// Semplificazione: usiamo lo stipendio attuale come media per gli anni passati
	let montante = 0;

	// Montante per gli anni già lavorati
	// Clamp difensivo: anni di contribuzione fuori range (input senza guard JS)
	// falserebbero il montante (issue #10).
	const safeContribYears = Math.max(0, Math.min(50, currentContributionYears || 0));
	for (let i = safeContribYears; i > 0; i--) {
		const yearsAgo = i;
		const pastSalary = currentSalary / Math.pow(1 + salaryGrowthRate, yearsAgo);
		const contribution = pastSalary * CONTRIBUTION_RATE;
		// Rivaluta fino ad oggi
		montante += contribution * Math.pow(1 + montanteRevaluationRate, yearsAgo);
	}

	// Montante per gli anni futuri: si versano contributi solo fino alla fine
	// lavoro (FIRE); il montante gia' accumulato continua a rivalutarsi fino alla
	// pensione anche nel "gap" senza nuovi versamenti. (#37)
	const contribEndAge = Math.min(contributionEndAge ?? retirementAge, retirementAge);
	const futureContribYears = Math.max(0, contribEndAge - currentAge);
	let lastSalary = currentSalary;
	for (let i = 1; i <= yearsToRetirement; i++) {
		if (i > futureContribYears) break; // fine contribuzione: nessun nuovo versamento
		const futureSalary = currentSalary * Math.pow(1 + salaryGrowthRate, i);
		lastSalary = futureSalary;
		const contribution = futureSalary * CONTRIBUTION_RATE;
		// Rivaluta dal versamento alla pensione
		const yearsToGrow = yearsToRetirement - i;
		montante += contribution * Math.pow(1 + montanteRevaluationRate, yearsToGrow);
	}

	// Coefficiente di trasformazione
	const coefficient = getTransformationCoefficient(retirementAge);

	// Pensione annuale lorda
	const annualPension = montante * coefficient;
	const monthlyPension = annualPension / 13; // 13 mensilità in Italia

	// Tasso di sostituzione rispetto all'ultimo stipendio
	const replacementRate = lastSalary > 0 ? annualPension / lastSalary : 0;

	return {
		monthlyPension: Math.round(monthlyPension * 100) / 100,
		annualPension: Math.round(annualPension * 100) / 100,
		replacementRate: Math.round(replacementRate * 10000) / 10000,
		totalMontante: Math.round(montante * 100) / 100,
		transformationCoefficient: coefficient
	};
}

/**
 * Calcola il gap pensionistico: il costo del periodo tra il pensionamento
 * anticipato FIRE e l'inizio della pensione INPS.
 *
 * @param fireAge - Età di pensionamento FIRE
 * @param pensionAge - Età di accesso alla pensione INPS
 * @param annualExpenses - Spese annuali previste
 * @returns Costo totale del gap (spese * anni di gap)
 */
export function calculatePensionGap(
	fireAge: number,
	pensionAge: number,
	annualExpenses: number
): number {
	const gapYears = Math.max(0, pensionAge - fireAge);
	return annualExpenses * gapYears;
}

/**
 * Mesi di adeguamento dei requisiti pensionistici agli incrementi della
 * speranza di vita, per ANNO DI DECORRENZA. Dopo il blocco fino al 2026, il
 * decreto direttoriale 19/12/2025 (biennio 2027-2028) reintroduce l'adeguamento
 * in modo graduale: +1 mese dal 1/1/2027, +3 mesi dal 1/1/2028.
 * Fonti: INPS (msg./circ. 2026), decreto dir. MEF-MLPS 19/12/2025.
 *
 * @param year - Anno di decorrenza della pensione
 * @returns Mesi aggiuntivi da sommare ai requisiti (0 fino al 2026)
 */
export function lifeExpectancyAdjustmentMonths(year: number): number {
	if (year >= 2028) return 3;
	if (year >= 2027) return 1;
	return 0;
}

/**
 * Restituisce i requisiti pensionistici italiani per un dato anno di decorrenza,
 * applicando l'adeguamento alla speranza di vita (vedi lifeExpectancyAdjustmentMonths).
 * Per il 2025-2026 i requisiti sono quelli base (67 anni; anticipata 42a10m / 41a10m).
 *
 * @param referenceYear - Anno di decorrenza (default 2026 = nessun adeguamento)
 * @returns Oggetto con i tre canali di accesso alla pensione
 */
export function getPensionRequirements(referenceYear: number = 2026): PensionRequirements {
	const adj = lifeExpectancyAdjustmentMonths(referenceYear);

	const oldAgeMonths = 67 * 12 + adj;
	const earlyMenMonths = 42 * 12 + 10 + adj;
	const earlyWomenMonths = 41 * 12 + 10 + adj;
	const fmt = (m: number) => {
		const y = Math.floor(m / 12);
		const mm = m % 12;
		return mm > 0 ? `${y} anni e ${mm} mesi` : `${y} anni`;
	};

	return {
		oldAge: {
			age: oldAgeMonths / 12,
			minContributionYears: 20,
			description: `Pensione di vecchiaia: ${fmt(oldAgeMonths)} di età con almeno 20 anni di contributi`
		},
		early: {
			menYears: Math.floor(earlyMenMonths / 12),
			menMonths: earlyMenMonths % 12,
			womenYears: Math.floor(earlyWomenMonths / 12),
			womenMonths: earlyWomenMonths % 12,
			description: `Pensione anticipata: ${fmt(earlyMenMonths)} di contributi (uomini) o ${fmt(earlyWomenMonths)} (donne), indipendentemente dall'età`
		},
		earlyContributive: {
			age: 64,
			minContributionYears: 20,
			minPensionMultiple: 3,
			socialAllowanceMonthly: 534.41,
			description: 'Pensione anticipata contributiva: 64 anni, 20 anni di contributi, pensione >= 3 volte l\'assegno sociale (534,41 €/mese nel 2026)'
		}
	};
}

/**
 * Stima l'età di accesso alla pensione INPS basandosi su anno di nascita,
 * inizio contribuzione e genere.
 *
 * Verifica i tre canali e restituisce l'età più bassa raggiungibile.
 *
 * @param birthYear - Anno di nascita
 * @param contributionStartAge - Età di inizio contribuzione
 * @param gender - Genere ('M' | 'F')
 * @returns Età stimata di accesso alla pensione
 */
export function estimatePensionAge(
	birthYear: number,
	contributionStartAge: number,
	gender: 'M' | 'F'
): number {
	// L'adeguamento alla speranza di vita dipende dall'anno di decorrenza:
	// approssimiamo con l'anno in cui si compiono i 67 (canale vecchiaia).
	const referenceYear = birthYear + 67;
	const requirements = getPensionRequirements(referenceYear);

	// Canale 1: Pensione di vecchiaia (67 anni + adeguamento, con 20 anni di contributi)
	const oldAgeThreshold = requirements.oldAge.age;
	const contributionYearsAtOldAge = oldAgeThreshold - contributionStartAge;
	const oldAgeEligible = contributionYearsAtOldAge >= requirements.oldAge.minContributionYears;
	const oldAgeAge = oldAgeEligible ? oldAgeThreshold : Infinity;

	// Canale 2: Pensione anticipata (42a 10m uomini, 41a 10m donne)
	const requiredMonths = gender === 'M'
		? requirements.early.menYears * 12 + requirements.early.menMonths
		: requirements.early.womenYears * 12 + requirements.early.womenMonths;
	const earlyAge = contributionStartAge + requiredMonths / 12;

	// Canale 3: Pensione anticipata contributiva (64 anni, 20 anni contributi)
	// Solo per contribuenti interamente contributivi (dal 1996 in poi)
	const isFullContributive = birthYear + contributionStartAge >= 1996;
	const contributionYearsAt64 = 64 - contributionStartAge;
	const earlyContributiveAge =
		isFullContributive && contributionYearsAt64 >= requirements.earlyContributive.minContributionYears
			? 64
			: Infinity;

	// Restituisci l'età minima tra i canali disponibili
	const minAge = Math.min(oldAgeAge, earlyAge, earlyContributiveAge);

	// Se nessun canale è raggiungibile, restituisci l'età di vecchiaia (adeguata)
	return minAge === Infinity ? Math.ceil(oldAgeThreshold) : Math.ceil(minAge);
}
