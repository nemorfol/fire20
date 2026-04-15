/**
 * Inflazione annua USA (CPI-U) 1928-2024.
 * Fonte: Bureau of Labor Statistics, dati storici reali.
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const inflationUSReturns: AnnualReturn[] = [
	{ year: 1928, value: -1.16 },
	{ year: 1929, value: 0.58 },
	{ year: 1930, value: -6.40 },
	{ year: 1931, value: -9.32 },
	{ year: 1932, value: -10.30 },
	{ year: 1933, value: 0.76 },
	{ year: 1934, value: 1.52 },
	{ year: 1935, value: 2.99 },
	{ year: 1936, value: 1.45 },
	{ year: 1937, value: 2.86 },
	{ year: 1938, value: -2.78 },
	{ year: 1939, value: 0.00 },
	{ year: 1940, value: 0.72 },
	{ year: 1941, value: 9.93 },
	{ year: 1942, value: 9.03 },
	{ year: 1943, value: 2.96 },
	{ year: 1944, value: 2.30 },
	{ year: 1945, value: 2.25 },
	{ year: 1946, value: 18.13 },
	{ year: 1947, value: 8.84 },
	{ year: 1948, value: 2.99 },
	{ year: 1949, value: -2.07 },
	{ year: 1950, value: 5.93 },
	{ year: 1951, value: 5.87 },
	{ year: 1952, value: 0.75 },
	{ year: 1953, value: 0.75 },
	{ year: 1954, value: -0.74 },
	{ year: 1955, value: 0.37 },
	{ year: 1956, value: 2.99 },
	{ year: 1957, value: 2.90 },
	{ year: 1958, value: 1.76 },
	{ year: 1959, value: 1.73 },
	{ year: 1960, value: 1.36 },
	{ year: 1961, value: 0.67 },
	{ year: 1962, value: 1.33 },
	{ year: 1963, value: 1.64 },
	{ year: 1964, value: 0.97 },
	{ year: 1965, value: 1.92 },
	{ year: 1966, value: 3.46 },
	{ year: 1967, value: 3.04 },
	{ year: 1968, value: 4.72 },
	{ year: 1969, value: 6.18 },
	{ year: 1970, value: 5.57 },
	{ year: 1971, value: 3.27 },
	{ year: 1972, value: 3.41 },
	{ year: 1973, value: 8.71 },
	{ year: 1974, value: 12.34 },
	{ year: 1975, value: 6.94 },
	{ year: 1976, value: 4.86 },
	{ year: 1977, value: 6.70 },
	{ year: 1978, value: 9.02 },
	{ year: 1979, value: 13.29 },
	{ year: 1980, value: 12.52 },
	{ year: 1981, value: 8.92 },
	{ year: 1982, value: 3.83 },
	{ year: 1983, value: 3.79 },
	{ year: 1984, value: 3.95 },
	{ year: 1985, value: 3.80 },
	{ year: 1986, value: 1.10 },
	{ year: 1987, value: 4.43 },
	{ year: 1988, value: 4.42 },
	{ year: 1989, value: 4.65 },
	{ year: 1990, value: 6.11 },
	{ year: 1991, value: 3.06 },
	{ year: 1992, value: 2.90 },
	{ year: 1993, value: 2.75 },
	{ year: 1994, value: 2.67 },
	{ year: 1995, value: 2.54 },
	{ year: 1996, value: 3.32 },
	{ year: 1997, value: 1.70 },
	{ year: 1998, value: 1.61 },
	{ year: 1999, value: 2.68 },
	{ year: 2000, value: 3.39 },
	{ year: 2001, value: 1.55 },
	{ year: 2002, value: 2.38 },
	{ year: 2003, value: 1.88 },
	{ year: 2004, value: 3.26 },
	{ year: 2005, value: 3.42 },
	{ year: 2006, value: 2.54 },
	{ year: 2007, value: 4.08 },
	{ year: 2008, value: 0.09 },
	{ year: 2009, value: -0.36 },
	{ year: 2010, value: 1.50 },
	{ year: 2011, value: 2.96 },
	{ year: 2012, value: 1.74 },
	{ year: 2013, value: 1.50 },
	{ year: 2014, value: 0.76 },
	{ year: 2015, value: 0.73 },
	{ year: 2016, value: 2.07 },
	{ year: 2017, value: 2.11 },
	{ year: 2018, value: 1.91 },
	{ year: 2019, value: 2.29 },
	{ year: 2020, value: 1.36 },
	{ year: 2021, value: 7.04 },
	{ year: 2022, value: 6.45 },
	{ year: 2023, value: 3.35 },
	{ year: 2024, value: 2.90 }
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

export const inflationUSStats = computeStats(inflationUSReturns);
