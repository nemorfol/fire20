/**
 * Rendimenti annuali totali stimati per un portafoglio BTP italiani 7-10y
 * (1991-2024). Fonte: stima basata su yield BTP 10y storici + variazione prezzo
 * implicita (duration ~7). I dati sono APPROSSIMATIVI: usali come scenario
 * "obbligazionario IT" ma non come benchmark esatto.
 *
 * In assenza di un indice ICE/Bloomberg ITgov accessibile pubblicamente,
 * questi numeri rappresentano un proxy conservativo per la modalita'
 * "historical" e "block-bootstrap" del Monte Carlo applicate al contesto
 * italiano. Sostituiscili con dati ufficiali se disponibili.
 */

export interface AnnualReturn {
	year: number;
	value: number;
}

export const btpReturns: AnnualReturn[] = [
	{ year: 1991, value: 14.8 },
	{ year: 1992, value: -2.5 }, // crisi cambio Lira / EMS
	{ year: 1993, value: 18.4 },
	{ year: 1994, value: -3.8 },
	{ year: 1995, value: 16.2 },
	{ year: 1996, value: 14.5 },
	{ year: 1997, value: 13.1 },
	{ year: 1998, value: 12.8 },
	{ year: 1999, value: -2.1 },
	{ year: 2000, value: 7.6 },
	{ year: 2001, value: 7.0 },
	{ year: 2002, value: 9.4 },
	{ year: 2003, value: 4.9 },
	{ year: 2004, value: 7.3 },
	{ year: 2005, value: 5.6 },
	{ year: 2006, value: -0.3 },
	{ year: 2007, value: 1.0 },
	{ year: 2008, value: 6.7 },
	{ year: 2009, value: 4.5 },
	{ year: 2010, value: -0.6 },
	{ year: 2011, value: -7.4 }, // crisi spread BTP/Bund
	{ year: 2012, value: 18.2 },
	{ year: 2013, value: 7.0 },
	{ year: 2014, value: 14.2 },
	{ year: 2015, value: 4.4 },
	{ year: 2016, value: 0.5 },
	{ year: 2017, value: 1.2 },
	{ year: 2018, value: -1.7 }, // tensioni governo M5S/Lega
	{ year: 2019, value: 11.3 },
	{ year: 2020, value: 8.0 },
	{ year: 2021, value: -3.4 },
	{ year: 2022, value: -16.8 }, // shock tassi BCE
	{ year: 2023, value: 7.2 },
	{ year: 2024, value: 5.1 }
];
