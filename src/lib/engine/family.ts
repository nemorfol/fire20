/**
 * Calcoli relativi al profilo familiare: spese figli a carico (ricorrenti +
 * universita) e rate del mutuo. Usato da projectPortfolio e dal FIRE Number
 * per considerare i flussi aggiuntivi tipici del profilo italiano.
 */

import type { Child, Mortgage } from '$lib/db/index';

const DEFAULT_INDEPENDENCE_AGE = 25;

/**
 * Spesa annuale che un figlio genera in un dato anno di calendario.
 * Include la spesa corrente mensile (inflazionata) fino all'eta di
 * indipendenza e, se configurata, la spesa universitaria nei `universityYears`
 * successivi a `universityStartAge`.
 *
 * @param child - Profilo del figlio
 * @param calendarYear - Anno di riferimento
 * @param baseYear - Anno iniziale della simulazione (per calcolo inflazione)
 * @param inflationRate - Tasso di inflazione annuale (0.02 = 2%)
 */
export function childAnnualExpense(
	child: Child,
	calendarYear: number,
	baseYear: number,
	inflationRate: number
): number {
	const age = calendarYear - child.birthYear;
	const independenceAge = child.independenceAge ?? DEFAULT_INDEPENDENCE_AGE;
	if (age < 0 || age >= independenceAge) return 0;

	const yearsFromBase = Math.max(0, calendarYear - baseYear);
	const inflationFactor = Math.pow(1 + inflationRate, yearsFromBase);

	// Spesa corrente (sempre attiva fino a independenceAge)
	let total = (child.monthlyExpense || 0) * 12 * inflationFactor;

	// Spesa universitaria (se configurata): si sovrappone alla spesa corrente
	const uniStart = child.universityStartAge;
	const uniYears = child.universityYears ?? 0;
	const uniCost = child.universityAnnualCost ?? 0;
	if (uniStart !== undefined && uniYears > 0 && uniCost > 0) {
		if (age >= uniStart && age < uniStart + uniYears) {
			total += uniCost * inflationFactor;
		}
	}

	return total;
}

/**
 * Rata annuale del mutuo (monthlyPayment * 12) se ancora attivo nell'anno
 * di calendario indicato, 0 altrimenti. Nel mese in cui il mutuo termina a
 * meta anno, restituiamo il pro-quota sui mesi residui.
 *
 * @param mortgage - Profilo del mutuo
 * @param calendarYear - Anno di riferimento
 * @param baseYear - Anno iniziale della simulazione
 */
export function mortgageAnnualPayment(
	mortgage: Mortgage,
	calendarYear: number,
	baseYear: number
): number {
	if (!mortgage || mortgage.monthlyPayment <= 0) return 0;
	const yearsElapsed = calendarYear - baseYear;
	if (yearsElapsed < 0) return 0;

	const monthsElapsed = yearsElapsed * 12;
	const monthsLeftAtYearStart = mortgage.remainingMonths - monthsElapsed;
	if (monthsLeftAtYearStart <= 0) return 0;

	// Mesi pagati in questo anno: al massimo 12, o i residui se il mutuo
	// termina prima della fine dell'anno
	const monthsThisYear = Math.min(12, monthsLeftAtYearStart);
	return mortgage.monthlyPayment * monthsThisYear;
}

/**
 * Somma delle spese familiari (figli + mutuo) per un dato anno.
 * Comodo shortcut per arricchire `projectPortfolio`.
 */
export function totalFamilyExpenses(
	children: Child[] | undefined,
	mortgage: Mortgage | undefined,
	calendarYear: number,
	baseYear: number,
	inflationRate: number
): { children: number; mortgage: number; total: number } {
	let childrenTotal = 0;
	if (children && children.length > 0) {
		for (const c of children) {
			childrenTotal += childAnnualExpense(c, calendarYear, baseYear, inflationRate);
		}
	}
	const mortgageTotal = mortgage ? mortgageAnnualPayment(mortgage, calendarYear, baseYear) : 0;
	return {
		children: childrenTotal,
		mortgage: mortgageTotal,
		total: childrenTotal + mortgageTotal
	};
}

/**
 * Costo totale di un figlio fino all'eta di indipendenza, in euro di oggi
 * (somma non scontata al rendimento reale, solo inflazionata a livello cumulato).
 * Utile per la UI ("costerà circa X fino ai 25 anni").
 *
 * @param child - Profilo del figlio
 * @param baseYear - Anno corrente (usato come riferimento euro di oggi = 0 inflazione)
 * @returns Costo totale residuo da oggi
 */
export function childTotalRemainingCost(child: Child, baseYear: number): number {
	const independenceAge = child.independenceAge ?? DEFAULT_INDEPENDENCE_AGE;
	let total = 0;
	for (let year = baseYear; year < baseYear + 40; year++) {
		// Inflazione 0 = euro di oggi
		total += childAnnualExpense(child, year, baseYear, 0);
		const age = year - child.birthYear;
		if (age >= independenceAge) break;
	}
	return total;
}

/**
 * Capitale residuo del mutuo a una data futura, calcolato con AMMORTAMENTO
 * FRANCESE (rata costante, quota interessi decrescente, quota capitale
 * crescente). Sostituisce la vecchia approssimazione lineare.
 *
 * Formula: B_k = balance * [(1+i)^n - (1+i)^k] / [(1+i)^n - 1]
 * dove i = tasso mensile, n = mesi totali iniziali, k = mesi pagati.
 *
 * Per i = 0 (mutuo a tasso zero, edge case) si torna alla lineare. Per
 * mutui in cui la rata indicata non e' coerente con balance/rate/months
 * (utente l'ha messa a mano) si tollera lo scarto: la formula chiusa usa
 * solo balance/rate/n_initial e da' il residuo del piano teorico.
 *
 * @param mortgage - Profilo del mutuo (balance = capitale residuo OGGI a baseYear)
 * @param calendarYear - Anno di interesse
 * @param baseYear - Anno di riferimento (oggi)
 */
export function mortgageRemainingBalanceAt(
	mortgage: Mortgage,
	calendarYear: number,
	baseYear: number
): number {
	if (!mortgage || mortgage.remainingMonths <= 0) return 0;
	const monthsElapsed = Math.max(0, (calendarYear - baseYear) * 12);
	if (monthsElapsed >= mortgage.remainingMonths) return 0;

	const i = (mortgage.interestRate || 0) / 12;
	const n = mortgage.remainingMonths;
	const k = monthsElapsed;

	if (i <= 0) {
		const monthsLeft = n - k;
		return Math.round(((mortgage.balance * monthsLeft) / n) * 100) / 100;
	}

	const factorN = Math.pow(1 + i, n);
	const factorK = Math.pow(1 + i, k);
	const remaining = (mortgage.balance * (factorN - factorK)) / (factorN - 1);
	return Math.round(Math.max(0, remaining) * 100) / 100;
}

/** Riga del piano di ammortamento mensile francese */
export interface AmortizationRow {
	month: number; // 1-based
	payment: number; // rata mensile (costante)
	interest: number; // quota interessi
	principal: number; // quota capitale
	remainingBalance: number; // capitale residuo a fine mese
}

/**
 * Genera il piano di ammortamento francese mese per mese (rata costante).
 * Utile per la UI dettagliata "vedi rata per rata" e per separare quota
 * interessi (deducibile fino a 4.000€ * 19% se prima casa) da quota capitale.
 *
 * @param balance - Capitale iniziale
 * @param annualRate - Tasso annuo (es. 0.035)
 * @param totalMonths - Durata in mesi
 */
export function frenchAmortizationSchedule(
	balance: number,
	annualRate: number,
	totalMonths: number
): AmortizationRow[] {
	if (balance <= 0 || totalMonths <= 0) return [];
	const i = annualRate / 12;
	const payment =
		i === 0
			? balance / totalMonths
			: (balance * i * Math.pow(1 + i, totalMonths)) / (Math.pow(1 + i, totalMonths) - 1);

	const rows: AmortizationRow[] = [];
	let remaining = balance;
	for (let m = 1; m <= totalMonths; m++) {
		const interest = remaining * i;
		const principal = payment - interest;
		remaining = Math.max(0, remaining - principal);
		rows.push({
			month: m,
			payment: Math.round(payment * 100) / 100,
			interest: Math.round(interest * 100) / 100,
			principal: Math.round(principal * 100) / 100,
			remainingBalance: Math.round(remaining * 100) / 100
		});
	}
	return rows;
}

/**
 * Quota interessi totale pagata in un dato anno di calendario su un mutuo
 * a piano francese. Utile per calcolare la detrazione IRPEF sugli interessi
 * passivi della prima casa (19% fino a 4.000€).
 */
export function mortgageAnnualInterest(
	mortgage: Mortgage,
	calendarYear: number,
	baseYear: number
): number {
	if (!mortgage || mortgage.remainingMonths <= 0) return 0;
	const yearsElapsed = calendarYear - baseYear;
	if (yearsElapsed < 0) return 0;
	const monthsBefore = yearsElapsed * 12;
	if (monthsBefore >= mortgage.remainingMonths) return 0;

	const monthsLeft = Math.min(12, mortgage.remainingMonths - monthsBefore);
	const i = (mortgage.interestRate || 0) / 12;
	if (i <= 0) return 0;

	let total = 0;
	let remaining = mortgageRemainingBalanceAt(mortgage, calendarYear, baseYear);
	const payment = mortgage.monthlyPayment;
	for (let m = 0; m < monthsLeft; m++) {
		const interest = remaining * i;
		const principal = Math.max(0, payment - interest);
		remaining = Math.max(0, remaining - principal);
		total += interest;
	}
	return Math.round(total * 100) / 100;
}

/**
 * Calcola la rata mensile di un mutuo dato capitale, tasso annuo e mesi.
 * Formula standard ammortamento francese. Usato dall'UI per suggerimento
 * rapido quando l'utente inserisce balance+rate+months.
 */
export function calculateMortgageMonthlyPayment(
	balance: number,
	annualRate: number,
	months: number
): number {
	if (months <= 0 || balance <= 0) return 0;
	const monthlyRate = annualRate / 12;
	if (monthlyRate === 0) return balance / months;
	const factor = Math.pow(1 + monthlyRate, months);
	return (balance * monthlyRate * factor) / (factor - 1);
}
