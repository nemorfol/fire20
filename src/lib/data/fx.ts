/**
 * Tassi di cambio storici per convertire in EUR le serie quotate in USD.
 *
 * Fonte: Federal Reserve Board, rilevazioni H.10/G.5 (noon buying rates NY),
 * via FRED (St. Louis Fed):
 *   - EXITUS: lire italiane per 1 USD, media mensile (1971-2001)
 *   - EXUSEU: USD per 1 EUR, media mensile (dal 1999)
 * Si usa la media di DICEMBRE come proxy del cambio di fine anno.
 *
 * 1969-1970: Bretton Woods, parita' ufficiale 625 ITL/USD (in vigore dal 1949
 * fino ad agosto 1971; il mercato a gennaio 1971 quotava 623,26).
 *
 * Il passaggio 1998 -> 1999 usa il tasso irrevocabile di conversione
 * 1 EUR = 1936,27 ITL (Reg. CE 2866/98): le lire sono espresse in "EUR
 * equivalenti", cosi' una serie in lire fino al 1998 ed in euro dopo e'
 * un'unica serie omogenea (la conversione a tasso fisso non altera i rendimenti).
 */

import type { AnnualReturn } from './utils';

/** Tasso irrevocabile lira/euro (Reg. CE 2866/98 del 31/12/1998) */
export const ITL_PER_EUR = 1936.27;

/** Lire per 1 USD, media di dicembre (1969-1970: parita' Bretton Woods) */
export const itlPerUsdDecember: Record<number, number> = {
	1969: 625.0,
	1970: 625.0,
	1971: 600.57,
	1972: 583.23,
	1973: 607.6,
	1974: 658.87,
	1975: 682.85,
	1976: 867.97,
	1977: 875.98,
	1978: 843.04,
	1979: 811.09,
	1980: 934.41,
	1981: 1206.36,
	1982: 1398.74,
	1983: 1666.88,
	1984: 1912.53,
	1985: 1713.5,
	1986: 1379.44,
	1987: 1203.74,
	1988: 1295.61,
	1989: 1291.93,
	1990: 1129.26,
	1991: 1182.21,
	1992: 1412.38,
	1993: 1687.17,
	1994: 1633.71,
	1995: 1593.88,
	1996: 1528.44,
	1997: 1743.86,
	1998: 1653.23
};

/** USD per 1 EUR, media di dicembre (FRED EXUSEU) */
export const usdPerEurDecember: Record<number, number> = {
	1999: 1.011,
	2000: 0.8983,
	2001: 0.8912,
	2002: 1.0194,
	2003: 1.2298,
	2004: 1.3406,
	2005: 1.1861,
	2006: 1.3205,
	2007: 1.4559,
	2008: 1.3511,
	2009: 1.4579,
	2010: 1.3221,
	2011: 1.3155,
	2012: 1.3119,
	2013: 1.3708,
	2014: 1.2329,
	2015: 1.0889,
	2016: 1.0545,
	2017: 1.1836,
	2018: 1.138,
	2019: 1.1114,
	2020: 1.2168,
	2021: 1.1301,
	2022: 1.0591,
	2023: 1.0909,
	2024: 1.0472,
	2025: 1.171
};

/**
 * EUR (o EUR-equivalenti, per gli anni in lire) necessari per 1 USD a fine anno.
 * Restituisce undefined se l'anno non e' coperto.
 */
export function eurPerUsd(year: number): number | undefined {
	if (year <= 1998) {
		const itl = itlPerUsdDecember[year];
		return itl === undefined ? undefined : itl / ITL_PER_EUR;
	}
	const usd = usdPerEurDecember[year];
	return usd === undefined ? undefined : 1 / usd;
}

/**
 * Converte una serie di rendimenti annui in USD (percentuali) nella prospettiva di
 * un investitore in lire/euro non coperto dal rischio cambio:
 *   (1 + r_EUR) = (1 + r_USD) * (EURUSD_{t} / EURUSD_{t-1})
 * con EURUSD = EUR per 1 USD a fine anno. Gli anni senza cambio (anno o anno
 * precedente) vengono scartati, non stimati.
 */
export function convertUsdReturnsToEur(series: AnnualReturn[]): AnnualReturn[] {
	const out: AnnualReturn[] = [];
	for (const { year, value } of series) {
		const fxPrev = eurPerUsd(year - 1);
		const fxNow = eurPerUsd(year);
		if (fxPrev === undefined || fxNow === undefined) continue;
		const r = (1 + value / 100) * (fxNow / fxPrev) - 1;
		out.push({ year, value: Math.round(r * 1e6) / 1e4 });
	}
	return out;
}
