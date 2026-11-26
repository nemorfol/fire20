import { describe, it, expect } from 'vitest';
import { convertUsdReturnsToEur, eurPerUsd, ITL_PER_EUR } from './fx';
import {
	SERIES_IT_DEFAULT,
	SERIES_US_CLASSIC,
	SERIES_IT_ALLWORLD,
	SERIES_IT_WORLD,
	ALL_SERIES_PRESETS,
	msciWorldReturnsEur,
	ALLWORLD_US_WEIGHT_DEFAULT,
	alignHistory,
	blendAnnualReturns,
	buildAllWorldEurPreset,
	getSeriesPreset,
	internationalReturnsEur,
	sp500ReturnsEur,
	recenterHistory,
	meanRealReturn,
	type AlignedHistory
} from './default-series';
import { internationalReturns } from './international';
import { btpReturns, BTP_MEASURED_UNTIL } from './btp';
import { jstItalyBondReturns } from './jst-italia';
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

	it('IT azioni + BTP -> 1970-2025 (BTP misurati JST dal 1970)', () => {
		const h = alignHistory(SERIES_IT_DEFAULT, ['stocks', 'bonds']);
		expect(span(h.years)).toEqual([1970, 2025]);
		expect(h.stocks).toHaveLength(h.years.length);
		expect(h.bonds).toHaveLength(h.years.length);
		expect(h.inflation).toHaveLength(h.years.length);
	});

	it('IT solo azioni -> 1970-2025 (include la stagflazione anni 70)', () => {
		const h = alignHistory(SERIES_IT_DEFAULT, ['stocks']);
		expect(span(h.years)).toEqual([1970, 2025]);
		expect(h.bonds).toHaveLength(h.years.length); // i BTP coprono anche gli anni '70
	});

	it('US azioni + bond -> 1928-2025, con oro -> 1971-2025', () => {
		expect(span(alignHistory(SERIES_US_CLASSIC, ['stocks', 'bonds']).years)).toEqual([1928, 2025]);
		expect(span(alignHistory(SERIES_US_CLASSIC, ['stocks', 'bonds', 'gold']).years)).toEqual([
			1971, 2025
		]);
	});

	it('valori allineati: indice i = stesso anno di calendario in ogni serie', () => {
		const h = alignHistory(SERIES_IT_DEFAULT, ['stocks', 'bonds']);
		const i = h.years.indexOf(2022);
		expect(h.inflation[i]).toBeCloseTo(
			inflationITReturns.find((r) => r.year === 2022)!.value / 100,
			10
		);
		expect(h.bonds[i]).toBeCloseTo(-0.225, 10);
	});
});

describe('preset All-World in EUR (S&P 500 + ex-USA a peso fisso)', () => {
	it('mix a peso fisso: r = w * r_A + (1 - w) * r_B sugli anni comuni', () => {
		const out = blendAnnualReturns(
			[
				{ year: 2000, value: 10 },
				{ year: 2001, value: -20 }
			],
			[{ year: 2001, value: 0 }],
			0.7
		);
		expect(out).toEqual([{ year: 2001, value: -14 }]);
	});

	it('tutto in EUR, finestra azioni 1970-2025 e default 70% USA', () => {
		expect(SERIES_IT_ALLWORLD.currency).toBe('EUR');
		expect(ALLWORLD_US_WEIGHT_DEFAULT).toBe(0.7);
		const h = alignHistory(SERIES_IT_ALLWORLD, ['stocks']);
		expect([h.years[0], h.years[h.years.length - 1]]).toEqual([1970, 2025]);
	});

	it('peso 0 = ex-USA in EUR, peso 1 = S&P 500 in EUR', () => {
		expect(buildAllWorldEurPreset(0).series.stocks).toEqual(internationalReturnsEur);
		expect(buildAllWorldEurPreset(1).series.stocks).toEqual(sp500ReturnsEur);
	});

	it('rendimento reale cresce col peso USA (1970-2024): ex-USA < 50% < 70%', () => {
		const infl = geo(inflationITReturns, 1970, 2024);
		const real = (w: number) =>
			(1 + geo(buildAllWorldEurPreset(w).series.stocks, 1970, 2024)) / (1 + infl) - 1;
		expect(real(0)).toBeLessThan(real(0.5));
		expect(real(0.5)).toBeLessThan(real(0.7));
		expect(real(0.7)).toBeGreaterThan(0.05);
		expect(real(0.7)).toBeLessThan(0.075);
	});

	it('getSeriesPreset: id sconosciuto resta sul preset ex-USA (retrocompatibile)', () => {
		expect(getSeriesPreset(undefined).id).toBe('it-default');
		expect(getSeriesPreset('it-allworld')).toBe(SERIES_IT_ALLWORLD);
		expect(getSeriesPreset('it-allworld', 0.5).description).toContain('50% USA');
	});
});

describe('Periodo storico e bootstrap ricentrato', () => {
	it('alignHistory con fromYear taglia la finestra (1999 = era euro)', () => {
		const all = alignHistory(SERIES_IT_ALLWORLD, ['stocks', 'bonds']);
		const euro = alignHistory(SERIES_IT_ALLWORLD, ['stocks', 'bonds'], 1999);
		expect(all.years[0]).toBe(1970);
		expect(euro.years[0]).toBe(1999);
		expect(euro.years.at(-1)).toBe(all.years.at(-1));
		expect(euro.stocks).toHaveLength(euro.years.length);
		expect(euro.inflation).toHaveLength(euro.years.length);
	});

	const h: AlignedHistory = {
		years: [2001, 2002, 2003, 2004],
		stocks: [0.3, -0.2, 0.1, 0.05],
		bonds: [0.04, 0.06, -0.02, 0.03],
		gold: [0.1, 0.1, 0.1, 0.1],
		inflation: [0.02, 0.05, 0.0, 0.01]
	};

	it('la media reale ricentrata coincide con l obiettivo dichiarato', () => {
		const r = recenterHistory(h, { stocks: 0.05, bonds: 0.015 });
		expect(meanRealReturn(r.stocks, r.inflation)).toBeCloseTo(0.05, 10);
		expect(meanRealReturn(r.bonds, r.inflation)).toBeCloseTo(0.015, 10);
	});

	it('conserva la forma: rapporti tra rendimenti reali lordi e inflazione invariati', () => {
		const r = recenterHistory(h, { stocks: 0.0 });
		const g = h.stocks.map((x, i) => (1 + x) / (1 + h.inflation[i]));
		const g2 = r.stocks.map((x, i) => (1 + x) / (1 + r.inflation[i]));
		const k = g2[0] / g[0];
		g.forEach((v, i) => expect(g2[i] / v).toBeCloseTo(k, 12));
		expect(r.inflation).toEqual(h.inflation);
	});

	it('serie senza obiettivo restano invariate', () => {
		const r = recenterHistory(h, { stocks: 0.05 });
		expect(r.bonds).toBe(h.bonds);
		expect(r.gold).toBe(h.gold);
	});
});

describe('serie BTP: JST misurato + proxy recente', () => {
	it('1970-2025 senza buchi; 1970-2020 identici a JST', () => {
		const years = btpReturns.map((r) => r.year);
		expect(years[0]).toBe(1970);
		expect(years.at(-1)).toBe(2025);
		years.forEach((y, i) => expect(y).toBe(1970 + i));
		expect(btpReturns.slice(0, jstItalyBondReturns.length)).toEqual(jstItalyBondReturns);
		expect(jstItalyBondReturns.at(-1)!.year).toBe(BTP_MEASURED_UNTIL);
	});

	it('valori JST di controllo (1993, 2011, 2012)', () => {
		const v = (y: number) => btpReturns.find((r) => r.year === y)!.value;
		expect(v(1993)).toBeCloseTo(40.2, 1);
		expect(v(2011)).toBeCloseTo(-6.49, 2);
		expect(v(2012)).toBeCloseTo(24.55, 2);
	});
});

describe('preset MSCI World in EUR (pesi storici)', () => {
	it('e il default della lista, in EUR, 1970-2025 con BTP', () => {
		expect(ALL_SERIES_PRESETS[0].id).toBe('it-world');
		expect(getSeriesPreset('it-world')).toBe(SERIES_IT_WORLD);
		expect(SERIES_IT_WORLD.currency).toBe('EUR');
		const h = alignHistory(SERIES_IT_WORLD, ['stocks', 'bonds']);
		expect([h.years[0], h.years.at(-1)]).toEqual([1970, 2025]);
	});

	it('rendimento reale MSCI World in EUR/ISTAT 1970-2025 tra ex-USA e mix 70% USA', () => {
		const infl = geo(inflationITReturns, 1970, 2025);
		const real = (s: { year: number; value: number }[]) =>
			(1 + geo(s, 1970, 2025)) / (1 + infl) - 1;
		const world = real(msciWorldReturnsEur);
		expect(world).toBeGreaterThan(real(internationalReturnsEur));
		expect(world).toBeLessThan(real(buildAllWorldEurPreset(0.7).series.stocks));
	});
});
