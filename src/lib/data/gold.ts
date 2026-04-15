/**
 * Rendimenti annuali dell'oro in USD (1971-2024).
 * Fonte: World Gold Council, dati storici reali.
 * Dal 1971 (fine del gold standard di Bretton Woods).
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const goldReturns: AnnualReturn[] = [
	{ year: 1971, value: 15.17 },
	{ year: 1972, value: 44.79 },
	{ year: 1973, value: 72.97 },
	{ year: 1974, value: 66.79 },
	{ year: 1975, value: -24.80 },
	{ year: 1976, value: -4.10 },
	{ year: 1977, value: 22.64 },
	{ year: 1978, value: 36.73 },
	{ year: 1979, value: 120.57 },
	{ year: 1980, value: -11.35 },
	{ year: 1981, value: -32.60 },
	{ year: 1982, value: 14.94 },
	{ year: 1983, value: -16.31 },
	{ year: 1984, value: -19.19 },
	{ year: 1985, value: 5.68 },
	{ year: 1986, value: 19.13 },
	{ year: 1987, value: 22.21 },
	{ year: 1988, value: -15.26 },
	{ year: 1989, value: -2.84 },
	{ year: 1990, value: -1.47 },
	{ year: 1991, value: -10.07 },
	{ year: 1992, value: -5.75 },
	{ year: 1993, value: 17.68 },
	{ year: 1994, value: -2.17 },
	{ year: 1995, value: 0.98 },
	{ year: 1996, value: -4.59 },
	{ year: 1997, value: -21.41 },
	{ year: 1998, value: -0.83 },
	{ year: 1999, value: 0.85 },
	{ year: 2000, value: -5.44 },
	{ year: 2001, value: 0.72 },
	{ year: 2002, value: 24.75 },
	{ year: 2003, value: 19.59 },
	{ year: 2004, value: 5.21 },
	{ year: 2005, value: 18.17 },
	{ year: 2006, value: 22.95 },
	{ year: 2007, value: 31.35 },
	{ year: 2008, value: 4.32 },
	{ year: 2009, value: 25.04 },
	{ year: 2010, value: 29.52 },
	{ year: 2011, value: 10.06 },
	{ year: 2012, value: 7.14 },
	{ year: 2013, value: -27.33 },
	{ year: 2014, value: -1.54 },
	{ year: 2015, value: -10.42 },
	{ year: 2016, value: 8.63 },
	{ year: 2017, value: 13.68 },
	{ year: 2018, value: -1.56 },
	{ year: 2019, value: 18.31 },
	{ year: 2020, value: 24.43 },
	{ year: 2021, value: -3.64 },
	{ year: 2022, value: -0.28 },
	{ year: 2023, value: 13.10 },
	{ year: 2024, value: 26.50 }
];

function computeStats(data: AnnualReturn[]) {
	const values = data.map(d => d.value);
	const count = values.length;
	const mean = values.reduce((a, b) => a + b, 0) / count;
	const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (count - 1);
	const stdDev = Math.sqrt(variance);
	const min = Math.min(...values);
	const max = Math.max(...values);
	return { mean: +mean.toFixed(2), stdDev: +stdDev.toFixed(2), min, max, count };
}

export const goldStats = computeStats(goldReturns);
