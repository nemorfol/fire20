/**
 * S&P 500 Total Returns annuali (1928-2024).
 * Fonte: NYU Stern (Damodaran), dati storici reali.
 * I valori rappresentano il rendimento totale annuo (dividendi inclusi) in percentuale.
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const sp500Returns: AnnualReturn[] = [
	{ year: 1928, value: 43.81 },
	{ year: 1929, value: -8.30 },
	{ year: 1930, value: -25.12 },
	{ year: 1931, value: -43.84 },
	{ year: 1932, value: -8.64 },
	{ year: 1933, value: 49.98 },
	{ year: 1934, value: -1.19 },
	{ year: 1935, value: 46.74 },
	{ year: 1936, value: 31.94 },
	{ year: 1937, value: -35.34 },
	{ year: 1938, value: 29.28 },
	{ year: 1939, value: -1.10 },
	{ year: 1940, value: -10.67 },
	{ year: 1941, value: -12.77 },
	{ year: 1942, value: 19.17 },
	{ year: 1943, value: 25.06 },
	{ year: 1944, value: 19.03 },
	{ year: 1945, value: 35.82 },
	{ year: 1946, value: -8.43 },
	{ year: 1947, value: 5.20 },
	{ year: 1948, value: 5.70 },
	{ year: 1949, value: 18.30 },
	{ year: 1950, value: 30.81 },
	{ year: 1951, value: 23.68 },
	{ year: 1952, value: 18.15 },
	{ year: 1953, value: -1.21 },
	{ year: 1954, value: 52.56 },
	{ year: 1955, value: 32.60 },
	{ year: 1956, value: 7.44 },
	{ year: 1957, value: -10.46 },
	{ year: 1958, value: 43.72 },
	{ year: 1959, value: 12.06 },
	{ year: 1960, value: 0.34 },
	{ year: 1961, value: 26.64 },
	{ year: 1962, value: -8.81 },
	{ year: 1963, value: 22.61 },
	{ year: 1964, value: 16.42 },
	{ year: 1965, value: 12.40 },
	{ year: 1966, value: -9.97 },
	{ year: 1967, value: 23.80 },
	{ year: 1968, value: 10.81 },
	{ year: 1969, value: -8.24 },
	{ year: 1970, value: 3.56 },
	{ year: 1971, value: 14.22 },
	{ year: 1972, value: 18.76 },
	{ year: 1973, value: -14.31 },
	{ year: 1974, value: -25.90 },
	{ year: 1975, value: 37.00 },
	{ year: 1976, value: 23.83 },
	{ year: 1977, value: -6.98 },
	{ year: 1978, value: 6.51 },
	{ year: 1979, value: 18.52 },
	{ year: 1980, value: 31.74 },
	{ year: 1981, value: -4.70 },
	{ year: 1982, value: 20.42 },
	{ year: 1983, value: 22.34 },
	{ year: 1984, value: 6.15 },
	{ year: 1985, value: 31.24 },
	{ year: 1986, value: 18.49 },
	{ year: 1987, value: 5.81 },
	{ year: 1988, value: 16.54 },
	{ year: 1989, value: 31.48 },
	{ year: 1990, value: -3.06 },
	{ year: 1991, value: 30.23 },
	{ year: 1992, value: 7.49 },
	{ year: 1993, value: 9.97 },
	{ year: 1994, value: 1.33 },
	{ year: 1995, value: 37.20 },
	{ year: 1996, value: 22.68 },
	{ year: 1997, value: 33.10 },
	{ year: 1998, value: 28.34 },
	{ year: 1999, value: 20.89 },
	{ year: 2000, value: -9.03 },
	{ year: 2001, value: -11.85 },
	{ year: 2002, value: -21.97 },
	{ year: 2003, value: 28.36 },
	{ year: 2004, value: 10.74 },
	{ year: 2005, value: 4.83 },
	{ year: 2006, value: 15.61 },
	{ year: 2007, value: 5.49 },
	{ year: 2008, value: -36.55 },
	{ year: 2009, value: 25.94 },
	{ year: 2010, value: 14.82 },
	{ year: 2011, value: 2.10 },
	{ year: 2012, value: 15.89 },
	{ year: 2013, value: 32.15 },
	{ year: 2014, value: 13.52 },
	{ year: 2015, value: 1.38 },
	{ year: 2016, value: 11.77 },
	{ year: 2017, value: 21.61 },
	{ year: 2018, value: -4.23 },
	{ year: 2019, value: 31.21 },
	{ year: 2020, value: 18.02 },
	{ year: 2021, value: 28.47 },
	{ year: 2022, value: -18.04 },
	{ year: 2023, value: 26.06 },
	{ year: 2024, value: 24.89 }
];

// Statistiche calcolate
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

export const sp500Stats = computeStats(sp500Returns);
