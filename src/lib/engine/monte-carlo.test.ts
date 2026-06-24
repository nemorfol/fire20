import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation, type MonteCarloParams } from './monte-carlo';

// Parametri base di una simulazione parametrica, con seed per riproducibilita'.
const baseParams: MonteCarloParams = {
	initialPortfolio: 100000,
	annualContribution: 10000,
	annualExpenses: 20000,
	withdrawalRate: 0.04,
	withdrawalStrategy: 'fixed',
	stockAllocation: 0.6,
	bondAllocation: 0.4,
	yearsToFire: 10,
	yearsInRetirement: 20,
	inflationRate: 0.02,
	simulationMode: 'parametric',
	iterations: 500,
	expectedStockReturn: 0.07,
	stockStdDev: 0.16,
	expectedBondReturn: 0.02,
	bondStdDev: 0.05,
	seed: 12345
};

describe('Monte Carlo - riproducibilita\' (seed)', () => {
	it('stesso seed -> risultati identici', () => {
		const a = runMonteCarloSimulation(baseParams);
		const b = runMonteCarloSimulation(baseParams);
		expect(a.successRate).toBe(b.successRate);
		expect(a.medianFinalValue).toBe(b.medianFinalValue);
		expect(a.meanFinalValue).toBe(b.meanFinalValue);
	});

	it('seed diverso -> in generale risultato diverso', () => {
		const a = runMonteCarloSimulation({ ...baseParams, seed: 1 });
		const b = runMonteCarloSimulation({ ...baseParams, seed: 2 });
		// Estremamente improbabile che mediana E media coincidano per puro caso.
		expect(a.medianFinalValue === b.medianFinalValue && a.meanFinalValue === b.meanFinalValue).toBe(
			false
		);
	});
});

describe('Monte Carlo - errore standard e IC del successRate', () => {
	it('SE binomiale = sqrt(p*(1-p)/N)', () => {
		const r = runMonteCarloSimulation(baseParams);
		const expectedSE = Math.sqrt((r.successRate * (1 - r.successRate)) / baseParams.iterations);
		expect(r.successRateStdError).toBeCloseTo(expectedSE, 4);
	});

	it('IC ~95% contiene il successRate ed e\' dentro [0,1]', () => {
		const r = runMonteCarloSimulation(baseParams);
		expect(r.successRateCI95.lower).toBeGreaterThanOrEqual(0);
		expect(r.successRateCI95.upper).toBeLessThanOrEqual(1);
		expect(r.successRateCI95.lower).toBeLessThanOrEqual(r.successRate);
		expect(r.successRate).toBeLessThanOrEqual(r.successRateCI95.upper);
	});
});
