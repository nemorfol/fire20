/**
 * Rendimenti annuali dell'indice MSCI World (1970-2025), rendimento totale
 * LORDO (dividendi reinvestiti, senza ritenute) in USD.
 *
 * L'indice e' pesato per capitalizzazione: il peso degli USA cambia nel tempo
 * (circa due terzi a inizio anni '70, circa un terzo a fine anni '80 quando il
 * Giappone superava il 40% dell'indice, 72,77% a ottobre 2026). Usarlo evita di
 * imporre al passato un peso USA fisso scelto col senno di poi.
 *
 * Fonti:
 * - 2012-2025: factsheet MSCI World Index (USD), dati al 30/10/2026, tabella
 *   "Annual performance (%)", rendimenti lordi (msci.com, documento 10199/
 *   178e6643-6ae6-47b9-82be-e1fc565ededb).
 * - 1970-2011: Wikipedia, voce "MSCI World", colonna "Gross Annual Return"
 *   (consultata il 26/11/2026), coincidente al centesimo con il factsheet MSCI
 *   per gli anni 2012-2025 e, per il 1998-2011, con il factsheet MSCI del
 *   28/09/2012 riportato da terzi.
 *
 * Avvertenze:
 * - L'indice e' stato lanciato il 31/03/1986: gli anni precedenti sono un
 *   back-test MSCI (dichiarato nel factsheet).
 * - Rendimento LORDO: un ETF subisce la ritenuta sui dividendi e il TER, circa
 *   0,3-0,6 punti l'anno in meno.
 * - Controllo di coerenza: il peso USA implicito, ricavato confrontando ogni anno
 *   con S&P 500 ed MSCI EAFE, segue l'andamento storico atteso (circa 0,6 nei
 *   primi anni '70, circa 0,33 nel 1989-1990, circa 0,7 nel 2024).
 */

import type { AnnualReturn } from './utils';

export const msciWorldReturns: AnnualReturn[] = [
	{ year: 1970, value: -1.98 },
	{ year: 1971, value: 19.56 },
	{ year: 1972, value: 23.55 },
	{ year: 1973, value: -14.51 },
	{ year: 1974, value: -24.48 },
	{ year: 1975, value: 34.5 },
	{ year: 1976, value: 14.71 },
	{ year: 1977, value: 5.0 },
	{ year: 1978, value: 18.22 },
	{ year: 1979, value: 12.67 },
	{ year: 1980, value: 27.72 },
	{ year: 1981, value: -3.3 },
	{ year: 1982, value: 11.27 },
	{ year: 1983, value: 23.28 },
	{ year: 1984, value: 5.77 },
	{ year: 1985, value: 41.77 },
	{ year: 1986, value: 42.8 },
	{ year: 1987, value: 16.76 },
	{ year: 1988, value: 23.95 },
	{ year: 1989, value: 17.19 },
	{ year: 1990, value: -16.52 },
	{ year: 1991, value: 18.97 },
	{ year: 1992, value: -4.66 },
	{ year: 1993, value: 23.13 },
	{ year: 1994, value: 5.58 },
	{ year: 1995, value: 21.32 },
	{ year: 1996, value: 14.0 },
	{ year: 1997, value: 16.23 },
	{ year: 1998, value: 24.8 },
	{ year: 1999, value: 25.34 },
	{ year: 2000, value: -12.92 },
	{ year: 2001, value: -16.52 },
	{ year: 2002, value: -19.54 },
	{ year: 2003, value: 33.76 },
	{ year: 2004, value: 15.25 },
	{ year: 2005, value: 10.02 },
	{ year: 2006, value: 20.65 },
	{ year: 2007, value: 9.57 },
	{ year: 2008, value: -40.33 },
	{ year: 2009, value: 30.79 },
	{ year: 2010, value: 12.34 },
	{ year: 2011, value: -5.02 },
	{ year: 2012, value: 16.54 },
	{ year: 2013, value: 27.37 },
	{ year: 2014, value: 5.5 },
	{ year: 2015, value: -0.32 },
	{ year: 2016, value: 8.15 },
	{ year: 2017, value: 23.07 },
	{ year: 2018, value: -8.2 },
	{ year: 2019, value: 28.4 },
	{ year: 2020, value: 16.5 },
	{ year: 2021, value: 22.35 },
	{ year: 2022, value: -17.73 },
	{ year: 2023, value: 24.42 },
	{ year: 2024, value: 19.19 },
	{ year: 2025, value: 21.6 }
];
