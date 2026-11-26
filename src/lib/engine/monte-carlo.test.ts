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

describe('Monte Carlo - strategie di prelievo variabili e spesa reale', () => {
	// Mercato "costante": rendimento nominale 5%, inflazione 2% ogni anno (serie
	// storiche di un solo valore, campionate congiuntamente).
	const flat: MonteCarloParams = {
		...baseParams,
		initialPortfolio: 1_000_000,
		annualContribution: 0,
		annualExpenses: 30_000,
		withdrawalRate: 0.04,
		stockAllocation: 1,
		bondAllocation: 0,
		yearsToFire: 0,
		yearsInRetirement: 30,
		currentAge: 55,
		lifeExpectancy: 85,
		simulationMode: 'historical',
		jointHistoricalSampling: true,
		iterations: 50,
		historicalStockReturns: [0.05],
		historicalBondReturns: [0.05],
		historicalInflation: [0.02]
	};

	it('spesa fissa sostenibile: spesa reale = spese obiettivo ogni anno, mai sotto', () => {
		const r = runMonteCarloSimulation(flat);
		expect(r.spending!.p50).toHaveLength(30);
		expect(r.spending!.p50.every((v) => Math.abs(v - 30_000) <= 1)).toBe(true);
		expect(r.spending!.minMedian).toBeCloseTo(30_000, -1);
		expect(r.spending!.belowTargetRate).toBe(0);
	});

	it('portafoglio esaurito: la spesa scende ai soli redditi (pensione)', () => {
		const r = runMonteCarloSimulation({
			...flat,
			initialPortfolio: 100_000,
			annualPension: 10_000,
			pensionAge: 55
		});
		expect(r.successRate).toBe(0);
		expect(r.spending!.p50[29]).toBeCloseTo(10_000, -1);
		expect(r.spending!.belowTargetRate).toBe(1);
	});

	it('VPW: non esaurisce il portafoglio, ma con mercati volatili la spesa scende', () => {
		const r = runMonteCarloSimulation({
			...flat,
			withdrawalStrategy: 'vpw',
			iterations: 400,
			historicalStockReturns: [0.3, -0.25, 0.12, -0.1, 0.2],
			historicalBondReturns: [0.3, -0.25, 0.12, -0.1, 0.2],
			historicalInflation: [0.02, 0.02, 0.02, 0.02, 0.02]
		});
		expect(r.successRate).toBe(1);
		expect(r.spending!.minP10).toBeLessThan(r.spending!.p50[0]);
		expect(r.spending!.p90[29]).toBeGreaterThan(r.spending!.p10[29]);
	});

	it('die-with-X: eredita target indicizzata e spesa reale costante a rendimenti in linea col piano', () => {
		const X = 200_000;
		const r = runMonteCarloSimulation({
			...flat,
			withdrawalStrategy: 'amortized',
			targetBequest: X,
			// rendimento reale coerente col mercato simulato: 1,05/1,02 - 1
			plannedRealReturn: 1.05 / 1.02 - 1
		});
		// Eredita' in euro di oggi -> nominale a fine orizzonte (prima: ~200k invece di ~355k)
		const nominalTarget = X * Math.pow(1.02, 29);
		expect(Math.abs(r.medianFinalValue / nominalTarget - 1)).toBeLessThan(0.001);
		// Rata anticipata corretta: la spesa reale resta costante (prima calava ~15%)
		const s = r.spending!.p50;
		expect(Math.abs(s[29] - s[0])).toBeLessThanOrEqual(1);
	});

	it('fondo pensione (#41): gli incassi RITA riducono il prelievo negli anni previsti', () => {
		// Eta' nella convenzione del deterministico: 56 = primo anno di FIRE
		const base = runMonteCarloSimulation({ ...flat, annualExpenses: 60_000 });
		const withRita = runMonteCarloSimulation({
			...flat,
			annualExpenses: 60_000,
			pensionFundIncomeByAge: { 58: 20_000, 59: 20_000 }
		});
		const gap = (y: number) => withRita.percentiles.p50[y] - base.percentiles.p50[y];
		// anno MC 1 (eta' 56) e 2 (57): nessuna differenza
		expect(gap(1)).toBeCloseTo(0, -1);
		// dopo gli anni 3 e 4 (eta' 58, 59) il portafoglio e' piu' alto di ~2 x 20k rivalutati
		expect(gap(4)).toBeGreaterThan(40_000);
		expect(gap(4)).toBeLessThan(46_000);
	});
});

describe('Monte Carlo - capital gain alla vendita (capitalGainsTaxMode realization)', () => {
	// Mercato costante, inflazione nulla: risultati calcolabili a mano.
	const flat: MonteCarloParams = {
		...baseParams,
		initialPortfolio: 100_000,
		annualContribution: 0,
		annualExpenses: 10_000,
		withdrawalRate: 0,
		withdrawalStrategy: 'fixed',
		stockAllocation: 1,
		bondAllocation: 0,
		yearsToFire: 0,
		yearsInRetirement: 1,
		currentAge: 60,
		lifeExpectancy: 90,
		simulationMode: 'historical',
		jointHistoricalSampling: true,
		iterations: 10,
		historicalStockReturns: [0],
		historicalBondReturns: [0],
		historicalInflation: [0],
		capitalGainsTaxRate: 0.26
	};

	it('accumulo: nessuna imposta finche non si vende (differimento)', () => {
		const p = {
			...flat,
			annualExpenses: 0,
			yearsToFire: 10,
			historicalStockReturns: [0.1],
			historicalBondReturns: [0.1]
		};
		const accrual = runMonteCarloSimulation(p).medianFinalValue;
		const realization = runMonteCarloSimulation({
			...p,
			capitalGainsTaxMode: 'realization'
		}).medianFinalValue;
		expect(realization).toBeCloseTo(100_000 * Math.pow(1.1, 11), 0);
		expect(accrual).toBeCloseTo(100_000 * Math.pow(1 + 0.1 * 0.74, 11), 0);
	});

	it('vendita: G = N / (1 - aliquota x quota di plusvalenza)', () => {
		// Costo 50k su 100k -> plusvalenza 50% -> aliquota effettiva 13%
		const r = runMonteCarloSimulation({
			...flat,
			capitalGainsTaxMode: 'realization',
			initialCostBasis: 50_000
		});
		expect(r.medianFinalValue).toBeCloseTo(100_000 - 10_000 / 0.87, 0);
		expect(r.spending!.p50[0]).toBeCloseTo(10_000, 0);
	});

	it('sotto il costo di carico non si paga nulla (e nessun credito)', () => {
		const r = runMonteCarloSimulation({
			...flat,
			capitalGainsTaxMode: 'realization',
			initialCostBasis: 200_000
		});
		expect(r.medianFinalValue).toBeCloseTo(90_000, 0);
	});

	it('il costo di carico si riduce pro quota: seconda vendita coerente', () => {
		// Anno 1: vende 11.494,25 (costo -5.747,13); anno 2: stessa quota di plusvalenza
		const r = runMonteCarloSimulation({
			...flat,
			yearsInRetirement: 2,
			capitalGainsTaxMode: 'realization',
			initialCostBasis: 50_000
		});
		expect(r.medianFinalValue).toBeCloseTo(100_000 - (2 * 10_000) / 0.87, 0);
	});
});

describe('Monte Carlo - reddito livellato con la pensione (levelIncomeWithPension)', () => {
	// 300k, rendimento reale 0, pensione 20k dai 60 anni, orizzonte 50-80
	const p: MonteCarloParams = {
		...baseParams,
		initialPortfolio: 300_000,
		annualContribution: 0,
		annualExpenses: 0,
		withdrawalRate: 0.04,
		withdrawalStrategy: 'amortized',
		plannedRealReturn: 0,
		targetBequest: 0,
		stockAllocation: 1,
		bondAllocation: 0,
		yearsToFire: 0,
		yearsInRetirement: 30,
		currentAge: 50,
		lifeExpectancy: 80,
		annualPension: 20_000,
		pensionAge: 60,
		simulationMode: 'historical',
		jointHistoricalSampling: true,
		iterations: 10,
		historicalStockReturns: [0],
		historicalBondReturns: [0],
		historicalInflation: [0]
	};

	it('amortized: spesa totale piatta = (portafoglio + VA pensione) / anni', () => {
		const r = runMonteCarloSimulation({ ...p, levelIncomeWithPension: true });
		const level = (300_000 + 20 * 20_000) / 30;
		expect(r.spending!.p50[0]).toBeCloseTo(level, 0);
		expect(r.spending!.p50[9]).toBeCloseTo(level, 0);
		expect(r.spending!.p50[10]).toBeCloseTo(level, 0);
		expect(r.spending!.p50[29]).toBeCloseTo(level, 0);
	});

	it('senza livellamento la rata ignora la pensione futura (spesa bassa nel ponte)', () => {
		const r = runMonteCarloSimulation(p);
		expect(r.spending!.p50[0]).toBeCloseTo(10_000, 0);
		expect(r.spending!.p50[29]).toBeGreaterThan(20_000);
	});

	it('VPW: la rata si applica a portafoglio + VA dei redditi futuri', () => {
		const off = runMonteCarloSimulation({ ...p, withdrawalStrategy: 'vpw' });
		const on = runMonteCarloSimulation({
			...p,
			withdrawalStrategy: 'vpw',
			levelIncomeWithPension: true
		});
		expect(on.spending!.p50[0]).toBeCloseTo((off.spending!.p50[0] * 700_000) / 300_000, 0);
	});
});
