import { describe, it, expect } from 'vitest';
import {
	amortizedWithdrawal,
	calculateWithdrawal,
	fixedWithdrawal,
	vpwWithdrawal
} from './withdrawal';

// Rata di rendita certa: W = spendable * r / (1 - (1+r)^-N)
const annuity = (spendable: number, r: number, N: number) =>
	(spendable * r) / (1 - Math.pow(1 + r, -N));

describe('amortizedWithdrawal (die-with-X)', () => {
	it('die-with-zero: ammortizza tutto il capitale in N anni', () => {
		const expected = annuity(1_000_000, 0.03, 30);
		expect(amortizedWithdrawal(1_000_000, 0.03, 30, 0)).toBeCloseTo(expected, 4);
	});

	it('un lascito target riduce il prelievo (toglie il VA del lascito)', () => {
		const w0 = amortizedWithdrawal(1_000_000, 0.03, 30, 0);
		const wX = amortizedWithdrawal(1_000_000, 0.03, 30, 500_000);
		expect(wX).toBeLessThan(w0);
		const pv = 500_000 / Math.pow(1.03, 30);
		expect(wX).toBeCloseTo(annuity(1_000_000 - pv, 0.03, 30), 4);
	});

	it('rendimento reale ~0 -> prelievo lineare spendibile/N', () => {
		expect(amortizedWithdrawal(1_000_000, 0, 20, 0)).toBeCloseTo(50_000, 2);
	});

	it('portafoglio <= 0 -> 0', () => {
		expect(amortizedWithdrawal(0, 0.03, 30, 0)).toBe(0);
		expect(amortizedWithdrawal(-100, 0.03, 30, 0)).toBe(0);
	});

	it('lascito target oltre il capitale -> prelievo 0', () => {
		expect(amortizedWithdrawal(100_000, 0.03, 30, 1_000_000)).toBe(0);
	});

	it('monotono: piu\' alto il lascito, piu\' basso il prelievo', () => {
		const a = amortizedWithdrawal(1_000_000, 0.03, 30, 0);
		const b = amortizedWithdrawal(1_000_000, 0.03, 30, 200_000);
		const c = amortizedWithdrawal(1_000_000, 0.03, 30, 400_000);
		expect(a).toBeGreaterThan(b);
		expect(b).toBeGreaterThan(c);
	});
});

describe('calculateWithdrawal dispatch', () => {
	it('instrada su amortized (N = lifeExpectancy - age)', () => {
		const w = calculateWithdrawal('amortized', {
			portfolio: 1_000_000,
			realReturn: 0.03,
			age: 60,
			lifeExpectancy: 90,
			targetBequest: 0
		});
		expect(w).toBeCloseTo(annuity(1_000_000, 0.03, 30), 4);
	});

	it('le strategie esistenti restano invariate', () => {
		expect(
			calculateWithdrawal('fixed', {
				portfolio: 1_000_000,
				initialPortfolio: 1_000_000,
				rate: 0.04,
				inflationRate: 0,
				year: 0
			})
		).toBe(40_000);
		expect(fixedWithdrawal(1_000_000, 0.04, 0, 0)).toBe(40_000);
		expect(vpwWithdrawal(1_000_000, 65, 90)).toBeCloseTo(63_000, 0); // 6,3% a 65
	});
});
