/**
 * Sistema pensionistico italiano (INPS) per la pianificazione FIRE.
 * Implementa il metodo contributivo e i requisiti di accesso alla pensione.
 */

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
 * Coefficienti di trasformazione del montante contributivo.
 * Tabella INPS: convertono il montante in pensione annuale.
 * Aggiornati al biennio 2025-2026.
 */
const TRANSFORMATION_COEFFICIENTS: [number, number][] = [
	[57, 0.04186],
	[60, 0.04615],
	[62, 0.04915],
	[64, 0.05245],
	[65, 0.05428],
	[67, 0.05723],
	[69, 0.06053],
	[71, 0.06466]
];

/**
 * Aliquota contributiva IVS per lavoratori dipendenti.
 * 33% dello stipendio lordo (di cui ~9.19% a carico del lavoratore).
 */
const CONTRIBUTION_RATE = 0.33;

/**
 * Interpola il coefficiente di trasformazione per un'età specifica.
 * Usa interpolazione lineare tra i valori della tabella.
 *
 * @param age - Età di pensionamento
 * @returns Coefficiente di trasformazione
 */
export function getTransformationCoefficient(age: number): number {
	if (age <= TRANSFORMATION_COEFFICIENTS[0][0]) {
		return TRANSFORMATION_COEFFICIENTS[0][1];
	}

	const last = TRANSFORMATION_COEFFICIENTS[TRANSFORMATION_COEFFICIENTS.length - 1];
	if (age >= last[0]) {
		return last[1];
	}

	for (let i = 0; i < TRANSFORMATION_COEFFICIENTS.length - 1; i++) {
		const [age1, coeff1] = TRANSFORMATION_COEFFICIENTS[i];
		const [age2, coeff2] = TRANSFORMATION_COEFFICIENTS[i + 1];
		if (age >= age1 && age < age2) {
			const fraction = (age - age1) / (age2 - age1);
			return coeff1 + fraction * (coeff2 - coeff1);
		}
	}

	return last[1];
}

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
		montanteRevaluationRate = 0.015
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
	for (let i = currentContributionYears; i > 0; i--) {
		const yearsAgo = i;
		const pastSalary = currentSalary / Math.pow(1 + salaryGrowthRate, yearsAgo);
		const contribution = pastSalary * CONTRIBUTION_RATE;
		// Rivaluta fino ad oggi
		montante += contribution * Math.pow(1 + montanteRevaluationRate, yearsAgo);
	}

	// Montante per gli anni futuri fino alla pensione
	let lastSalary = currentSalary;
	for (let i = 1; i <= yearsToRetirement; i++) {
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
 * Restituisce i requisiti pensionistici italiani attuali (2026).
 *
 * @returns Oggetto con i tre canali di accesso alla pensione
 */
export function getPensionRequirements(): PensionRequirements {
	return {
		oldAge: {
			age: 67,
			minContributionYears: 20,
			description: 'Pensione di vecchiaia: 67 anni di età con almeno 20 anni di contributi'
		},
		early: {
			menYears: 42,
			menMonths: 10,
			womenYears: 41,
			womenMonths: 10,
			description: 'Pensione anticipata: 42 anni e 10 mesi di contributi (uomini) o 41 anni e 10 mesi (donne), indipendentemente dall\'età'
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
	const requirements = getPensionRequirements();

	// Canale 1: Pensione di vecchiaia (67 anni con 20 anni di contributi)
	const contributionYearsAt67 = 67 - contributionStartAge;
	const oldAgeEligible = contributionYearsAt67 >= requirements.oldAge.minContributionYears;
	const oldAgeAge = oldAgeEligible ? 67 : Infinity;

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

	// Se nessun canale è raggiungibile, restituisci l'età di vecchiaia
	return minAge === Infinity ? 67 : Math.ceil(minAge);
}
