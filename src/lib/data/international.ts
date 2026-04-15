/**
 * Rendimenti annuali MSCI World ex-USA (1970-2024).
 * Fonte: MSCI, dati storici reali (rendimento totale in USD).
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const internationalReturns: AnnualReturn[] = [
	{ year: 1970, value: -11.42 },
	{ year: 1971, value: 29.59 },
	{ year: 1972, value: 36.28 },
	{ year: 1973, value: -14.17 },
	{ year: 1974, value: -22.15 },
	{ year: 1975, value: 35.39 },
	{ year: 1976, value: 2.54 },
	{ year: 1977, value: 18.06 },
	{ year: 1978, value: 32.61 },
	{ year: 1979, value: 4.75 },
	{ year: 1980, value: 22.58 },
	{ year: 1981, value: -2.28 },
	{ year: 1982, value: -1.86 },
	{ year: 1983, value: 23.69 },
	{ year: 1984, value: 7.38 },
	{ year: 1985, value: 55.35 },
	{ year: 1986, value: 69.44 },
	{ year: 1987, value: 24.63 },
	{ year: 1988, value: 28.27 },
	{ year: 1989, value: 10.54 },
	{ year: 1990, value: -23.45 },
	{ year: 1991, value: 12.49 },
	{ year: 1992, value: -11.85 },
	{ year: 1993, value: 32.56 },
	{ year: 1994, value: 7.78 },
	{ year: 1995, value: 11.21 },
	{ year: 1996, value: 6.05 },
	{ year: 1997, value: 1.78 },
	{ year: 1998, value: 20.00 },
	{ year: 1999, value: 26.96 },
	{ year: 2000, value: -14.17 },
	{ year: 2001, value: -21.44 },
	{ year: 2002, value: -15.94 },
	{ year: 2003, value: 38.59 },
	{ year: 2004, value: 20.25 },
	{ year: 2005, value: 13.54 },
	{ year: 2006, value: 26.34 },
	{ year: 2007, value: 11.17 },
	{ year: 2008, value: -43.38 },
	{ year: 2009, value: 31.78 },
	{ year: 2010, value: 7.75 },
	{ year: 2011, value: -12.14 },
	{ year: 2012, value: 17.02 },
	{ year: 2013, value: 22.80 },
	{ year: 2014, value: -4.32 },
	{ year: 2015, value: -0.81 },
	{ year: 2016, value: 1.00 },
	{ year: 2017, value: 24.21 },
	{ year: 2018, value: -14.09 },
	{ year: 2019, value: 21.51 },
	{ year: 2020, value: 7.59 },
	{ year: 2021, value: 12.62 },
	{ year: 2022, value: -16.00 },
	{ year: 2023, value: 17.94 },
	{ year: 2024, value: 4.65 }
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

export const internationalStats = computeStats(internationalReturns);
