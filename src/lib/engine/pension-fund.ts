/**
 * Motore di calcolo per il Fondo Pensione Complementare italiano.
 * Implementa le 5 modalita' di prestazione della riforma 2026 (Legge di Bilancio 2026).
 * Include calcoli per RITA e Riscatto Laurea.
 */

import { getTransformationCoefficient } from './pension-italy';

// ─── Tipi di prestazione ───────────────────────────────────────────────────────

export type PayoutStrategy = 'vitalizia' | 'durata-definita' | 'prelievi-liberi' | 'frazionata' | 'capitale-60';

export interface PayoutSimulationParams {
	/** Montante accumulato nel fondo pensione */
	montante: number;
	/** Eta' al momento dell'erogazione */
	age: number;
	/** Genere */
	gender: 'M' | 'F';
	/** Anni di partecipazione al fondo (per calcolo aliquota fiscale) */
	yearsInFund: number;
	/** Rendimento atteso annuo del capitale che resta nel fondo */
	expectedReturnRate: number;
	/** Tasso di inflazione atteso */
	inflationRate: number;
	/** Per rendita vitalizia: reversibilita' al coniuge */
	reversibile: boolean;
	/** Per erogazione in capitale: percentuale (0-60%) */
	capitalPercentage: number;
}

export interface YearlyPayout {
	year: number;
	gross: number;
	tax: number;
	net: number;
	remainingCapital: number;
}

export interface PayoutSimulationResult {
	strategy: PayoutStrategy;
	strategyName: string;
	taxRate: number;
	yearlyPayouts: YearlyPayout[];
	totalGrossReceived: number;
	totalNetReceived: number;
	totalTaxPaid: number;
	capitalToHeirs: number;
	duration: number;
	monthlyNetAverage: number;
	pros: string[];
	cons: string[];
}

// ─── RITA ───────────────────────────────────────────────────────────────────────

export interface RITAParams {
	currentAge: number;
	pensionAge: number;
	unemploymentMonths: number;
	contributionYears: number;
	fondoPensioneBalance: number;
	yearsInFund: number;
	expectedReturnRate: number;
	/** Percentuale del montante da richiedere come RITA (0-100) */
	ritaPercentage: number;
}

export interface RITAResult {
	eligible: boolean;
	reason: string;
	earliestRITAAge: number;
	maxRequestable: number;
	ritaAmount: number;
	monthlyGross: number;
	monthlyNet: number;
	taxRate: number;
	durationMonths: number;
	totalNetReceived: number;
}

// ─── Riscatto Laurea ────────────────────────────────────────────────────────────

export interface RiscattoLaureaParams {
	yearsToRedeem: number;
	annualSalary: number;
	/** 'standard' o 'agevolato' */
	type: 'standard' | 'agevolato';
	currentAge: number;
	currentContributionYears: number;
	retirementAge: number;
	expectedMonthlyPension: number;
}

export interface RiscattoLaureaResult {
	totalCost: number;
	annualCost: number;
	taxDeduction: number;
	netCost: number;
	additionalMonthlyPension: number;
	earlierRetirementMonths: number;
	breakEvenYears: number;
	recommended: boolean;
	explanation: string;
}

// ─── Tabelle ISTAT aspettativa di vita ──────────────────────────────────────────

const LIFE_EXPECTANCY_MALE: [number, number][] = [
	[57, 25.5], [60, 23.0], [62, 21.3], [64, 19.6], [65, 18.8],
	[67, 17.2], [70, 14.8], [75, 11.0], [80, 7.8], [85, 5.2]
];

const LIFE_EXPECTANCY_FEMALE: [number, number][] = [
	[57, 29.0], [60, 26.3], [62, 24.5], [64, 22.7], [65, 21.8],
	[67, 20.1], [70, 17.5], [75, 13.4], [80, 9.8], [85, 6.8]
];

/**
 * Interpola l'aspettativa di vita residua dalla tabella ISTAT.
 */
export function getLifeExpectancy(age: number, gender: 'M' | 'F'): number {
	const table = gender === 'M' ? LIFE_EXPECTANCY_MALE : LIFE_EXPECTANCY_FEMALE;

	if (age <= table[0][0]) return table[0][1];
	const last = table[table.length - 1];
	if (age >= last[0]) return last[1];

	for (let i = 0; i < table.length - 1; i++) {
		const [a1, v1] = table[i];
		const [a2, v2] = table[i + 1];
		if (age >= a1 && age < a2) {
			const frac = (age - a1) / (a2 - a1);
			return v1 + frac * (v2 - v1);
		}
	}
	return last[1];
}

// ─── Fattori conversione rendita vitalizia ──────────────────────────────────────

const CONVERSION_FACTORS_MALE: [number, number][] = [
	[57, 0.038], [60, 0.042], [62, 0.046], [64, 0.048],
	[65, 0.050], [67, 0.054], [70, 0.060], [75, 0.070]
];

const CONVERSION_FACTORS_FEMALE: [number, number][] = [
	[57, 0.034], [60, 0.038], [62, 0.041], [64, 0.044],
	[65, 0.045], [67, 0.048], [70, 0.053], [75, 0.063]
];

function getConversionFactor(age: number, gender: 'M' | 'F', reversibile: boolean): number {
	const table = gender === 'M' ? CONVERSION_FACTORS_MALE : CONVERSION_FACTORS_FEMALE;

	let factor: number;
	if (age <= table[0][0]) {
		factor = table[0][1];
	} else if (age >= table[table.length - 1][0]) {
		factor = table[table.length - 1][1];
	} else {
		factor = table[table.length - 1][1];
		for (let i = 0; i < table.length - 1; i++) {
			const [a1, f1] = table[i];
			const [a2, f2] = table[i + 1];
			if (age >= a1 && age < a2) {
				const frac = (age - a1) / (a2 - a1);
				factor = f1 + frac * (f2 - f1);
				break;
			}
		}
	}
	// Nota: i due rami assegnano entrambi table[last][1] come fallback difensivo;
	// l'interpolazione avviene nel ciclo solo se age cade tra a1 e a2.

	// La reversibilita' riduce la rendita di circa 15%
	if (reversibile) {
		factor *= 0.85;
	}
	return factor;
}

// ─── Calcolo aliquota fiscale ───────────────────────────────────────────────────

/**
 * Calcola l'aliquota fiscale sulla prestazione del fondo pensione.
 * Standard: 15% base, -0.3%/anno oltre il 15°, minimo 9%.
 */
export function calculateBenefitTaxRate(yearsInFund: number): number {
	const extraYears = Math.max(0, yearsInFund - 15);
	const reduction = Math.min(extraYears * 0.003, 0.06);
	return 0.15 - reduction;
}

/**
 * Calcola l'aliquota fiscale per l'erogazione frazionata.
 * Frazionata: 20% base, -0.25%/anno oltre il 15°, minimo 15%.
 */
function calculateFrazionataTaxRate(yearsInFund: number): number {
	const extraYears = Math.max(0, yearsInFund - 15);
	const reduction = Math.min(extraYears * 0.0025, 0.05);
	return 0.20 - reduction;
}

// ─── Assegno sociale 2026 ───────────────────────────────────────────────────────

/** Assegno sociale mensile 2026 (stima) */
const SOCIAL_ALLOWANCE_MONTHLY_2026 = 534.41;

// ─── Simulazioni per strategia ──────────────────────────────────────────────────

function simulateVitalizia(params: PayoutSimulationParams): PayoutSimulationResult {
	const { montante, age, gender, yearsInFund, reversibile } = params;
	const taxRate = calculateBenefitTaxRate(yearsInFund);
	const convFactor = getConversionFactor(age, gender, reversibile);
	const lifeExp = getLifeExpectancy(age, gender);
	const duration = Math.round(lifeExp);

	const annualGross = montante * convFactor;
	const annualTax = annualGross * taxRate;
	const annualNet = annualGross - annualTax;

	const yearlyPayouts: YearlyPayout[] = [];
	for (let y = 1; y <= duration; y++) {
		yearlyPayouts.push({
			year: y,
			gross: Math.round(annualGross),
			tax: Math.round(annualTax),
			net: Math.round(annualNet),
			remainingCapital: 0 // Capitale trasferito alla compagnia assicurativa
		});
	}

	return {
		strategy: 'vitalizia',
		strategyName: 'Rendita Vitalizia',
		taxRate,
		yearlyPayouts,
		totalGrossReceived: Math.round(annualGross * duration),
		totalNetReceived: Math.round(annualNet * duration),
		totalTaxPaid: Math.round(annualTax * duration),
		capitalToHeirs: 0, // Capitale perso alla morte (salvo reversibilita')
		duration,
		monthlyNetAverage: Math.round(annualNet / 12),
		pros: [
			'Rendita garantita a vita, anche se si vive oltre l\'aspettativa',
			'Importo certo e stabile ogni mese',
			reversibile ? 'Reversibile al coniuge (60% della rendita)' : 'Tassazione agevolata (dal 15% al 9%)'
		],
		cons: [
			'Capitale trasferito alla compagnia assicurativa',
			'Nessun capitale agli eredi (salvo opzione reversibile)',
			'Rendita fissa, perde potere d\'acquisto con l\'inflazione',
			'Fattore di conversione spesso poco vantaggioso'
		]
	};
}

function simulateDurataDefinita(params: PayoutSimulationParams): PayoutSimulationResult {
	const { montante, age, gender, yearsInFund, expectedReturnRate } = params;
	const taxRate = calculateBenefitTaxRate(yearsInFund);
	const lifeExp = getLifeExpectancy(age, gender);
	const duration = Math.round(lifeExp);

	const yearlyPayouts: YearlyPayout[] = [];
	let remainingCapital = montante;
	let totalGross = 0;
	let totalTax = 0;
	let totalNet = 0;

	for (let y = 1; y <= duration; y++) {
		// Il capitale continua a generare rendimenti
		const returns = remainingCapital * expectedReturnRate;
		remainingCapital += returns;

		// Rata annuale = capitale rimanente / anni restanti
		const remainingYears = duration - y + 1;
		const annualGross = remainingCapital / remainingYears;
		const annualTax = annualGross * taxRate;
		const annualNet = annualGross - annualTax;

		remainingCapital -= annualGross;

		yearlyPayouts.push({
			year: y,
			gross: Math.round(annualGross),
			tax: Math.round(annualTax),
			net: Math.round(annualNet),
			remainingCapital: Math.round(Math.max(0, remainingCapital))
		});

		totalGross += annualGross;
		totalTax += annualTax;
		totalNet += annualNet;
	}

	// Capitale residuo agli eredi se si muore prima
	const midpointCapital = yearlyPayouts.length > 0
		? yearlyPayouts[Math.floor(yearlyPayouts.length / 2)]?.remainingCapital ?? 0
		: 0;

	return {
		strategy: 'durata-definita',
		strategyName: 'Rendita a Durata Definita',
		taxRate,
		yearlyPayouts,
		totalGrossReceived: Math.round(totalGross),
		totalNetReceived: Math.round(totalNet),
		totalTaxPaid: Math.round(totalTax),
		capitalToHeirs: midpointCapital,
		duration,
		monthlyNetAverage: duration > 0 ? Math.round(totalNet / duration / 12) : 0,
		pros: [
			'Capitale resta investito nel fondo: continua a generare rendimenti',
			'In caso di morte, il capitale residuo va agli eredi',
			'Tassazione agevolata (dal 15% al 9%)',
			'Pagamenti crescenti se i rendimenti sono buoni'
		],
		cons: [
			'Non protegge dalla longevita\': rendita si esaurisce al termine',
			'Il rendimento del fondo non e\' garantito',
			'Rata variabile, dipende dall\'andamento del fondo'
		]
	};
}

function simulatePrelieriLiberi(params: PayoutSimulationParams): PayoutSimulationResult {
	const { montante, age, gender, yearsInFund, expectedReturnRate } = params;
	const taxRate = calculateBenefitTaxRate(yearsInFund);
	const lifeExp = getLifeExpectancy(age, gender);
	const duration = Math.round(lifeExp);

	// I prelievi liberi hanno un tetto: non si puo' prelevare piu' di quanto
	// si sarebbe ricevuto con la rendita a durata definita (cumulativamente).
	// Simuliamo un prelievo uniforme ottimale.
	const yearlyPayouts: YearlyPayout[] = [];
	let remainingCapital = montante;
	let totalGross = 0;
	let totalTax = 0;
	let totalNet = 0;

	// Calcola il prelievo ottimale: simile a durata definita ma con piu' flessibilita'
	// Per semplicita', usiamo lo stesso schema ma con possibilita' di variare
	for (let y = 1; y <= duration; y++) {
		const returns = remainingCapital * expectedReturnRate;
		remainingCapital += returns;

		const remainingYears = duration - y + 1;
		// Con prelievi liberi, si puo' scegliere quanto prelevare (entro i limiti)
		// Simuliamo un prelievo uniforme
		const annualGross = remainingCapital / remainingYears;
		const annualTax = annualGross * taxRate;
		const annualNet = annualGross - annualTax;

		remainingCapital -= annualGross;

		yearlyPayouts.push({
			year: y,
			gross: Math.round(annualGross),
			tax: Math.round(annualTax),
			net: Math.round(annualNet),
			remainingCapital: Math.round(Math.max(0, remainingCapital))
		});

		totalGross += annualGross;
		totalTax += annualTax;
		totalNet += annualNet;
	}

	const midpointCapital = yearlyPayouts.length > 0
		? yearlyPayouts[Math.floor(yearlyPayouts.length / 2)]?.remainingCapital ?? 0
		: 0;

	return {
		strategy: 'prelievi-liberi',
		strategyName: 'Prelievi Liberi',
		taxRate,
		yearlyPayouts,
		totalGrossReceived: Math.round(totalGross),
		totalNetReceived: Math.round(totalNet),
		totalTaxPaid: Math.round(totalTax),
		capitalToHeirs: midpointCapital,
		duration,
		monthlyNetAverage: duration > 0 ? Math.round(totalNet / duration / 12) : 0,
		pros: [
			'Massima flessibilita\': prelevi quando vuoi e quanto vuoi',
			'Capitale resta investito nel fondo',
			'Tassazione agevolata (dal 15% al 9%)',
			'Ideale per chi ha altri redditi e non ha bisogno di un flusso costante',
			'Perfetto per la strategia FIRE: adatti i prelievi alle tue esigenze'
		],
		cons: [
			'Tetto massimo cumulativo: non puoi prelevare piu\' della rendita a durata definita',
			'Richiede disciplina nella gestione dei prelievi',
			'Il rendimento del fondo non e\' garantito',
			'Rischio di esaurire troppo presto il capitale se si preleva troppo'
		]
	};
}

function simulateFrazionata(params: PayoutSimulationParams): PayoutSimulationResult {
	const { montante, age, gender, yearsInFund, expectedReturnRate } = params;
	const taxRate = calculateFrazionataTaxRate(yearsInFund);
	const lifeExp = getLifeExpectancy(age, gender);
	// Erogazione frazionata: minimo 5 anni, massimo aspettativa di vita
	const duration = Math.max(5, Math.round(lifeExp));

	const yearlyPayouts: YearlyPayout[] = [];
	let remainingCapital = montante;
	let totalGross = 0;
	let totalTax = 0;
	let totalNet = 0;

	// L'erogazione frazionata divide il capitale in rate fisse
	const annualGrossBase = montante / duration;

	for (let y = 1; y <= duration; y++) {
		const returns = remainingCapital * expectedReturnRate;
		remainingCapital += returns;

		const annualGross = annualGrossBase;
		const annualTax = annualGross * taxRate;
		const annualNet = annualGross - annualTax;

		remainingCapital -= annualGross;

		yearlyPayouts.push({
			year: y,
			gross: Math.round(annualGross),
			tax: Math.round(annualTax),
			net: Math.round(annualNet),
			remainingCapital: Math.round(Math.max(0, remainingCapital))
		});

		totalGross += annualGross;
		totalTax += annualTax;
		totalNet += annualNet;
	}

	return {
		strategy: 'frazionata',
		strategyName: 'Erogazione Frazionata',
		taxRate,
		yearlyPayouts,
		totalGrossReceived: Math.round(totalGross),
		totalNetReceived: Math.round(totalNet),
		totalTaxPaid: Math.round(totalTax),
		capitalToHeirs: Math.round(Math.max(0, remainingCapital)),
		duration,
		monthlyNetAverage: duration > 0 ? Math.round(totalNet / duration / 12) : 0,
		pros: [
			'Semplice da comprendere: rate fisse',
			'Importo prevedibile ogni anno',
			'Capitale residuo (con rendimenti) va agli eredi'
		],
		cons: [
			'Tassazione piu\' alta: dal 20% al 15% (vs 15%-9% delle altre opzioni)',
			'Meno flessibilita\' rispetto ai prelievi liberi',
			'Non si adatta ai rendimenti del fondo',
			'Scelta generalmente meno vantaggiosa fiscalmente'
		]
	};
}

function simulateCapitale(params: PayoutSimulationParams): PayoutSimulationResult {
	const { montante, age, gender, yearsInFund, capitalPercentage, expectedReturnRate, reversibile } = params;
	const taxRate = calculateBenefitTaxRate(yearsInFund);
	const lifeExp = getLifeExpectancy(age, gender);
	const duration = Math.round(lifeExp);

	// Massimo 60% in capitale, il resto in rendita
	const capPct = Math.min(60, Math.max(0, capitalPercentage)) / 100;

	// Controlla se l'importo della rendita e' inferiore al 50% dell'assegno sociale
	// Se si', si puo' richiedere il 100% in capitale
	const annuityAmount = montante * (1 - capPct);
	const annualAnnuity = annuityAmount * getConversionFactor(age, gender, reversibile);
	const monthlyAnnuity = annualAnnuity / 12;
	const threshold = SOCIAL_ALLOWANCE_MONTHLY_2026 * 0.5;

	let effectiveCapPct = capPct;
	let fullCapitalAllowed = false;
	if (monthlyAnnuity < threshold && capPct < 1) {
		effectiveCapPct = 1;
		fullCapitalAllowed = true;
	}

	const capitalAmount = montante * effectiveCapPct;
	const annuityMontante = montante * (1 - effectiveCapPct);

	// Primo anno: capitale
	const capitalTax = capitalAmount * taxRate;
	const capitalNet = capitalAmount - capitalTax;

	const yearlyPayouts: YearlyPayout[] = [];
	let totalGross = capitalAmount;
	let totalTax = capitalTax;
	let totalNet = capitalNet;

	// Anno 1: erogazione del capitale
	yearlyPayouts.push({
		year: 1,
		gross: Math.round(capitalAmount),
		tax: Math.round(capitalTax),
		net: Math.round(capitalNet),
		remainingCapital: Math.round(annuityMontante)
	});

	// Anni successivi: rendita vitalizia sulla parte residua
	if (annuityMontante > 0) {
		const convFactor = getConversionFactor(age, gender, reversibile);
		const annualRenditaGross = annuityMontante * convFactor;
		const annualRenditaTax = annualRenditaGross * taxRate;
		const annualRenditaNet = annualRenditaGross - annualRenditaTax;

		for (let y = 2; y <= duration; y++) {
			yearlyPayouts.push({
				year: y,
				gross: Math.round(annualRenditaGross),
				tax: Math.round(annualRenditaTax),
				net: Math.round(annualRenditaNet),
				remainingCapital: 0
			});
			totalGross += annualRenditaGross;
			totalTax += annualRenditaTax;
			totalNet += annualRenditaNet;
		}
	}

	const pros: string[] = [
		`Ricevi subito ${Math.round(effectiveCapPct * 100)}% del montante in un'unica soluzione`,
		'Tassazione agevolata (dal 15% al 9%)',
		'Utile per estinguere un mutuo o fare un investimento importante'
	];
	if (fullCapitalAllowed) {
		pros.push('100% in capitale: rendita annua sotto soglia assegno sociale');
	}

	return {
		strategy: 'capitale-60',
		strategyName: fullCapitalAllowed ? 'Capitale 100%' : `Capitale ${Math.round(effectiveCapPct * 100)}% + Rendita`,
		taxRate,
		yearlyPayouts,
		totalGrossReceived: Math.round(totalGross),
		totalNetReceived: Math.round(totalNet),
		totalTaxPaid: Math.round(totalTax),
		capitalToHeirs: 0,
		duration: annuityMontante > 0 ? duration : 1,
		monthlyNetAverage: duration > 0 ? Math.round(totalNet / duration / 12) : Math.round(totalNet / 12),
		pros,
		cons: [
			'Perdi la rendita sulla parte in capitale',
			effectiveCapPct < 1 ? 'Massimo 60% in capitale (il resto obbligatoriamente in rendita)' : '',
			'Il capitale ricevuto va reinvestito autonomamente',
			'Rischio di consumare il capitale troppo velocemente'
		].filter(Boolean)
	};
}

// ─── Funzioni pubbliche ─────────────────────────────────────────────────────────

/**
 * Simula una singola strategia di erogazione del fondo pensione.
 */
export function simulatePayout(params: PayoutSimulationParams, strategy: PayoutStrategy): PayoutSimulationResult {
	switch (strategy) {
		case 'vitalizia': return simulateVitalizia(params);
		case 'durata-definita': return simulateDurataDefinita(params);
		case 'prelievi-liberi': return simulatePrelieriLiberi(params);
		case 'frazionata': return simulateFrazionata(params);
		case 'capitale-60': return simulateCapitale(params);
	}
}

/**
 * Confronta tutte e 5 le strategie di erogazione.
 */
export function compareAllStrategies(params: PayoutSimulationParams): PayoutSimulationResult[] {
	const strategies: PayoutStrategy[] = ['vitalizia', 'durata-definita', 'prelievi-liberi', 'frazionata', 'capitale-60'];
	return strategies.map(s => simulatePayout(params, s));
}

/**
 * Calcola l'idoneita' e la stima RITA.
 */
export function calculateRITA(params: RITAParams): RITAResult {
	const {
		currentAge, pensionAge, unemploymentMonths,
		contributionYears, fondoPensioneBalance,
		yearsInFund, expectedReturnRate, ritaPercentage
	} = params;

	const yearsToOldAge = 67 - currentAge;
	const taxRate = calculateBenefitTaxRate(yearsInFund);
	const ritaPct = Math.min(100, Math.max(0, ritaPercentage)) / 100;

	// Verifica idoneita'
	// Caso 1: fino a 5 anni prima (eta' >= 62), con 20+ anni di contributi
	// Caso 2: fino a 10 anni prima (eta' >= 57), disoccupato da 24+ mesi
	let eligible = false;
	let reason = '';
	let earliestAge = 67;

	if (yearsToOldAge <= 5 && contributionYears >= 20) {
		eligible = true;
		earliestAge = Math.max(62, currentAge);
		reason = `Idoneo: meno di 5 anni alla pensione di vecchiaia con ${contributionYears} anni di contributi (requisito: 20).`;
	} else if (yearsToOldAge <= 10 && unemploymentMonths >= 24) {
		eligible = true;
		earliestAge = Math.max(57, currentAge);
		reason = `Idoneo: inoccupato da ${unemploymentMonths} mesi (requisito: 24) e meno di 10 anni dalla pensione di vecchiaia.`;
	} else if (yearsToOldAge > 10) {
		reason = `Non idoneo: servono al massimo 10 anni alla pensione di vecchiaia (67 anni). Attualmente ne mancano ${yearsToOldAge.toFixed(0)}.`;
	} else if (yearsToOldAge > 5 && unemploymentMonths < 24) {
		reason = `Non idoneo: tra 5 e 10 anni dalla pensione, serve essere inoccupato da almeno 24 mesi (attualmente ${unemploymentMonths} mesi).`;
	} else {
		reason = `Non idoneo: servono almeno 20 anni di contributi (attualmente ${contributionYears}).`;
	}

	const ritaAmount = fondoPensioneBalance * ritaPct;
	const durationMonths = Math.max(1, (67 - Math.max(currentAge, earliestAge)) * 12);
	const monthlyGross = durationMonths > 0 ? ritaAmount / durationMonths : 0;
	const monthlyNet = monthlyGross * (1 - taxRate);

	return {
		eligible,
		reason,
		earliestRITAAge: earliestAge,
		maxRequestable: fondoPensioneBalance,
		ritaAmount: Math.round(ritaAmount),
		monthlyGross: Math.round(monthlyGross),
		monthlyNet: Math.round(monthlyNet),
		taxRate,
		durationMonths,
		totalNetReceived: Math.round(monthlyNet * durationMonths)
	};
}

/**
 * Calcola il costo e il beneficio del Riscatto Laurea.
 */
export function calculateRiscattoLaurea(params: RiscattoLaureaParams): RiscattoLaureaResult {
	const {
		yearsToRedeem, annualSalary, type,
		currentAge, currentContributionYears,
		retirementAge, expectedMonthlyPension
	} = params;

	// Costo standard: reddito annuo * aliquota contributiva * anni
	// Costo agevolato: ~5.776 EUR/anno (importo 2026)
	const AGEVOLATO_ANNUAL = 5776;
	const CONTRIBUTION_RATE = 0.33;

	const annualCost = type === 'agevolato'
		? AGEVOLATO_ANNUAL
		: annualSalary * CONTRIBUTION_RATE;
	const totalCost = annualCost * yearsToRedeem;

	// Deduzione fiscale 50% (Legge di Bilancio 2024/2026)
	const taxDeduction = totalCost * 0.50;
	const netCost = totalCost - taxDeduction;

	// Beneficio: piu' anni di contributi = montante piu' alto
	// Stima approssimativa dell'incremento pensionistico
	const additionalContributions = annualSalary * CONTRIBUTION_RATE * yearsToRedeem;
	// Coefficiente di trasformazione interpolato in base all'età di pensionamento
	const transformationCoeff = getTransformationCoefficient(retirementAge);
	const additionalAnnualPension = additionalContributions * transformationCoeff;
	const additionalMonthlyPension = additionalAnnualPension / 13;

	// Anticipo pensionistico
	const earlierRetirementMonths = yearsToRedeem * 12;

	// Break-even: costo netto / incremento annuale netto
	const netAnnualBenefit = additionalAnnualPension * (1 - 0.12); // Tassazione media pensione ~12%
	const breakEvenYears = netAnnualBenefit > 0
		? Math.ceil(netCost / netAnnualBenefit)
		: Infinity;

	const recommended = breakEvenYears <= 15 && breakEvenYears < Infinity;

	let explanation = '';
	if (recommended) {
		explanation = `Conviene: il costo netto di ${netCost.toLocaleString('it-IT', { maximumFractionDigits: 0 })}€ viene recuperato in circa ${breakEvenYears} anni di pensione. `;
		explanation += `Ottieni ${Math.round(additionalMonthlyPension)}€/mese in piu' e puoi anticipare la pensione di ${yearsToRedeem} anni.`;
	} else if (breakEvenYears <= 25) {
		explanation = `Valutazione incerta: il break-even e' a ${breakEvenYears} anni. Puo' convenire se si prevede una vita lunga. `;
		explanation += `Il riscatto agevolato potrebbe essere piu' vantaggioso.`;
	} else {
		explanation = `Non conviene in termini puramente economici: servirebbero ${breakEvenYears === Infinity ? 'troppi' : breakEvenYears} anni per recuperare il costo. `;
		explanation += `Valutare il riscatto agevolato o la convenienza di anticipare la pensione.`;
	}

	return {
		totalCost: Math.round(totalCost),
		annualCost: Math.round(annualCost),
		taxDeduction: Math.round(taxDeduction),
		netCost: Math.round(netCost),
		additionalMonthlyPension: Math.round(additionalMonthlyPension),
		earlierRetirementMonths,
		breakEvenYears: breakEvenYears === Infinity ? 99 : breakEvenYears,
		recommended,
		explanation
	};
}

// ─── Ottimizzatore contributi ───────────────────────────────────────────────────

export interface ContributionOptimizationParams {
	annualSalary: number;
	currentContribution: number;
	employerContribution: number;
	tfrToFund: boolean;
	firstEmploymentYear: number;
	fundJoinYear: number;
	currentYear: number;
	avgFirst5Contributions: number;
	currentAge: number;
	retirementAge: number;
	expectedReturnRate: number;
}

export interface ContributionOptimizationResult {
	ordinaryDeduction: number;
	extraDeduction: number;
	totalMaxDeduction: number;
	optimalContribution: number;
	irpefSaved: number;
	tfrAmount: number;
	projectedMontante: number;
	projectedMonthlyPension: number;
	levels: ContributionLevel[];
}

export interface ContributionLevel {
	label: string;
	annualContribution: number;
	taxSaving: number;
	netCost: number;
	montanteAt67: number;
}

/**
 * Calcola i risparmi IRPEF per diversi livelli di contribuzione al fondo pensione.
 */
export function optimizeContributions(params: ContributionOptimizationParams): ContributionOptimizationResult {
	const {
		annualSalary, currentContribution, employerContribution,
		tfrToFund, firstEmploymentYear, fundJoinYear, currentYear,
		avgFirst5Contributions, currentAge, retirementAge, expectedReturnRate
	} = params;

	// Limiti deducibilita'
	const ORDINARY_LIMIT = 5300;
	const EXTRA_LIMIT = 2650;
	const OLD_LIMIT = 5164.57;

	// Calcola extradeducibilita'
	const yearsInFund = currentYear - fundJoinYear;
	let extraDeduction = 0;

	if (firstEmploymentYear >= 2007 && yearsInFund > 5) {
		let totalAllowance = 0;
		for (let y = fundJoinYear; y < fundJoinYear + 5; y++) {
			totalAllowance += y < 2026 ? OLD_LIMIT : ORDINARY_LIMIT;
		}
		const totalUsed = avgFirst5Contributions * 5;
		const unusedAllowance = Math.max(0, totalAllowance - totalUsed);
		const recoveryYearsLeft = Math.max(0, 20 - (yearsInFund - 5));
		extraDeduction = recoveryYearsLeft > 0 ? Math.min(EXTRA_LIMIT, unusedAllowance / recoveryYearsLeft) : 0;
	}

	const totalMaxDeduction = ORDINARY_LIMIT + extraDeduction;

	// TFR annuale: stipendio / 13.5
	const annualTFR = tfrToFund ? annualSalary / 13.5 : 0;

	// Contributo ottimale = max deducibile - contributo datore - TFR
	const optimalContribution = Math.max(0, totalMaxDeduction - employerContribution - annualTFR);

	// Calcolo IRPEF risparmiata
	function irpefOnAmount(amount: number): number {
		if (amount <= 0) return 0;
		const brackets = [
			{ limit: 28000, rate: 0.23 },
			{ limit: 50000, rate: 0.33 },
			{ limit: Infinity, rate: 0.43 }
		];
		let remaining = amount;
		let tax = 0;
		let prev = 0;
		for (const b of brackets) {
			const taxable = Math.min(remaining, b.limit - prev);
			if (taxable <= 0) break;
			tax += taxable * b.rate;
			remaining -= taxable;
			prev = b.limit;
		}
		return tax;
	}

	// Risparmio IRPEF marginale
	const taxBefore = irpefOnAmount(annualSalary);
	const deductibleTotal = Math.min(currentContribution + employerContribution + annualTFR, totalMaxDeduction);
	const taxAfter = irpefOnAmount(annualSalary - deductibleTotal);
	const irpefSaved = taxBefore - taxAfter;

	// Proiezione montante alla pensione
	const yearsToRetirement = Math.max(0, retirementAge - currentAge);
	const annualTotal = currentContribution + employerContribution + annualTFR;
	let projectedMontante = 0;
	for (let y = 0; y < yearsToRetirement; y++) {
		projectedMontante = (projectedMontante + annualTotal) * (1 + expectedReturnRate);
	}

	// Pensione stimata con coefficiente interpolato per età
	const coefficient = getTransformationCoefficient(retirementAge);
	const projectedMonthlyPension = (projectedMontante * coefficient) / 13;

	// Livelli di contribuzione
	const levels: ContributionLevel[] = [
		{ label: '1.000 EUR/anno', annualContribution: 1000 },
		{ label: '2.500 EUR/anno', annualContribution: 2500 },
		{ label: '5.300 EUR/anno (max ordinario)', annualContribution: 5300 },
		{ label: `${Math.round(totalMaxDeduction).toLocaleString('it-IT')} EUR/anno (max totale)`, annualContribution: totalMaxDeduction }
	].map(l => {
		const totalWithEmployer = l.annualContribution + employerContribution + annualTFR;
		const deductible = Math.min(totalWithEmployer, totalMaxDeduction);
		const saving = irpefOnAmount(annualSalary) - irpefOnAmount(annualSalary - deductible);
		const netCost = l.annualContribution - saving;

		// Proiezione montante
		let mont = 0;
		for (let y = 0; y < yearsToRetirement; y++) {
			mont = (mont + totalWithEmployer) * (1 + expectedReturnRate);
		}

		return {
			...l,
			taxSaving: Math.round(saving),
			netCost: Math.round(netCost),
			montanteAt67: Math.round(mont)
		};
	});

	return {
		ordinaryDeduction: ORDINARY_LIMIT,
		extraDeduction: Math.round(extraDeduction),
		totalMaxDeduction: Math.round(totalMaxDeduction),
		optimalContribution: Math.round(optimalContribution),
		irpefSaved: Math.round(irpefSaved),
		tfrAmount: Math.round(annualTFR),
		projectedMontante: Math.round(projectedMontante),
		projectedMonthlyPension: Math.round(projectedMonthlyPension),
		levels
	};
}
