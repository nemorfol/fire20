/**
 * Matrice di correlazione tra asset class principali.
 * Fonte: Morningstar / Vanguard, basata su dati storici 1970-2024.
 * Correlazioni di Pearson sui rendimenti annuali reali.
 */

export type AssetClass =
	| 'usStocks'
	| 'intlStocks'
	| 'bonds'
	| 'gold'
	| 'realEstate'
	| 'cash';

/** Matrice di correlazione simmetrica */
export const correlationMatrix: Record<AssetClass, Record<AssetClass, number>> = {
	usStocks: {
		usStocks: 1.0,
		intlStocks: 0.582,
		bonds: 0.189,
		gold: 0.124,
		realEstate: 0.565,
		cash: 0.044
	},
	intlStocks: {
		usStocks: 0.582,
		intlStocks: 1.0,
		bonds: 0.126,
		gold: 0.209,
		realEstate: 0.489,
		cash: 0.031
	},
	bonds: {
		usStocks: 0.189,
		intlStocks: 0.126,
		bonds: 1.0,
		gold: -0.107,
		realEstate: 0.178,
		cash: 0.312
	},
	gold: {
		usStocks: 0.124,
		intlStocks: 0.209,
		bonds: -0.107,
		gold: 1.0,
		realEstate: 0.098,
		cash: -0.042
	},
	realEstate: {
		usStocks: 0.565,
		intlStocks: 0.489,
		bonds: 0.178,
		gold: 0.098,
		realEstate: 1.0,
		cash: 0.071
	},
	cash: {
		usStocks: 0.044,
		intlStocks: 0.031,
		bonds: 0.312,
		gold: -0.042,
		realEstate: 0.071,
		cash: 1.0
	}
};

/** Ottieni la correlazione tra due asset */
export function getCorrelation(a: AssetClass, b: AssetClass): number {
	return correlationMatrix[a][b];
}

/** Etichette italiane per le asset class */
export const assetLabels: Record<AssetClass, string> = {
	usStocks: 'Azioni USA',
	intlStocks: 'Azioni Internazionali',
	bonds: 'Obbligazioni',
	gold: 'Oro',
	realEstate: 'Immobiliare',
	cash: 'Liquidità'
};
