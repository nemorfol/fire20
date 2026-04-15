/**
 * Modulo per il recupero di dati di mercato in tempo reale.
 * Utilizza Yahoo Finance v8 API (gratuita, senza autenticazione).
 *
 * Nota: L'API Yahoo Finance potrebbe avere restrizioni CORS dal browser.
 * In ambiente di produzione, si consiglia di usare un proxy server-side.
 */

export interface MarketQuote {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
	currency: string;
	lastUpdated: string;
}

export interface WatchlistItem {
	symbol: string;
	name: string;
}

/** Watchlist predefinita per investitori FIRE italiani */
export const DEFAULT_WATCHLIST: WatchlistItem[] = [
	{ symbol: 'VWCE.MI', name: 'Vanguard FTSE All-World (Milano)' },
	{ symbol: 'SWDA.MI', name: 'iShares Core MSCI World (Milano)' },
	{ symbol: 'AGGH.MI', name: 'iShares Core Global Aggregate Bond' },
	{ symbol: 'SGLD.MI', name: 'Invesco Physical Gold' },
	{ symbol: '^GSPC', name: 'S&P 500' },
	{ symbol: 'FTSEMIB.MI', name: 'FTSE MIB' },
	{ symbol: 'GC=F', name: 'Oro (USD/oz)' },
	{ symbol: 'EURUSD=X', name: 'EUR/USD' }
];

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * Recupera la quotazione corrente di un singolo simbolo.
 * Restituisce null se il fetch fallisce (es. CORS, rete, simbolo non trovato).
 */
export async function fetchQuote(symbol: string): Promise<MarketQuote | null> {
	try {
		const url = `${YAHOO_BASE_URL}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
		const response = await fetch(url);

		if (!response.ok) {
			console.warn(`[market-data] Errore HTTP ${response.status} per ${symbol}`);
			return null;
		}

		const data = await response.json();
		const result = data?.chart?.result?.[0];
		if (!result) return null;

		const meta = result.meta;
		const currentPrice = meta.regularMarketPrice ?? 0;
		const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
		const change = currentPrice - previousClose;
		const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

		// Trova il nome dalla watchlist se disponibile
		const watchlistItem = DEFAULT_WATCHLIST.find((w) => w.symbol === symbol);

		return {
			symbol,
			name: watchlistItem?.name ?? meta.shortName ?? meta.symbol ?? symbol,
			price: currentPrice,
			change,
			changePercent,
			currency: meta.currency ?? 'USD',
			lastUpdated: new Date().toISOString()
		};
	} catch (err) {
		// CORS o errore di rete - silenzioso in produzione
		console.warn(`[market-data] Impossibile recuperare ${symbol}:`, err);
		return null;
	}
}

/**
 * Recupera le quotazioni per piu' simboli in parallelo.
 * Ignora i simboli per cui il fetch fallisce.
 */
export async function fetchMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
	const promises = symbols.map((s) => fetchQuote(s));
	const results = await Promise.allSettled(promises);

	const quotes: MarketQuote[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value !== null) {
			quotes.push(result.value);
		}
	}
	return quotes;
}
