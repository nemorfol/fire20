/**
 * Rendimento totale nominale annuo dei titoli di Stato italiani a ~10 anni,
 * 1970-2020, in lire/euro (variabile `bond_tr`, Italia).
 *
 * LICENZA: questo file e' un estratto del Jorda-Schularick-Taylor Macrohistory
 * Database ed e' distribuito sotto Creative Commons Attribution-NonCommercial-
 * ShareAlike 4.0 International (CC BY-NC-SA 4.0), NON sotto la licenza MIT del
 * resto del repository. Vedi src/lib/data/LICENSE-JST.md.
 *
 * Fonte: Jorda-Schularick-Taylor Macrohistory Database, release 6
 * (JSTdatasetR6.xlsx, www.macrohistory.net/database/, consultato il 26/11/2026).
 * Citazioni richieste dagli autori:
 * - O. Jorda, M. Schularick, A. M. Taylor (2017), "Macrofinancial History and the
 *   New Business Cycle Facts", NBER Macroeconomics Annual 2016, vol. 31.
 * - O. Jorda, K. Knoll, D. Kuvshinov, M. Schularick, A. M. Taylor (2019), "The Rate
 *   of Return on Everything, 1870-2015", Quarterly Journal of Economics 134(3).
 *
 * Definizione: r[t] = (p[t] + coupon[t]) / p[t-1] - 1. Fonti degli autori per
 * l'Italia: indici Mediobanca 1955-1987 (negli anni '80 titoli a 3-5 anni,
 * perche' i titoli piu' lunghi non erano quotati); dal 1988 media dei rendimenti
 * totali dei singoli titoli di Stato, scadenza obiettivo 10 anni (1988-1991 piu'
 * corta), ricalcolata nella R6 fino al 2020. Valori arrotondati al centesimo di
 * punto percentuale; nessun'altra modifica.
 */

import type { AnnualReturn } from './utils';

export const jstItalyBondReturns: AnnualReturn[] = [
	{ year: 1970, value: 2.81 },
	{ year: 1971, value: 11.63 },
	{ year: 1972, value: 5.71 },
	{ year: 1973, value: 4.16 },
	{ year: 1974, value: -9.74 },
	{ year: 1975, value: 11.64 },
	{ year: 1976, value: -0.65 },
	{ year: 1977, value: 6.32 },
	{ year: 1978, value: 14.29 },
	{ year: 1979, value: 8.99 },
	{ year: 1980, value: 8.04 },
	{ year: 1981, value: 2.92 },
	{ year: 1982, value: 11.91 },
	{ year: 1983, value: 17.82 },
	{ year: 1984, value: 27.07 },
	{ year: 1985, value: 15.01 },
	{ year: 1986, value: 17.86 },
	{ year: 1987, value: 11.74 },
	{ year: 1988, value: 9.22 },
	{ year: 1989, value: 10.97 },
	{ year: 1990, value: 14.65 },
	{ year: 1991, value: 16.27 },
	{ year: 1992, value: 9.09 },
	{ year: 1993, value: 40.2 },
	{ year: 1994, value: -10.91 },
	{ year: 1995, value: 21.48 },
	{ year: 1996, value: 31.48 },
	{ year: 1997, value: 19.46 },
	{ year: 1998, value: 17.69 },
	{ year: 1999, value: -6.74 },
	{ year: 2000, value: 7.74 },
	{ year: 2001, value: 6.52 },
	{ year: 2002, value: 11.67 },
	{ year: 2003, value: 4.75 },
	{ year: 2004, value: 10.49 },
	{ year: 2005, value: 6.49 },
	{ year: 2006, value: -0.71 },
	{ year: 2007, value: 1.85 },
	{ year: 2008, value: 7.48 },
	{ year: 2009, value: 9.45 },
	{ year: 2010, value: -0.72 },
	{ year: 2011, value: -6.49 },
	{ year: 2012, value: 24.55 },
	{ year: 2013, value: 8.85 },
	{ year: 2014, value: 19.59 },
	{ year: 2015, value: 4.6 },
	{ year: 2016, value: 1.63 },
	{ year: 2017, value: 3.15 },
	{ year: 2018, value: 0.69 },
	{ year: 2019, value: 24.43 },
	{ year: 2020, value: 12.56 }
];
