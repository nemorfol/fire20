/**
 * Rendimenti annuali dell'oro in USD (1971-2025).
 * Dal 1971 (fine della convertibilita' del dollaro, Bretton Woods).
 * Fonte: A. Damodaran, NYU Stern, "Historical Returns on Stocks, Bonds and Bills"
 * (histretSP, aggiornamento del 5 gennaio 2026), pages.stern.nyu.edu/~adamodar.
 * Colonna "Gold". Serie riallineata per intero all'edizione 2026 (prima si usava un'altra fonte; ora
 * azioni USA, Treasury e oro vengono dalla stessa tabella).
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const goldReturns: AnnualReturn[] = [
	{ year: 1971, value: 16.69 },
	{ year: 1972, value: 48.78 },
	{ year: 1973, value: 72.96 },
	{ year: 1974, value: 66.15 },
	{ year: 1975, value: -24.8 },
	{ year: 1976, value: -4.1 },
	{ year: 1977, value: 22.64 },
	{ year: 1978, value: 37.01 },
	{ year: 1979, value: 126.55 },
	{ year: 1980, value: 15.19 },
	{ year: 1981, value: -32.6 },
	{ year: 1982, value: 15.62 },
	{ year: 1983, value: -16.8 },
	{ year: 1984, value: -19.38 },
	{ year: 1985, value: 6 },
	{ year: 1986, value: 18.96 },
	{ year: 1987, value: 24.53 },
	{ year: 1988, value: -15.26 },
	{ year: 1989, value: -2.84 },
	{ year: 1990, value: -3.11 },
	{ year: 1991, value: -8.56 },
	{ year: 1992, value: -5.73 },
	{ year: 1993, value: 17.68 },
	{ year: 1994, value: -2.17 },
	{ year: 1995, value: 0.98 },
	{ year: 1996, value: -4.59 },
	{ year: 1997, value: -21.41 },
	{ year: 1998, value: -0.83 },
	{ year: 1999, value: 0.85 },
	{ year: 2000, value: -5.44 },
	{ year: 2001, value: 0.75 },
	{ year: 2002, value: 25.57 },
	{ year: 2003, value: 19.89 },
	{ year: 2004, value: 4.65 },
	{ year: 2005, value: 17.77 },
	{ year: 2006, value: 23.2 },
	{ year: 2007, value: 31.92 },
	{ year: 2008, value: 4.32 },
	{ year: 2009, value: 25.04 },
	{ year: 2010, value: 29.24 },
	{ year: 2011, value: 12.02 },
	{ year: 2012, value: 5.68 },
	{ year: 2013, value: -27.61 },
	{ year: 2014, value: 0.12 },
	{ year: 2015, value: -12.11 },
	{ year: 2016, value: 8.1 },
	{ year: 2017, value: 12.66 },
	{ year: 2018, value: -0.93 },
	{ year: 2019, value: 19.08 },
	{ year: 2020, value: 24.17 },
	{ year: 2021, value: -3.75 },
	{ year: 2022, value: 0.55 },
	{ year: 2023, value: 13.26 },
	{ year: 2024, value: 25.96 },
	{ year: 2025, value: 66.22 }
];

function computeStats(data: AnnualReturn[]) {
	const values = data.map((d) => d.value);
	const count = values.length;
	const mean = values.reduce((a, b) => a + b, 0) / count;
	const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (count - 1);
	const stdDev = Math.sqrt(variance);
	const min = Math.min(...values);
	const max = Math.max(...values);
	return { mean: +mean.toFixed(2), stdDev: +stdDev.toFixed(2), min, max, count };
}

export const goldStats = computeStats(goldReturns);
