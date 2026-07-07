import { describe, it, expect } from 'vitest';
import {
	lifeExpectancyAdjustmentMonths,
	getPensionRequirements,
	estimatePensionAge,
	calculatePensionGap,
	calculateContributivePension
} from './pension-italy';

describe('Adeguamento speranza di vita (2027-2028)', () => {
	it('nessun adeguamento fino al 2026', () => {
		expect(lifeExpectancyAdjustmentMonths(2025)).toBe(0);
		expect(lifeExpectancyAdjustmentMonths(2026)).toBe(0);
	});
	it('+1 mese dal 2027, +3 mesi dal 2028', () => {
		expect(lifeExpectancyAdjustmentMonths(2027)).toBe(1);
		expect(lifeExpectancyAdjustmentMonths(2028)).toBe(3);
		expect(lifeExpectancyAdjustmentMonths(2035)).toBe(3);
	});
});

describe('getPensionRequirements', () => {
	it('2026 (default): vecchiaia 67, anticipata 42a10m / 41a10m', () => {
		const r = getPensionRequirements(2026);
		expect(r.oldAge.age).toBe(67);
		expect(r.early.menYears).toBe(42);
		expect(r.early.menMonths).toBe(10);
		expect(r.early.womenYears).toBe(41);
		expect(r.early.womenMonths).toBe(10);
	});
	it('2027: vecchiaia 67a1m, anticipata 42a11m / 41a11m', () => {
		const r = getPensionRequirements(2027);
		expect(r.oldAge.age).toBeCloseTo(67 + 1 / 12, 5);
		expect(r.early.menYears).toBe(42);
		expect(r.early.menMonths).toBe(11);
		expect(r.early.womenMonths).toBe(11);
	});
	it('2028: vecchiaia 67a3m, anticipata 43a1m / 42a1m', () => {
		const r = getPensionRequirements(2028);
		expect(r.oldAge.age).toBeCloseTo(67.25, 5);
		expect(r.early.menYears).toBe(43);
		expect(r.early.menMonths).toBe(1);
		expect(r.early.womenYears).toBe(42);
		expect(r.early.womenMonths).toBe(1);
	});
});

describe('estimatePensionAge', () => {
	it('contribuente pieno con carriera lunga: vince la contributiva a 64', () => {
		// nato 1990, inizio a 25 (2015 >= 1996 -> pienamente contributivo)
		expect(estimatePensionAge(1990, 25, 'M')).toBe(64);
	});
	it('vince la vecchiaia: l adeguamento sposta da 67 a 68 (ceil di 67a3m)', () => {
		// stesso profilo (inizio a 45, vince il canale vecchiaia), diversa decorrenza:
		// nato 1955 -> decorrenza ~2022 (nessun adeguamento) -> 67
		expect(estimatePensionAge(1955, 45, 'M')).toBe(67);
		// nato 1990 -> decorrenza ~2057 (+3 mesi) -> 67a3m -> ceil 68
		expect(estimatePensionAge(1990, 45, 'M')).toBe(68);
	});
});

describe('calculatePensionGap', () => {
	it('costo del ponte = spese * anni di gap', () => {
		expect(calculatePensionGap(50, 67, 20000)).toBe(340000);
	});
	it('nessun gap se FIRE coincide o supera la pensione', () => {
		expect(calculatePensionGap(67, 67, 20000)).toBe(0);
		expect(calculatePensionGap(70, 67, 20000)).toBe(0);
	});
});

describe('calculateContributivePension', () => {
	it('restituisce 0 se la pensione e prima dell eta attuale', () => {
		const r = calculateContributivePension({
			currentSalary: 30000,
			salaryGrowthRate: 0.02,
			currentContributionYears: 10,
			currentAge: 67,
			retirementAge: 67,
			inflationRate: 0.02
		});
		expect(r.annualPension).toBe(0);
	});
	it('stop contributi all età FIRE riduce la pensione (#37)', () => {
		const base = {
			currentSalary: 30000,
			salaryGrowthRate: 0.01,
			currentContributionYears: 10,
			currentAge: 40,
			retirementAge: 67,
			inflationRate: 0.02
		};
		const full = calculateContributivePension(base); // contribuzione fino a 67
		const stopAt50 = calculateContributivePension({ ...base, contributionEndAge: 50 });
		const stopAt67 = calculateContributivePension({ ...base, contributionEndAge: 67 });
		// fermarsi a 50 versa 17 anni di contributi in meno -> pensione minore
		expect(stopAt50.annualPension).toBeGreaterThan(0);
		expect(stopAt50.annualPension).toBeLessThan(full.annualPension);
		// stop all'età pensione = comportamento pieno (nessuna differenza)
		expect(stopAt67.annualPension).toBeCloseTo(full.annualPension, 2);
	});

	it('pensione positiva e crescente con lo stipendio', () => {
		const base = {
			salaryGrowthRate: 0.01,
			currentContributionYears: 10,
			currentAge: 40,
			retirementAge: 67,
			inflationRate: 0.02
		};
		const low = calculateContributivePension({ ...base, currentSalary: 25000 });
		const high = calculateContributivePension({ ...base, currentSalary: 50000 });
		expect(low.annualPension).toBeGreaterThan(0);
		expect(high.annualPension).toBeGreaterThan(low.annualPension);
		// coefficiente di trasformazione a 67 ~ 5,6%
		expect(low.transformationCoefficient).toBeGreaterThan(0.05);
		expect(low.transformationCoefficient).toBeLessThan(0.066);
	});
});
