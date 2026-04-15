/**
 * Rendimenti annuali US 10-Year Treasury Bond (1928-2024).
 * Fonte: NYU Stern (Damodaran), dati storici reali.
 * I valori rappresentano il rendimento totale annuo in percentuale.
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const bondReturns: AnnualReturn[] = [
	{ year: 1928, value: 0.84 },
	{ year: 1929, value: 4.20 },
	{ year: 1930, value: 4.54 },
	{ year: 1931, value: -2.56 },
	{ year: 1932, value: 8.79 },
	{ year: 1933, value: 1.86 },
	{ year: 1934, value: 7.96 },
	{ year: 1935, value: 4.47 },
	{ year: 1936, value: 5.02 },
	{ year: 1937, value: 1.38 },
	{ year: 1938, value: 4.21 },
	{ year: 1939, value: 4.41 },
	{ year: 1940, value: 5.40 },
	{ year: 1941, value: -2.02 },
	{ year: 1942, value: 2.29 },
	{ year: 1943, value: 2.49 },
	{ year: 1944, value: 2.58 },
	{ year: 1945, value: 3.80 },
	{ year: 1946, value: 3.13 },
	{ year: 1947, value: 0.92 },
	{ year: 1948, value: 1.95 },
	{ year: 1949, value: 4.66 },
	{ year: 1950, value: 0.43 },
	{ year: 1951, value: -0.30 },
	{ year: 1952, value: 2.27 },
	{ year: 1953, value: 4.14 },
	{ year: 1954, value: 3.29 },
	{ year: 1955, value: -1.34 },
	{ year: 1956, value: -2.26 },
	{ year: 1957, value: 6.80 },
	{ year: 1958, value: -2.10 },
	{ year: 1959, value: -2.65 },
	{ year: 1960, value: 11.64 },
	{ year: 1961, value: 2.06 },
	{ year: 1962, value: 5.69 },
	{ year: 1963, value: 1.68 },
	{ year: 1964, value: 3.73 },
	{ year: 1965, value: 0.72 },
	{ year: 1966, value: 2.91 },
	{ year: 1967, value: -1.58 },
	{ year: 1968, value: 3.22 },
	{ year: 1969, value: -5.01 },
	{ year: 1970, value: 16.75 },
	{ year: 1971, value: 9.79 },
	{ year: 1972, value: 2.82 },
	{ year: 1973, value: 3.66 },
	{ year: 1974, value: 1.99 },
	{ year: 1975, value: 3.61 },
	{ year: 1976, value: 15.98 },
	{ year: 1977, value: 1.29 },
	{ year: 1978, value: -0.78 },
	{ year: 1979, value: 0.67 },
	{ year: 1980, value: -2.99 },
	{ year: 1981, value: 8.20 },
	{ year: 1982, value: 32.81 },
	{ year: 1983, value: 3.20 },
	{ year: 1984, value: 13.73 },
	{ year: 1985, value: 25.71 },
	{ year: 1986, value: 24.28 },
	{ year: 1987, value: -4.96 },
	{ year: 1988, value: 8.22 },
	{ year: 1989, value: 17.69 },
	{ year: 1990, value: 6.24 },
	{ year: 1991, value: 15.00 },
	{ year: 1992, value: 9.36 },
	{ year: 1993, value: 14.21 },
	{ year: 1994, value: -8.04 },
	{ year: 1995, value: 23.48 },
	{ year: 1996, value: 1.43 },
	{ year: 1997, value: 9.94 },
	{ year: 1998, value: 14.92 },
	{ year: 1999, value: -8.25 },
	{ year: 2000, value: 16.66 },
	{ year: 2001, value: 5.57 },
	{ year: 2002, value: 15.12 },
	{ year: 2003, value: 0.38 },
	{ year: 2004, value: 4.49 },
	{ year: 2005, value: 2.87 },
	{ year: 2006, value: 1.96 },
	{ year: 2007, value: 10.21 },
	{ year: 2008, value: 20.10 },
	{ year: 2009, value: -11.12 },
	{ year: 2010, value: 8.46 },
	{ year: 2011, value: 16.04 },
	{ year: 2012, value: 2.97 },
	{ year: 2013, value: -9.10 },
	{ year: 2014, value: 10.75 },
	{ year: 2015, value: 1.28 },
	{ year: 2016, value: 0.69 },
	{ year: 2017, value: 2.80 },
	{ year: 2018, value: -0.02 },
	{ year: 2019, value: 9.64 },
	{ year: 2020, value: 11.33 },
	{ year: 2021, value: -4.42 },
	{ year: 2022, value: -17.83 },
	{ year: 2023, value: 3.97 },
	{ year: 2024, value: 0.72 }
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

export const bondStats = computeStats(bondReturns);
