/**
 * Time-Weighted Return (TWR) Calculator.
 * Usa il metodo Modified Dietz per calcolare il rendimento ponderato nel tempo
 * del portafoglio, confrontandolo con un benchmark (es. S&P 500).
 */

export interface PortfolioSnapshot {
	date: Date;
	totalValue: number;
	allocation: Record<string, number>; // asset class -> valore
}

export interface CashFlow {
	date: Date;
	amount: number; // positivo = contributo, negativo = prelievo
	type: 'contribution' | 'withdrawal' | 'dividend';
}

export interface PeriodReturn {
	startDate: Date;
	endDate: Date;
	return: number;
}

export interface TWRResult {
	totalReturn: number;
	annualizedReturn: number;
	periodReturns: PeriodReturn[];
}

/**
 * Calcola il TWR usando il metodo Modified Dietz tra snapshot consecutivi.
 *
 * Per ogni sotto-periodo tra snapshot:
 *   R = (V1 - V0 - CF) / (V0 + weighted_CF)
 *
 * dove weighted_CF = somma dei flussi pesati per la frazione di periodo rimanente.
 *
 * Il TWR complessivo si ottiene concatenando i rendimenti dei sotto-periodi:
 *   TWR = prodotto(1 + Ri) - 1
 *
 * Il rendimento annualizzato:
 *   (1 + TWR)^(365/giorni) - 1
 */
export function calculateTWR(
	snapshots: PortfolioSnapshot[],
	cashFlows: CashFlow[]
): TWRResult {
	if (snapshots.length < 2) {
		return { totalReturn: 0, annualizedReturn: 0, periodReturns: [] };
	}

	// Ordina snapshot per data
	const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
	const periodReturns: PeriodReturn[] = [];

	for (let i = 1; i < sorted.length; i++) {
		const startSnap = sorted[i - 1];
		const endSnap = sorted[i];
		const V0 = startSnap.totalValue;
		const V1 = endSnap.totalValue;

		// Filtra i cash flow nel sotto-periodo (esclusi gli estremi)
		const periodCFs = cashFlows.filter(
			(cf) => cf.date.getTime() > startSnap.date.getTime() && cf.date.getTime() <= endSnap.date.getTime()
		);

		const totalDays = daysBetween(startSnap.date, endSnap.date);

		// Somma netta dei cash flow
		const cfSum = periodCFs.reduce((sum, cf) => sum + cf.amount, 0);

		// Cash flow pesati (Modified Dietz weight)
		const weightedCF = periodCFs.reduce((sum, cf) => {
			const daysRemaining = daysBetween(cf.date, endSnap.date);
			const weight = totalDays > 0 ? daysRemaining / totalDays : 0;
			return sum + cf.amount * weight;
		}, 0);

		// Modified Dietz return
		const denominator = V0 + weightedCF;
		const periodReturn = denominator !== 0 ? (V1 - V0 - cfSum) / denominator : 0;

		periodReturns.push({
			startDate: startSnap.date,
			endDate: endSnap.date,
			return: periodReturn
		});
	}

	// Chain-link: TWR = prodotto(1 + Ri) - 1
	const totalReturn = periodReturns.reduce((acc, pr) => acc * (1 + pr.return), 1) - 1;

	// Annualizzazione
	const totalDays = daysBetween(sorted[0].date, sorted[sorted.length - 1].date);
	const annualizedReturn =
		totalDays > 0 ? Math.pow(1 + totalReturn, 365 / totalDays) - 1 : 0;

	return { totalReturn, annualizedReturn, periodReturns };
}

/**
 * Calcola il rendimento cumulativo di un benchmark (es. S&P 500) in un dato periodo.
 * I dati del benchmark sono rendimenti annuali in percentuale.
 *
 * Per periodi che non iniziano/finiscono esattamente a fine anno,
 * si usa interpolazione lineare del rendimento dell'anno parziale.
 */
export function calculateBenchmarkReturn(
	startDate: Date,
	endDate: Date,
	benchmarkData: { year: number; value: number }[]
): number {
	if (benchmarkData.length === 0) return 0;

	const startYear = startDate.getFullYear();
	const endYear = endDate.getFullYear();

	// Filtra gli anni nel range
	const relevantYears = benchmarkData.filter(
		(d) => d.year >= startYear && d.year <= endYear
	);

	if (relevantYears.length === 0) return 0;

	let cumulativeReturn = 1;

	for (const yearData of relevantYears) {
		const annualReturn = yearData.value / 100; // da percentuale a decimale

		if (yearData.year === startYear && yearData.year === endYear) {
			// Stesso anno: proporzione del periodo nell'anno
			const fractionOfYear = daysBetween(startDate, endDate) / 365;
			cumulativeReturn *= 1 + annualReturn * fractionOfYear;
		} else if (yearData.year === startYear) {
			// Anno iniziale: dalla data di inizio a fine anno
			const yearEnd = new Date(yearData.year, 11, 31);
			const fractionOfYear = daysBetween(startDate, yearEnd) / 365;
			cumulativeReturn *= 1 + annualReturn * fractionOfYear;
		} else if (yearData.year === endYear) {
			// Anno finale: da inizio anno alla data di fine
			const yearStart = new Date(yearData.year, 0, 1);
			const fractionOfYear = daysBetween(yearStart, endDate) / 365;
			cumulativeReturn *= 1 + annualReturn * fractionOfYear;
		} else {
			// Anno completo
			cumulativeReturn *= 1 + annualReturn;
		}
	}

	return cumulativeReturn - 1;
}

/**
 * Calcola l'alpha: differenza tra il rendimento del portafoglio e il benchmark.
 */
export function calculateAlpha(portfolioTWR: number, benchmarkReturn: number): number {
	return portfolioTWR - benchmarkReturn;
}

/**
 * Calcola il massimo drawdown dalla serie di valori cumulativi del portafoglio.
 * Max Drawdown = peggior calo percentuale dal picco massimo.
 */
export function calculateMaxDrawdown(snapshots: PortfolioSnapshot[]): number {
	if (snapshots.length < 2) return 0;

	const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
	let peak = sorted[0].totalValue;
	let maxDrawdown = 0;

	for (const snap of sorted) {
		if (snap.totalValue > peak) {
			peak = snap.totalValue;
		}
		const drawdown = peak > 0 ? (peak - snap.totalValue) / peak : 0;
		if (drawdown > maxDrawdown) {
			maxDrawdown = drawdown;
		}
	}

	return maxDrawdown;
}

/**
 * Genera la serie cumulativa del benchmark a partire da una data di inizio,
 * normalizzata a 100 al punto di partenza. Utile per il grafico di confronto.
 */
export function buildBenchmarkCumulativeSeries(
	startDate: Date,
	endDate: Date,
	benchmarkData: { year: number; value: number }[]
): { date: Date; value: number }[] {
	const startYear = startDate.getFullYear();
	const endYear = endDate.getFullYear();

	const series: { date: Date; value: number }[] = [{ date: startDate, value: 100 }];
	let cumulative = 100;

	for (let year = startYear; year <= endYear; year++) {
		const yearData = benchmarkData.find((d) => d.year === year);
		if (!yearData) continue;

		const annualReturn = yearData.value / 100;

		if (year === startYear) {
			// Proporzione dall'inizio alla fine dell'anno
			const yearEnd = new Date(year, 11, 31);
			const fraction = daysBetween(startDate, yearEnd) / 365;
			cumulative *= 1 + annualReturn * fraction;
			if (year < endYear) {
				series.push({ date: yearEnd, value: cumulative });
			}
		} else if (year === endYear) {
			const yearStart = new Date(year, 0, 1);
			const fraction = daysBetween(yearStart, endDate) / 365;
			cumulative *= 1 + annualReturn * fraction;
		} else {
			cumulative *= 1 + annualReturn;
			series.push({ date: new Date(year, 11, 31), value: cumulative });
		}
	}

	series.push({ date: endDate, value: cumulative });
	return series;
}

/**
 * Genera la serie cumulativa del portafoglio normalizzata a 100,
 * basata sugli snapshot e i cash flow.
 */
export function buildPortfolioCumulativeSeries(
	snapshots: PortfolioSnapshot[],
	cashFlows: CashFlow[]
): { date: Date; value: number }[] {
	if (snapshots.length === 0) return [];

	const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
	const series: { date: Date; value: number }[] = [{ date: sorted[0].date, value: 100 }];
	let cumulative = 100;

	for (let i = 1; i < sorted.length; i++) {
		const startSnap = sorted[i - 1];
		const endSnap = sorted[i];
		const V0 = startSnap.totalValue;
		const V1 = endSnap.totalValue;

		const periodCFs = cashFlows.filter(
			(cf) => cf.date.getTime() > startSnap.date.getTime() && cf.date.getTime() <= endSnap.date.getTime()
		);

		const totalDays = daysBetween(startSnap.date, endSnap.date);
		const cfSum = periodCFs.reduce((sum, cf) => sum + cf.amount, 0);
		const weightedCF = periodCFs.reduce((sum, cf) => {
			const daysRemaining = daysBetween(cf.date, endSnap.date);
			const weight = totalDays > 0 ? daysRemaining / totalDays : 0;
			return sum + cf.amount * weight;
		}, 0);

		const denominator = V0 + weightedCF;
		const periodReturn = denominator !== 0 ? (V1 - V0 - cfSum) / denominator : 0;

		cumulative *= 1 + periodReturn;
		series.push({ date: endSnap.date, value: cumulative });
	}

	return series;
}

// === Utility ===

function daysBetween(a: Date, b: Date): number {
	const msPerDay = 1000 * 60 * 60 * 24;
	return Math.abs(b.getTime() - a.getTime()) / msPerDay;
}
