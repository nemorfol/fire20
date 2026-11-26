import { describe, it, expect } from 'vitest';
import { convertUsdReturnsToEur, eurPerUsd, ITL_PER_EUR } from './fx';
import {
	SERIES_IT_DEFAULT,
	SERIES_US_CLASSIC,
	alignHistory,
	internationalReturnsEur
} from './default-series';
import { internationalReturns } from './international';
import { inflationITReturns } from './inflation-it';

/** Media geometrica annua (decimali) di una serie in percentuale, su [from, to] */
function geo(xs: { year: number; value: number }[], from: number, to: number): number {
	const sel = xs.filter((x) => x.year >= from && x.year <= to);
	const prod = sel.reduce((p, x) => p * (1 + x.value / 100), 1);
	return Math.pow(prod, 1 / sel.length) - 1;
}

describe('fx - cambi storici e conversione USD -> lire/EUR', () => {
	it('lire espresse in EUR-equivalenti al tasso irrevocabile 1936,27', () => {
		expect(ITL_PER_EUR).toBe(1936.27);
		expect(eurPerUsd(1998)).toBeCloseTo(1653.23 / 1936.27, 10);
		expect(eurPerUsd(1999)).toBeCloseTo(1 / 1.011, 10);
		expect(eurPerUsd(1968)).toBeUndefined();
	});

	it('(1 + r_EUR) = (1 + r_USD) * variazione del cambio', () => {
		// 1986: USD da 1713,50 a 1379,44 lire (dollaro -19,5%)
		const [r] = convertUsdReturnsToEur([{ year: 1986, value: 69.44 }]);
		expect(r.value).toBeCloseTo((1.6944 * (1379.44 / 1713.5) - 1) * 100, 3);
		// 1970: parita' di Bretton Woods, cambio invariato -> rendimento identico
		const [r70] = convertUsdReturnsToEur([{ year: 1970, value: -11.42 }]);
		expect(r70.value).toBeCloseTo(-11.42, 6);
	});

	it('passaggio lira -> euro 1998/1999 senza salti artificiali', () => {
		// Nel 1999 il dollaro si e' apprezzato ~16% sull'euro (1,17 -> 1,01)
		const [r] = convertUsdReturnsToEur([{ year: 1999, value: 0 }]);
		expect(r.value).toBeGreaterThan(14);
		expect(r.value).toBeLessThan(18);
	});

	it('scarta gli anni senza cambio invece di stimarli', () => {
		expect(convertUsdReturnsToEur([{ year: 1960, value: 10 }])).toEqual([]);
		expect(internationalReturnsEur).toHaveLength(internationalReturns.length);
	});
});

describe('preset IT - coerenza valutaria', () => {
	it('tutte le serie del preset italiano sono in EUR, quelle USA in USD', () => {
		expect(SERIES_IT_DEFAULT.currency).toBe('EUR');
		expect(SERIES_US_CLASSIC.currency).toBe('USD');
	});

	it('rendimento reale ex-USA in EUR/ISTAT 1970-2024 plausibile (~4%) e non piu sottostimato', () => {
		const infl = geo(inflationITReturns, 1970, 2024);
		const realEur = (1 + geo(internationalReturnsEur, 1970, 2024)) / (1 + infl) - 1;
		const realMismatch = (1 + geo(internationalReturns, 1970, 2024)) / (1 + infl) - 1;
		expect(realEur).toBeGreaterThan(0.035);
		expect(realEur).toBeLessThan(0.055);
		// Il vecchio abbinamento USD + ISTAT sottostimava di oltre 1,5 punti l'anno
		expect(realEur - realMismatch).toBeGreaterThan(0.015);
	});
});

describe('alignHistory - finestra comune per anno', () => {
	const span = (ys: number[]) => [ys[0], ys[ys.length - 1]];

	it('IT azioni + BTP -> 1991-2024 (limite: BTP stimati dal 1991)', () => {
		const h = alignHistory(SERIES_IT_DEFAULT, ['stocks', 'bonds']);
		expect(span(h.years)).toEqual([1991, 2024]);
		expect(h.stocks).toHaveLength(h.years.length);
		expect(h.bonds).toHaveLength(h.years.length);
		expect(h.inflation).toHaveLength(h.years.length);
	});

	it('IT solo azioni -> 1970-2024 (include la stagflazione anni 70)', () => {
		const h = alignHistory(SERIES_IT_DEFAULT, ['stocks']);
		expect(span(h.years)).toEqual([1970, 2024]);
		expect(h.bonds).toEqual([]); // BTP non coprono la finestra: non usati
	});

	it('US azioni + bond -> 1928-2024, con oro -> 1971-2024', () => {
		expect(span(alignHistory(SERIES_US_CLASSIC, ['stocks', 'bonds']).years)).toEqual([1928, 2024]);
		expect(span(alignHistory(SERIES_US_CLASSIC, ['stocks', 'bonds', 'gold']).years)).toEqual([
			1971, 2024
		]);
	});

	it('valori allineati: indice i = stesso anno di calendario in ogni serie', () => {
		const h = alignHistory(SERIES_IT_DEFAULT, ['stocks', 'bonds']);
		const i = h.years.indexOf(2022);
		expect(h.inflation[i]).toBeCloseTo(
			inflationITReturns.find((r) => r.year === 2022)!.value / 100,
			10
		);
		expect(h.bonds[i]).toBeCloseTo(-0.168, 10);
	});
});
