import { describe, it, expect } from 'vitest';
import {
	calculateFireNumber,
	calculateFireVariants,
	calculateSavingsRate,
	calculateCoastFireNumber,
	calculateFundedRatio,
	spendingSmileFactor,
	projectPortfolio,
	type SpendingSmileConfig
} from './fire-calculator';

describe('calculateFundedRatio', () => {
	it('liquido / FIRE number', () => {
		expect(calculateFundedRatio(500000, 1000000)).toBe(0.5);
		expect(calculateFundedRatio(1000000, 1000000)).toBe(1);
	});
	it('FIRE number non positivo -> 0', () => {
		expect(calculateFundedRatio(500000, 0)).toBe(0);
	});
});

describe('spendingSmileFactor', () => {
	const smile: SpendingSmileConfig = {
		enabled: true,
		goGoEndAge: 75,
		slowGoFactor: 0.85,
		noGoStartAge: 85,
		noGoFactor: 1.1
	};
	it('disabilitato o assente -> sempre 1', () => {
		expect(spendingSmileFactor(80, { ...smile, enabled: false })).toBe(1);
		expect(spendingSmileFactor(80, undefined)).toBe(1);
	});
	it('fasi go-go / slow-go / no-go', () => {
		expect(spendingSmileFactor(70, smile)).toBe(1); // go-go
		expect(spendingSmileFactor(80, smile)).toBe(0.85); // slow-go
		expect(spendingSmileFactor(90, smile)).toBe(1.1); // no-go
	});
});

describe('projectPortfolio + spending smile', () => {
	const base = {
		initialPortfolio: 800000,
		annualContribution: 0,
		annualExpenses: 30000,
		expectedReturn: 0.04,
		inflationRate: 0.02,
		taxRate: 0.26,
		withdrawalRate: 0.04,
		currentAge: 60,
		retirementAge: 60,
		lifeExpectancy: 90,
		startYear: 2026
	};
	it('lo smile che riduce le spese lascia piu capitale a fine vita', () => {
		const noSmile = projectPortfolio(base);
		const withSmile = projectPortfolio({
			...base,
			spendingSmile: {
				enabled: true,
				goGoEndAge: 70,
				slowGoFactor: 0.8,
				noGoStartAge: 999, // niente risalita
				noGoFactor: 1
			}
		});
		const finalNo = noSmile[noSmile.length - 1].portfolio;
		const finalSmile = withSmile[withSmile.length - 1].portfolio;
		expect(finalSmile).toBeGreaterThan(finalNo);
	});
});

describe('projectPortfolio + bucket obiettivo eredità (#38)', () => {
	it('eredità goal-università: deposita nel bucket e copre i costi universitari', () => {
		const proj = projectPortfolio({
			initialPortfolio: 300000,
			annualContribution: 0,
			annualExpenses: 20000,
			expectedReturn: 0.05,
			inflationRate: 0,
			taxRate: 0.26,
			withdrawalRate: 0.04,
			currentAge: 40,
			retirementAge: 60,
			lifeExpectancy: 70,
			startYear: 2026,
			children: [
				{
					name: 'Leo',
					birthYear: 2018,
					monthlyExpense: 0,
					independenceAge: 25,
					universityStartAge: 19,
					universityYears: 5,
					universityAnnualCost: 10000
				}
			],
			lifeEvents: [
				{
					id: 'x',
					type: 'inheritance',
					label: 'Eredità',
					year: 2028,
					durationYears: 0,
					amount: 100000,
					percentage: 0,
					enabled: true,
					relationship: 'spouse-direct',
					isProperty: false,
					purchaseYear: 0,
					costBasis: 0,
					isPrimaryResidence: false,
					allocation: 'goal',
					goalAnnualReturn: 0.02,
					goalPurpose: 'university'
				}
			]
		});
		// nell'anno del deposito il bucket ha ~100k (netto sotto franchigia)
		const y2028 = proj.find((p) => p.year === 2028);
		expect(y2028?.goalBucketBalance ?? 0).toBeGreaterThan(90000);
		// Leo all'università a 19 anni (2037): quell'anno il bucket preleva i costi
		const uniYear = proj.find((p) => p.year === 2037);
		expect(uniYear?.goalBucketWithdrawal ?? 0).toBeGreaterThan(0);
	});
});

describe('calculateFireNumber', () => {
	it('spese / SWR', () => {
		expect(calculateFireNumber(24000, 0.04)).toBe(600000);
	});
	it('SWR <= 0 -> Infinity', () => {
		expect(calculateFireNumber(24000, 0)).toBe(Infinity);
	});
	it('spese <= 0 -> 0', () => {
		expect(calculateFireNumber(0, 0.04)).toBe(0);
	});
});

describe('calculateSavingsRate', () => {
	it('(reddito - spese) / reddito', () => {
		expect(calculateSavingsRate(40000, 24000)).toBeCloseTo(0.4, 6);
	});
});

describe('calculateCoastFireNumber', () => {
	it('a parita\' di eta\' = FIRE number', () => {
		expect(calculateCoastFireNumber(50, 50, 600000, 0.05)).toBe(600000);
	});
	it('sconta il FIRE number al rendimento reale', () => {
		// 30->60 (30 anni), realReturn ~ (1.07/1.02-1)=0.04902; 600000/(1.04902^30)
		const v = calculateCoastFireNumber(30, 60, 600000, 0.07, 0.02);
		expect(v).toBeGreaterThan(0);
		expect(v).toBeLessThan(600000);
	});
});

describe('calculateFireVariants', () => {
	const v = calculateFireVariants({ annualExpenses: 24000, withdrawalRate: 0.04 });
	const get = (k: string) => v.find((x) => x.key === k);

	it('restituisce 5 varianti', () => {
		expect(v.length).toBe(5);
	});
	it('FIRE standard = spese / SWR', () => {
		expect(get('standard')?.fireNumber).toBe(600000);
	});
	it('LeanFIRE al 70% delle spese di default', () => {
		expect(get('lean')?.annualExpenses).toBe(16800);
		expect(get('lean')?.fireNumber).toBe(420000);
	});
	it('FatFIRE 2x', () => {
		expect(get('fat')?.fireNumber).toBe(1200000);
	});
	it('BaristaFIRE: il portafoglio copre spese - reddito leggero', () => {
		// (24000 - 12000) / 0.04 = 300000
		expect(get('barista')?.fireNumber).toBe(300000);
	});
	it('moltiplicatori personalizzabili', () => {
		const cv = calculateFireVariants({
			annualExpenses: 20000,
			withdrawalRate: 0.04,
			leanMultiplier: 0.5,
			baristaIncome: 8000
		});
		expect(cv.find((x) => x.key === 'lean')?.annualExpenses).toBe(10000);
		// (20000 - 8000)/0.04 = 300000
		expect(cv.find((x) => x.key === 'barista')?.fireNumber).toBe(300000);
	});
});
