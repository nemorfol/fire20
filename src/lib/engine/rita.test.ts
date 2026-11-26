import { describe, it, expect } from 'vitest';
import {
	pensionFundBenefitTaxRate,
	ritaEligibility,
	planPensionFund,
	pensionFundIncomePV,
	pensionFundPlanFromProfile
} from './rita';
import {
	calculateFireNumberWithPension,
	calculateLiquidNetWorth,
	calculateDeferredNetWorth,
	liquidMonthlyContributions,
	projectPortfolio
} from './fire-calculator';

const sum = (o: Record<number, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe('ritenuta su RITA e prestazioni (art. 11 c.6 D.Lgs. 252/2005)', () => {
	it('15% di base, -0,3 punti per anno oltre il 15°, minimo 9%', () => {
		expect(pensionFundBenefitTaxRate(undefined)).toBeCloseTo(0.15, 10);
		expect(pensionFundBenefitTaxRate(10)).toBeCloseTo(0.15, 10);
		expect(pensionFundBenefitTaxRate(20)).toBeCloseTo(0.135, 10);
		expect(pensionFundBenefitTaxRate(35)).toBeCloseTo(0.09, 10);
		expect(pensionFundBenefitTaxRate(50)).toBeCloseTo(0.09, 10);
	});
});

describe('requisiti RITA (art. 11 c.4 D.Lgs. 252/2005)', () => {
	it('Caso 1: >= 20 anni di contributi, al massimo 5 anni prima della vecchiaia', () => {
		expect(ritaEligibility(60, 67, 30)).toEqual({ case: 1, startAge: 62 });
	});
	it('senza 20 anni di contributi resta il Caso 2 (inoccupazione > 24 mesi)', () => {
		expect(ritaEligibility(60, 67, 10)).toEqual({ case: 2, startAge: 63 });
	});
	it('FIRE molto anticipato: il Caso 2 consente fino a 10 anni prima', () => {
		expect(ritaEligibility(50, 67, 25)).toEqual({ case: 2, startAge: 57 });
	});
	it('FIRE a ridosso della pensione: niente RITA', () => {
		expect(ritaEligibility(66, 67, 40)).toBeNull();
	});
});

describe('planPensionFund', () => {
	const base = {
		balance: 100_000,
		annualContribution: 0,
		realNetReturn: 0,
		currentAge: 55,
		retirementAge: 55,
		pensionAge: 67,
		lifeExpectancy: 90,
		inpsContributionYearsAtFire: 30
	};

	it('RITA a rendimento nullo: il montante netto viene erogato tutto prima della pensione', () => {
		const plan = planPensionFund(base);
		// Caso 2: max(55+3, 67-10) = 58 -> 9 rate (58..66)
		expect(plan.mode).toBe('rita');
		expect(plan.ritaCase).toBe(2);
		expect(plan.startAge).toBe(58);
		expect(plan.ritaEndAge).toBe(66);
		expect(Object.keys(plan.incomeByAge).length).toBe(9);
		expect(sum(plan.incomeByAge)).toBeCloseTo(85_000, 6);
		expect(plan.ritaAnnualNet).toBeCloseTo(85_000 / 9, 6);
		expect(plan.balanceByAge[66]).toBeCloseTo(0, 6);
		expect(plan.incomeByAge[67]).toBeUndefined();
	});

	it('con rendimento positivo le rate esauriscono esattamente il montante (VA = montante)', () => {
		const r = 0.02;
		const plan = planPensionFund({ ...base, realNetReturn: r });
		const start = plan.startAge!;
		let pv = 0;
		for (const [k, net] of Object.entries(plan.incomeByAge)) {
			pv += net / (1 - plan.taxRate) / Math.pow(1 + r, Number(k) - start);
		}
		expect(pv).toBeCloseTo(plan.balanceAtStart, 4);
		expect(plan.balanceByAge[66]).toBeCloseTo(0, 6);
	});

	it('il montante cresce con versamenti fino al FIRE e poi solo coi rendimenti', () => {
		const plan = planPensionFund({
			...base,
			balance: 0,
			annualContribution: 5_000,
			currentAge: 40,
			retirementAge: 50
		});
		// 10 versamenti (eta' 41..50), rendimento nullo
		expect(plan.balanceByAge[50]).toBeCloseTo(50_000, 6);
		expect(plan.balanceByAge[56]).toBeCloseTo(50_000, 6);
	});

	it('senza RITA: prestazione a pensionAge, 50% capitale + 50% rendita', () => {
		const plan = planPensionFund({ ...base, ritaEnabled: false });
		expect(plan.mode).toBe('prestazione');
		expect(plan.startAge).toBe(67);
		const annuity = 50_000 / 24; // 67..90 = 24 rate, r = 0
		expect(plan.incomeByAge[67]).toBeCloseTo((50_000 + annuity) * 0.85, 6);
		expect(plan.incomeByAge[80]).toBeCloseTo(annuity * 0.85, 6);
		expect(sum(plan.incomeByAge)).toBeCloseTo(85_000, 4);
	});

	it('fondo vuoto: nessun flusso', () => {
		const plan = planPensionFund({ ...base, balance: 0 });
		expect(plan.mode).toBe('none');
		expect(sum(plan.incomeByAge)).toBe(0);
	});

	it('dal profilo: rendimento del fondo tassato al 20% e anni INPS maturati al FIRE', () => {
		const plan = pensionFundPlanFromProfile(
			{
				portfolio: { pensionFund: 150_000 },
				monthlyContributions: { pensionFund: 0 },
				pension: { contributionYears: 15 }
			},
			{
				currentAge: 55,
				retirementAge: 60,
				pensionAge: 67,
				lifeExpectancy: 90,
				nominalReturn: 0.025,
				inflationRate: 0.02
			}
		);
		// 15 + 5 = 20 anni -> Caso 1, start max(61, 62) = 62
		expect(plan.ritaCase).toBe(1);
		expect(plan.startAge).toBe(62);
		// 2,5% x 0,8 = 2% nominale = inflazione -> montante reale costante
		expect(plan.balanceAtStart).toBeCloseTo(150_000, 4);
	});
});

describe('fondo pensione come asset differito nel motore FIRE (#41)', () => {
	it('il fondo pensione NON e piu nel patrimonio liquido', () => {
		const portfolio = { stocks: 100_000, bonds: 60_000, pensionFund: 150_000 };
		expect(calculateLiquidNetWorth(portfolio)).toBe(160_000);
		expect(calculateDeferredNetWorth(portfolio)).toBe(150_000);
	});

	it('i versamenti al fondo non alimentano il portafoglio liquido', () => {
		expect(liquidMonthlyContributions({ stocks: 500, pensionFund: 200, cash: 100 })).toBe(600);
	});

	it('FIRE Number a tre fasi: il VA della RITA riduce il capitale necessario', () => {
		const plan = planPensionFund({
			balance: 150_000,
			annualContribution: 0,
			realNetReturn: 0.02,
			currentAge: 55,
			retirementAge: 55,
			pensionAge: 67,
			lifeExpectancy: 90,
			inpsContributionYearsAtFire: 30
		});
		const common = {
			annualExpenses: 30_000,
			withdrawalRate: 0.04,
			annualPension: 18_000,
			retirementAge: 55,
			pensionAge: 67,
			lifeExpectancy: 90,
			realReturn: 0.02,
			currentAge: 55
		};
		const without = calculateFireNumberWithPension(common);
		const withRita = calculateFireNumberWithPension({
			...common,
			pensionFundIncomeByAge: plan.incomeByAge
		});
		const pv = pensionFundIncomePV(plan.incomeByAge, 55, 0.02);
		expect(pv).toBeGreaterThan(100_000);
		expect(without - withRita).toBeCloseTo(pv, 6);
	});

	it('proiezione: la RITA entra come reddito e riduce il prelievo dal portafoglio', () => {
		const plan = planPensionFund({
			balance: 90_000,
			annualContribution: 0,
			realNetReturn: 0,
			currentAge: 55,
			retirementAge: 55,
			pensionAge: 67,
			lifeExpectancy: 90,
			inpsContributionYearsAtFire: 30
		});
		const params = {
			initialPortfolio: 1_000_000,
			annualContribution: 0,
			annualExpenses: 30_000,
			expectedReturn: 0,
			inflationRate: 0,
			taxRate: 0,
			withdrawalRate: 0.04,
			currentAge: 55,
			retirementAge: 55,
			lifeExpectancy: 70,
			startYear: 2026
		};
		const a = projectPortfolio(params);
		const b = projectPortfolio({ ...params, pensionFundPlan: plan });
		const row = (rows: typeof a, age: number) => rows.find((r) => r.age === age)!;
		// eta' 58: prima rata RITA = 90.000/9 x 0,85 = 8.500
		expect(row(b, 58).pensionFundIncome).toBe(8_500);
		expect(row(a, 58).withdrawals - row(b, 58).withdrawals).toBeCloseTo(8_500, 6);
		expect(row(b, 57).pensionFundIncome).toBe(0);
		expect(row(b, 57).pensionFundBalance).toBe(90_000);
	});
});

describe('limite del capitale nella prestazione (L. 112/2026, art. 16-ter)', () => {
	it('il simulatore di erogazione non supera il 50% in capitale', async () => {
		const { simulatePayout, MAX_CAPITAL_PCT } = await import('./pension-fund');
		expect(MAX_CAPITAL_PCT).toBe(50);
		const params = {
			montante: 400_000,
			age: 67,
			gender: 'M' as const,
			yearsInFund: 20,
			expectedReturnRate: 0.03,
			inflationRate: 0.02,
			reversibile: false
		};
		const at50 = simulatePayout({ ...params, capitalPercentage: 50 }, 'capitale');
		const at60 = simulatePayout({ ...params, capitalPercentage: 60 }, 'capitale');
		expect(at60.strategyName).toBe(at50.strategyName);
		expect(at60.totalNetReceived).toBe(at50.totalNetReceived);
	});
});
