/**
 * Inflazione annua italiana (ISTAT CPI) 1960-2024.
 * Fonte: ISTAT / World Bank, dati storici reali.
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const inflationITReturns: AnnualReturn[] = [
	{ year: 1960, value: 2.31 },
	{ year: 1961, value: 2.07 },
	{ year: 1962, value: 4.68 },
	{ year: 1963, value: 7.45 },
	{ year: 1964, value: 5.87 },
	{ year: 1965, value: 4.56 },
	{ year: 1966, value: 2.28 },
	{ year: 1967, value: 3.68 },
	{ year: 1968, value: 1.36 },
	{ year: 1969, value: 2.61 },
	{ year: 1970, value: 4.94 },
	{ year: 1971, value: 4.82 },
	{ year: 1972, value: 5.69 },
	{ year: 1973, value: 10.81 },
	{ year: 1974, value: 19.37 },
	{ year: 1975, value: 16.97 },
	{ year: 1976, value: 16.55 },
	{ year: 1977, value: 18.08 },
	{ year: 1978, value: 12.10 },
	{ year: 1979, value: 14.77 },
	{ year: 1980, value: 21.06 },
	{ year: 1981, value: 17.80 },
	{ year: 1982, value: 16.46 },
	{ year: 1983, value: 14.67 },
	{ year: 1984, value: 10.77 },
	{ year: 1985, value: 9.17 },
	{ year: 1986, value: 5.82 },
	{ year: 1987, value: 4.76 },
	{ year: 1988, value: 5.04 },
	{ year: 1989, value: 6.25 },
	{ year: 1990, value: 6.46 },
	{ year: 1991, value: 6.28 },
	{ year: 1992, value: 5.04 },
	{ year: 1993, value: 4.48 },
	{ year: 1994, value: 4.06 },
	{ year: 1995, value: 5.24 },
	{ year: 1996, value: 3.96 },
	{ year: 1997, value: 1.90 },
	{ year: 1998, value: 1.98 },
	{ year: 1999, value: 1.66 },
	{ year: 2000, value: 2.53 },
	{ year: 2001, value: 2.79 },
	{ year: 2002, value: 2.46 },
	{ year: 2003, value: 2.67 },
	{ year: 2004, value: 2.21 },
	{ year: 2005, value: 1.99 },
	{ year: 2006, value: 2.09 },
	{ year: 2007, value: 1.83 },
	{ year: 2008, value: 3.38 },
	{ year: 2009, value: 0.76 },
	{ year: 2010, value: 1.55 },
	{ year: 2011, value: 2.74 },
	{ year: 2012, value: 3.04 },
	{ year: 2013, value: 1.22 },
	{ year: 2014, value: 0.24 },
	{ year: 2015, value: 0.04 },
	{ year: 2016, value: -0.09 },
	{ year: 2017, value: 1.24 },
	{ year: 2018, value: 1.14 },
	{ year: 2019, value: 0.61 },
	{ year: 2020, value: -0.14 },
	{ year: 2021, value: 1.87 },
	{ year: 2022, value: 8.20 },
	{ year: 2023, value: 5.62 },
	{ year: 2024, value: 2.40 }
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

export const inflationITStats = computeStats(inflationITReturns);
