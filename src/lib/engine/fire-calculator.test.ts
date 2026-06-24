import { describe, it, expect } from 'vitest';
import {
	calculateFireNumber,
	calculateFireVariants,
	calculateSavingsRate,
	calculateCoastFireNumber
} from './fire-calculator';

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
