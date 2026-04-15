/**
 * Simulazione Monte Carlo per la pianificazione FIRE.
 * Supporta tre modalità: parametrica, storica e block bootstrap.
 * Può essere usato sia nel thread principale che nel Web Worker.
 */

import type { RiskEvent } from './risk-scenarios.js';
import { applyRiskEvent } from './risk-scenarios.js';
import type { YearlyProjection } from './fire-calculator.js';
import {
	gaussianRandom,
	logNormalReturn,
	bootstrapSample,
	blockBootstrapSample,
	calculatePercentiles,
	calculateMean,
	correlatedReturns
} from './statistics.js';
import { calculateWithdrawal } from './withdrawal.js';

/** Parametri della simulazione Monte Carlo */
export interface MonteCarloParams {
	/** Portafoglio iniziale */
	initialPortfolio: number;
	/** Contributo annuale (fase di accumulazione) */
	annualContribution: number;
	/** Spese annuali in pensione */
	annualExpenses: number;
	/** Tasso di prelievo (es. 0.04) */
	withdrawalRate: number;
	/** Strategia di prelievo */
	withdrawalStrategy: 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based';
	/** Allocazione in azioni (0..1) */
	stockAllocation: number;
	/** Allocazione in obbligazioni (0..1) */
	bondAllocation: number;
	/** Anni fino al FIRE (fase accumulazione) */
	yearsToFire: number;
	/** Anni in pensione (fase decumulo) */
	yearsInRetirement: number;
	/** Tasso di inflazione annuale */
	inflationRate: number;
	/** Modalità di simulazione */
	simulationMode: 'parametric' | 'historical' | 'block-bootstrap';
	/** Numero di iterazioni (simulazioni) */
	iterations: number;
	/** Rendimento atteso azioni (parametric) */
	expectedStockReturn?: number;
	/** Deviazione standard azioni (parametric) */
	stockStdDev?: number;
	/** Rendimento atteso obbligazioni (parametric) */
	expectedBondReturn?: number;
	/** Deviazione standard obbligazioni (parametric) */
	bondStdDev?: number;
	/** Rendimenti storici azioni (historical/bootstrap) */
	historicalStockReturns?: number[];
	/** Rendimenti storici obbligazioni (historical/bootstrap) */
	historicalBondReturns?: number[];
	/** Inflazione storica (historical/bootstrap) */
	historicalInflation?: number[];
	/** Eventi di rischio da applicare */
	riskEvents?: RiskEvent[];
	/** Età attuale (per VPW) */
	currentAge?: number;
	/** Aspettativa di vita (per VPW) */
	lifeExpectancy?: number;
	/** Rapporto CAPE (per CAPE-based) */
	capeRatio?: number;
	/** Usa rendimenti correlati (Cholesky) per modalita' parametrica */
	useCorrelation?: boolean;
	/** Correlazione azioni-obbligazioni (default 0.189) */
	stockBondCorrelation?: number;
	/** Callback per aggiornamenti di progresso */
	onProgress?: (percent: number) => void;
}

/** Risultato completo della simulazione Monte Carlo */
export interface MonteCarloResult {
	/** Tasso di successo (0..1): percentuale di simulazioni dove il portafoglio non si esaurisce */
	successRate: number;
	/** Valore mediano del portafoglio finale */
	medianFinalValue: number;
	/** Valore medio del portafoglio finale */
	meanFinalValue: number;
	/** Percentili per ogni anno: chiavi p5, p10, p25, p50, p75, p90, p95 */
	percentiles: Record<string, number[]>;
	/** Statistiche per ogni anno */
	yearlyStats: {
		year: number;
		median: number;
		mean: number;
		p5: number;
		p95: number;
		successRate: number;
	}[];
	/** Traiettoria peggiore */
	worstCase: number[];
	/** Traiettoria migliore */
	bestCase: number[];
	/** Anno mediano di fallimento, null se la maggior parte delle simulazioni hanno successo */
	failureYear: number | null;
}

/**
 * Genera un rendimento del portafoglio per un singolo anno in base alla modalità.
 */
function generateReturn(
	params: MonteCarloParams,
	year: number
): { stockReturn: number; bondReturn: number; inflation: number } {
	const mode = params.simulationMode;

	if (mode === 'parametric') {
		const useCorrelation = params.useCorrelation ?? true;
		const inflation = gaussianRandom(params.inflationRate, 0.01);

		if (useCorrelation) {
			// Genera rendimenti correlati con decomposizione di Cholesky
			const correlation = params.stockBondCorrelation ?? 0.189;
			const corrMatrix = [
				[1.0, correlation],
				[correlation, 1.0]
			];
			const means = [
				params.expectedStockReturn ?? 0.07,
				params.expectedBondReturn ?? 0.03
			];
			const stdDevs = [
				params.stockStdDev ?? 0.16,
				params.bondStdDev ?? 0.06
			];
			const [stockReturn, bondReturn] = correlatedReturns(means, stdDevs, corrMatrix);
			return { stockReturn, bondReturn, inflation: Math.max(0, inflation) };
		}

		// Rendimenti indipendenti (fallback)
		const stockReturn = logNormalReturn(
			params.expectedStockReturn ?? 0.07,
			params.stockStdDev ?? 0.16
		);
		const bondReturn = gaussianRandom(
			params.expectedBondReturn ?? 0.03,
			params.bondStdDev ?? 0.06
		);
		return { stockReturn, bondReturn, inflation: Math.max(0, inflation) };
	}

	if (mode === 'historical') {
		const stockReturns = params.historicalStockReturns ?? [];
		const bondReturns = params.historicalBondReturns ?? [];
		const inflationHist = params.historicalInflation ?? [];

		return {
			stockReturn: bootstrapSample(stockReturns.length > 0 ? stockReturns : [0.07]),
			bondReturn: bootstrapSample(bondReturns.length > 0 ? bondReturns : [0.03]),
			inflation: bootstrapSample(inflationHist.length > 0 ? inflationHist : [params.inflationRate])
		};
	}

	// block-bootstrap: usa blocchi pre-generati passati come contesto
	// Se non ci sono blocchi pre-generati, usa bootstrap semplice come fallback
	const stockReturns = params.historicalStockReturns ?? [];
	const bondReturns = params.historicalBondReturns ?? [];
	const inflationHist = params.historicalInflation ?? [];

	return {
		stockReturn: bootstrapSample(stockReturns.length > 0 ? stockReturns : [0.07]),
		bondReturn: bootstrapSample(bondReturns.length > 0 ? bondReturns : [0.03]),
		inflation: bootstrapSample(inflationHist.length > 0 ? inflationHist : [params.inflationRate])
	};
}

/**
 * Esegue una singola simulazione Monte Carlo (una traiettoria).
 *
 * @returns Array dei valori del portafoglio per ogni anno
 */
function runSingleSimulation(params: MonteCarloParams): number[] {
	const totalYears = params.yearsToFire + params.yearsInRetirement;
	const portfolioValues: number[] = [];
	let portfolio = params.initialPortfolio;
	let initialRetirementPortfolio = 0;
	let previousWithdrawal = 0;

	// Pre-genera blocchi per block-bootstrap (preserva autocorrelazione)
	let pregenStockReturns: number[] | null = null;
	let pregenBondReturns: number[] | null = null;
	let pregenInflation: number[] | null = null;

	if (params.simulationMode === 'block-bootstrap') {
		const blockSize = 5;
		const stockData = params.historicalStockReturns ?? [0.07];
		const bondData = params.historicalBondReturns ?? [0.03];
		const inflData = params.historicalInflation ?? [params.inflationRate];

		pregenStockReturns = [];
		pregenBondReturns = [];
		pregenInflation = [];

		// Genera blocchi contigui fino a coprire tutti gli anni
		for (let i = 0; i < totalYears; i += blockSize) {
			const sBlock = blockBootstrapSample(stockData, blockSize);
			const bBlock = blockBootstrapSample(bondData, blockSize);
			const iBlock = blockBootstrapSample(inflData, blockSize);
			pregenStockReturns.push(...sBlock);
			pregenBondReturns.push(...bBlock);
			pregenInflation.push(...iBlock);
		}
	}

	for (let year = 0; year < totalYears; year++) {
		const isRetired = year >= params.yearsToFire;
		const retirementYear = isRetired ? year - params.yearsToFire : 0;

		// Salva il portafoglio all'inizio della pensione
		if (year === params.yearsToFire) {
			initialRetirementPortfolio = portfolio;
			previousWithdrawal = portfolio * params.withdrawalRate;
		}

		// Genera rendimenti casuali (usa blocchi pre-generati per block-bootstrap)
		let stockReturn: number, bondReturn: number, inflation: number;
		if (pregenStockReturns && pregenBondReturns && pregenInflation) {
			stockReturn = pregenStockReturns[year] ?? 0.07;
			bondReturn = pregenBondReturns[year] ?? 0.03;
			inflation = Math.max(0, pregenInflation[year] ?? params.inflationRate);
		} else {
			const returns = generateReturn(params, year);
			stockReturn = returns.stockReturn;
			bondReturn = returns.bondReturn;
			inflation = returns.inflation;
		}

		// Rendimento ponderato del portafoglio
		const portfolioReturn =
			stockReturn * params.stockAllocation + bondReturn * params.bondAllocation;

		// Fase di accumulazione: aggiungi contributi
		if (!isRetired) {
			portfolio += params.annualContribution;
		}

		// Applica rendimenti
		const returns = portfolio * portfolioReturn;
		portfolio += returns;

		// Fase di decumulo: preleva
		if (isRetired && portfolio > 0) {
			let withdrawal: number;

			switch (params.withdrawalStrategy) {
				case 'fixed':
					withdrawal = calculateWithdrawal('fixed', {
						initialPortfolio: initialRetirementPortfolio,
						portfolio,
						rate: params.withdrawalRate,
						inflationRate: inflation,
						year: retirementYear
					});
					break;

				case 'vpw':
					withdrawal = calculateWithdrawal('vpw', {
						portfolio,
						age: (params.currentAge ?? 40) + year,
						lifeExpectancy: params.lifeExpectancy ?? 90
					});
					break;

				case 'guyton-klinger':
					withdrawal = calculateWithdrawal('guyton-klinger', {
						portfolio,
						guytonKlinger: {
							portfolio,
							initialWithdrawal: initialRetirementPortfolio * params.withdrawalRate,
							initialRate: params.withdrawalRate,
							inflationRate: inflation,
							year: retirementYear,
							previousWithdrawal:
								retirementYear === 0
									? initialRetirementPortfolio * params.withdrawalRate
									: previousWithdrawal
						}
					});
					break;

				case 'cape-based':
					withdrawal = calculateWithdrawal('cape-based', {
						portfolio,
						capeRatio: params.capeRatio ?? 25
					});
					break;

				default:
					withdrawal = portfolio * params.withdrawalRate;
			}

			previousWithdrawal = withdrawal;
			portfolio -= withdrawal;
		}

		// Il portafoglio non può essere negativo
		portfolio = Math.max(0, portfolio);
		portfolioValues.push(portfolio);
	}

	return portfolioValues;
}

/**
 * Esegue la simulazione Monte Carlo completa.
 *
 * Per ogni iterazione:
 * 1. Genera rendimenti casuali per ogni anno (parametrici o storici)
 * 2. Simula accumulazione e decumulo
 * 3. Applica la strategia di prelievo scelta
 * 4. Applica eventuali eventi di rischio
 * 5. Registra la traiettoria del portafoglio
 *
 * @param params - Parametri della simulazione
 * @returns Risultato aggregato con statistiche, percentili e traiettorie
 */
export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
	const totalYears = params.yearsToFire + params.yearsInRetirement;
	const iterations = Math.max(1, params.iterations);

	// Matrice di tutte le simulazioni: [iterazione][anno]
	const allSimulations: number[][] = [];

	// Progresso
	const progressStep = Math.max(1, Math.floor(iterations / 10));

	for (let i = 0; i < iterations; i++) {
		let trajectory = runSingleSimulation(params);

		// Applica eventi di rischio se presenti
		if (params.riskEvents && params.riskEvents.length > 0) {
			// Converti traiettoria in YearlyProjection per l'applicazione degli eventi
			let projections: YearlyProjection[] = trajectory.map((value, idx) => ({
				year: idx,
				age: (params.currentAge ?? 40) + idx,
				portfolio: value,
				contributions: idx < params.yearsToFire ? params.annualContribution : 0,
				withdrawals: idx >= params.yearsToFire ? params.annualExpenses : 0,
				returns: 0,
				taxes: 0,
				netWorth: value
			}));

			for (const event of params.riskEvents) {
				// Aggiusta yearOfOccurrence relativo all'inizio della pensione
				const adjustedEvent: RiskEvent = {
					...event,
					impact: {
						...event.impact,
						yearOfOccurrence: params.yearsToFire + event.impact.yearOfOccurrence
					}
				};
				projections = applyRiskEvent(projections, adjustedEvent);
			}

			trajectory = projections.map((p) => p.portfolio);
		}

		allSimulations.push(trajectory);

		// Report progresso
		if (params.onProgress && (i + 1) % progressStep === 0) {
			params.onProgress(((i + 1) / iterations) * 100);
		}
	}

	// === Calcolo statistiche ===

	// Valori finali
	const finalValues = allSimulations.map((sim) => sim[sim.length - 1] ?? 0);

	// Tasso di successo: portafoglio finale > 0
	const successCount = finalValues.filter((v) => v > 0).length;
	const successRate = successCount / iterations;

	// Percentili anno per anno
	const percentileKeys = ['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'];
	const percentileValues = [5, 10, 25, 50, 75, 90, 95];
	const percentiles: Record<string, number[]> = {};
	for (const key of percentileKeys) {
		percentiles[key] = [];
	}

	const yearlyStats: MonteCarloResult['yearlyStats'] = [];

	// Traiettorie estreme
	const worstCase: number[] = [];
	const bestCase: number[] = [];

	for (let yearIdx = 0; yearIdx < totalYears; yearIdx++) {
		const yearValues = allSimulations.map((sim) => sim[yearIdx] ?? 0);

		const percs = calculatePercentiles(yearValues, percentileValues);
		for (let p = 0; p < percentileKeys.length; p++) {
			percentiles[percentileKeys[p]].push(Math.round(percs[p]));
		}

		const mean = calculateMean(yearValues);
		const yearSuccess = yearValues.filter((v) => v > 0).length / iterations;

		yearlyStats.push({
			year: yearIdx + 1,
			median: Math.round(percs[3]), // p50
			mean: Math.round(mean),
			p5: Math.round(percs[0]),
			p95: Math.round(percs[6]),
			successRate: yearSuccess
		});

		// Worst/best case: usa p5 e p95 come proxy
		worstCase.push(Math.round(percs[0]));
		bestCase.push(Math.round(percs[6]));
	}

	// Anno mediano di fallimento
	let failureYear: number | null = null;
	if (successRate < 1) {
		const failureYears: number[] = [];
		for (const sim of allSimulations) {
			const failIdx = sim.findIndex((v) => v <= 0);
			if (failIdx >= 0) {
				failureYears.push(failIdx + 1);
			}
		}
		if (failureYears.length > 0) {
			failureYears.sort((a, b) => a - b);
			failureYear = failureYears[Math.floor(failureYears.length / 2)];
		}
	}

	// Mediana e media dei valori finali
	const sortedFinal = [...finalValues].sort((a, b) => a - b);
	const medianFinalValue = sortedFinal[Math.floor(sortedFinal.length / 2)];
	const meanFinalValue = calculateMean(finalValues);

	return {
		successRate: Math.round(successRate * 10000) / 10000,
		medianFinalValue: Math.round(medianFinalValue),
		meanFinalValue: Math.round(meanFinalValue),
		percentiles,
		yearlyStats,
		worstCase,
		bestCase,
		failureYear
	};
}
