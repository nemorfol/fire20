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

describe("Monte Carlo - riproducibilita' (seed)", () => {
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

	it("IC ~95% contiene il successRate ed e' dentro [0,1]", () => {
		const r = runMonteCarloSimulation(baseParams);
		expect(r.successRateCI95.lower).toBeGreaterThanOrEqual(0);
		expect(r.successRateCI95.upper).toBeLessThanOrEqual(1);
		expect(r.successRateCI95.lower).toBeLessThanOrEqual(r.successRate);
		expect(r.successRate).toBeLessThanOrEqual(r.successRateCI95.upper);
	});
});

describe('Monte Carlo - coerenza fiscale col deterministico (#1)', () => {
	// Scenario che sopravvive (mediana finale positiva), cosi' l'effetto fiscale
	// e' osservabile sulla mediana e non mascherato da un portafoglio esaurito.
	const survivingParams: MonteCarloParams = {
		...baseParams,
		initialPortfolio: 1_000_000,
		annualContribution: 20000,
		annualExpenses: 20000,
		yearsToFire: 5,
		yearsInRetirement: 20
	};

	it('tassare il capital gain riduce la mediana finale (MC non piu ottimista "gratis")', () => {
		const untaxed = runMonteCarloSimulation({ ...survivingParams, capitalGainsTaxRate: 0 });
		const taxed = runMonteCarloSimulation({ ...survivingParams, capitalGainsTaxRate: 0.26 });
		expect(untaxed.medianFinalValue).toBeGreaterThan(0);
		expect(taxed.medianFinalValue).toBeLessThan(untaxed.medianFinalValue);
	});

	it('la quota esente da bollo (BFP) riduce l erosione patrimoniale', () => {
		const noExempt = runMonteCarloSimulation({
			...survivingParams,
			stampDutyRate: 0.002,
			bolloExemptShare: 0
		});
		const exempt = runMonteCarloSimulation({
			...survivingParams,
			stampDutyRate: 0.002,
			bolloExemptShare: 0.5
		});
		expect(exempt.medianFinalValue).toBeGreaterThan(noExempt.medianFinalValue);
	});

	it('default retrocompatibile: senza i nuovi parametri il MC non tassa i rendimenti', () => {
		const a = runMonteCarloSimulation(baseParams);
		const b = runMonteCarloSimulation({
			...baseParams,
			capitalGainsTaxRate: 0,
			bolloExemptShare: 0
		});
		expect(a.medianFinalValue).toBe(b.medianFinalValue);
	});
});

describe('Monte Carlo - campionamento storico congiunto (serie allineate per anno)', () => {
	// Azioni e bond perfettamente "anti-correlati" anno per anno: con un 50/50
	// abbinato per anno il rendimento di portafoglio e' SEMPRE +25%; campionando
	// le serie in modo indipendente escono anche +100% e -50%.
	const hist: MonteCarloParams = {
		...baseParams,
		initialPortfolio: 100000,
		annualContribution: 0,
		annualExpenses: 0,
		withdrawalRate: 0,
		stockAllocation: 0.5,
		bondAllocation: 0.5,
		yearsToFire: 5,
		yearsInRetirement: 0,
		simulationMode: 'historical',
		iterations: 300,
		historicalStockReturns: [1.0, -0.5],
		historicalBondReturns: [-0.5, 1.0],
		historicalInflation: [0.02, 0.02]
	};
	const expected = 100000 * Math.pow(1.25, 5);

	for (const mode of ['historical', 'block-bootstrap'] as const) {
		it(`${mode}: lo stesso anno storico per azioni e bond (esito deterministico)`, () => {
			const r = runMonteCarloSimulation({
				...hist,
				simulationMode: mode,
				jointHistoricalSampling: true
			});
			expect(r.percentiles.p5[4]).toBeCloseTo(expected, -1);
			expect(r.percentiles.p95[4]).toBeCloseTo(expected, -1);
		});
	}

	it('senza il flag (retrocompatibile) le serie restano indipendenti', () => {
		const r = runMonteCarloSimulation({ ...hist, jointHistoricalSampling: false });
		expect(r.percentiles.p95[4] - r.percentiles.p5[4]).toBeGreaterThan(1000);
	});

	it('multi-asset: lo stesso anno per tutte le asset class', () => {
		const r = runMonteCarloSimulation({
			...hist,
			jointHistoricalSampling: true,
			assetClasses: [
				{
					name: 'stocks',
					allocation: 0.5,
					expectedReturn: 0.07,
					stdDev: 0.16,
					historicalReturns: [1.0, -0.5]
				},
				{
					name: 'bonds',
					allocation: 0.5,
					expectedReturn: 0.03,
					stdDev: 0.06,
					historicalReturns: [-0.5, 1.0]
				}
			]
		});
		expect(r.percentiles.p5[4]).toBeCloseTo(expected, -1);
		expect(r.percentiles.p95[4]).toBeCloseTo(expected, -1);
	});

	it('serie di lunghezza diversa -> errore esplicito (non abbinamenti silenziosi)', () => {
		expect(() =>
			runMonteCarloSimulation({
				...hist,
				jointHistoricalSampling: true,
				historicalInflation: [0.02, 0.02, 0.02]
			})
		).toThrow(/allineate/);
	});
});
