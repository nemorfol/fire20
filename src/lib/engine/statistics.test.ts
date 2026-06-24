import { describe, it, expect, afterEach } from 'vitest';
import {
	seedRandom,
	resetRandom,
	isSeeded,
	nextRandom,
	calculatePercentiles,
	calculateMean,
	calculateStdDev,
	gaussianRandom
} from './statistics';

// Ogni test che seeda deve ripulire lo stato globale del PRNG.
afterEach(() => resetRandom());

describe('PRNG seedabile (mulberry32)', () => {
	it('stesso seed -> stessa sequenza (riproducibilita\')', () => {
		seedRandom(42);
		const a = [nextRandom(), nextRandom(), nextRandom()];
		seedRandom(42);
		const b = [nextRandom(), nextRandom(), nextRandom()];
		expect(a).toEqual(b);
	});

	it('seed diversi -> sequenze diverse', () => {
		seedRandom(1);
		const a = nextRandom();
		seedRandom(2);
		const b = nextRandom();
		expect(a).not.toEqual(b);
	});

	it('genera sempre valori in [0, 1)', () => {
		seedRandom(123);
		for (let i = 0; i < 2000; i++) {
			const r = nextRandom();
			expect(r).toBeGreaterThanOrEqual(0);
			expect(r).toBeLessThan(1);
		}
	});

	it('isSeeded riflette lo stato; resetRandom torna a non-deterministico', () => {
		expect(isSeeded()).toBe(false);
		seedRandom(9);
		expect(isSeeded()).toBe(true);
		resetRandom();
		expect(isSeeded()).toBe(false);
	});

	it('gaussianRandom e\' deterministico quando seedato', () => {
		seedRandom(7);
		const a = gaussianRandom(0, 1);
		seedRandom(7);
		const b = gaussianRandom(0, 1);
		expect(a).toBe(b);
	});
});

describe('calculatePercentiles', () => {
	it('mediana di [1..5] = 3', () => {
		expect(calculatePercentiles([1, 2, 3, 4, 5], [50])[0]).toBe(3);
	});

	it('p0 e p100 = min e max', () => {
		const [p0, p100] = calculatePercentiles([10, 20, 30, 40], [0, 100]);
		expect(p0).toBe(10);
		expect(p100).toBe(40);
	});

	it('interpolazione lineare tra valori', () => {
		// p25 di [0,10,20,30]: index = 0.25*3 = 0.75 -> 0*(0.25)+10*(0.75)=7.5
		expect(calculatePercentiles([0, 10, 20, 30], [25])[0]).toBeCloseTo(7.5, 6);
	});

	it('array vuoto -> zeri', () => {
		expect(calculatePercentiles([], [5, 50, 95])).toEqual([0, 0, 0]);
	});
});

describe('media e deviazione standard', () => {
	it('media aritmetica', () => {
		expect(calculateMean([2, 4, 6])).toBe(4);
	});

	it('deviazione standard di popolazione', () => {
		// var = (4+0+4)/3 = 8/3 ; sqrt ~ 1.6329931
		expect(calculateStdDev([2, 4, 6])).toBeCloseTo(1.6329931, 6);
	});

	it('stddev con meno di 2 valori = 0', () => {
		expect(calculateStdDev([5])).toBe(0);
		expect(calculateStdDev([])).toBe(0);
	});

	it('media di array vuoto = 0', () => {
		expect(calculateMean([])).toBe(0);
	});
});
