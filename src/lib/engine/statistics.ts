/**
 * Utilità statistiche per le simulazioni Monte Carlo.
 * Include calcolo percentili, generazione numeri casuali,
 * distribuzioni log-normali e decomposizione di Cholesky.
 */

/**
 * Calcola i percentili specificati da un array di dati.
 * Usa interpolazione lineare tra i valori più vicini.
 *
 * @param data - Array di valori numerici (non deve essere vuoto)
 * @param percentiles - Array di percentili da calcolare (es. [5, 25, 50, 75, 95])
 * @returns Array di valori corrispondenti ai percentili richiesti
 */
export function calculatePercentiles(data: number[], percentiles: number[]): number[] {
	if (data.length === 0) return percentiles.map(() => 0);

	const sorted = [...data].sort((a, b) => a - b);
	const n = sorted.length;

	return percentiles.map((p) => {
		if (p <= 0) return sorted[0];
		if (p >= 100) return sorted[n - 1];

		const index = (p / 100) * (n - 1);
		const lower = Math.floor(index);
		const upper = Math.ceil(index);

		if (lower === upper) return sorted[lower];

		// Interpolazione lineare
		const fraction = index - lower;
		return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
	});
}

/**
 * Calcola la media aritmetica di un array di valori.
 *
 * @param data - Array di valori numerici
 * @returns Media aritmetica, 0 se l'array è vuoto
 */
export function calculateMean(data: number[]): number {
	if (data.length === 0) return 0;
	return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calcola la deviazione standard (della popolazione) di un array di valori.
 *
 * @param data - Array di valori numerici
 * @returns Deviazione standard, 0 se meno di 2 valori
 */
export function calculateStdDev(data: number[]): number {
	if (data.length < 2) return 0;

	const mean = calculateMean(data);
	const squaredDiffs = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);

	return Math.sqrt(squaredDiffs / data.length);
}

/**
 * Genera un numero casuale con distribuzione gaussiana (normale).
 * Usa la trasformazione di Box-Muller.
 *
 * @param mean - Media della distribuzione
 * @param stdDev - Deviazione standard della distribuzione
 * @returns Numero casuale dalla distribuzione normale specificata
 */
export function gaussianRandom(mean: number, stdDev: number): number {
	// Box-Muller transform
	let u1: number;
	let u2: number;

	do {
		u1 = Math.random();
	} while (u1 === 0); // Evita log(0)

	u2 = Math.random();

	const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	return mean + z0 * stdDev;
}

/**
 * Genera un rendimento con distribuzione log-normale.
 * I rendimenti finanziari seguono approssimativamente una distribuzione log-normale.
 *
 * Il rendimento è calcolato come exp(N(mu, sigma)) - 1, dove mu e sigma
 * sono parametri della distribuzione normale sottostante, calcolati dai
 * parametri della log-normale (media e deviazione standard dei rendimenti).
 *
 * @param mean - Rendimento medio atteso (es. 0.07 per 7%)
 * @param stdDev - Deviazione standard dei rendimenti (es. 0.15 per 15%)
 * @returns Rendimento casuale dalla distribuzione log-normale
 */
export function logNormalReturn(mean: number, stdDev: number): number {
	// Converti parametri della log-normale in parametri della normale sottostante
	const variance = stdDev * stdDev;
	const mu = Math.log((1 + mean) / Math.sqrt(1 + variance / ((1 + mean) * (1 + mean))));
	const sigma = Math.sqrt(Math.log(1 + variance / ((1 + mean) * (1 + mean))));

	const normalRandom = gaussianRandom(mu, sigma);
	return Math.exp(normalRandom) - 1;
}

/**
 * Estrae un campione casuale dai rendimenti storici (bootstrap semplice).
 *
 * @param historicalReturns - Array di rendimenti storici
 * @returns Un rendimento estratto casualmente
 */
export function bootstrapSample(historicalReturns: number[]): number {
	if (historicalReturns.length === 0) return 0;
	const index = Math.floor(Math.random() * historicalReturns.length);
	return historicalReturns[index];
}

/**
 * Estrae un blocco di campioni consecutivi dai rendimenti storici.
 * Il block bootstrap preserva le autocorrelazioni nei dati.
 *
 * @param historicalReturns - Array di rendimenti storici
 * @param blockSize - Dimensione del blocco da estrarre
 * @returns Array di rendimenti consecutivi
 */
export function blockBootstrapSample(
	historicalReturns: number[],
	blockSize: number
): number[] {
	if (historicalReturns.length === 0) return [];
	if (blockSize <= 0) return [];

	const n = historicalReturns.length;
	const effectiveBlockSize = Math.min(blockSize, n);

	// Punto di inizio casuale (con wrap-around)
	const startIndex = Math.floor(Math.random() * n);
	const block: number[] = [];

	for (let i = 0; i < effectiveBlockSize; i++) {
		const index = (startIndex + i) % n;
		block.push(historicalReturns[index]);
	}

	return block;
}

/**
 * Genera rendimenti correlati per più asset usando la decomposizione di Cholesky.
 *
 * Processo:
 * 1. Decomponi la matrice di correlazione con Cholesky (L * L^T = C)
 * 2. Genera vettore di variabili normali standard indipendenti Z
 * 3. Calcola rendimenti correlati: R = means + L * Z * stdDevs
 *
 * @param means - Array di rendimenti medi per ogni asset
 * @param stdDevs - Array di deviazioni standard per ogni asset
 * @param correlationMatrix - Matrice di correlazione (NxN, simmetrica, definita positiva)
 * @returns Array di rendimenti correlati per ogni asset
 */
export function correlatedReturns(
	means: number[],
	stdDevs: number[],
	correlationMatrix: number[][]
): number[] {
	const n = means.length;

	if (n === 0) return [];
	if (n !== stdDevs.length || n !== correlationMatrix.length) {
		throw new Error('Dimensioni non corrispondenti tra means, stdDevs e correlationMatrix');
	}

	// Decomposizione di Cholesky: L tale che L * L^T = correlationMatrix
	const L = choleskyDecomposition(correlationMatrix);

	// Genera vettore di normali standard indipendenti
	const Z: number[] = [];
	for (let i = 0; i < n; i++) {
		Z.push(gaussianRandom(0, 1));
	}

	// Calcola rendimenti correlati: R_i = mean_i + stdDev_i * sum(L[i][j] * Z[j])
	const returns: number[] = [];
	for (let i = 0; i < n; i++) {
		let correlatedZ = 0;
		for (let j = 0; j <= i; j++) {
			correlatedZ += L[i][j] * Z[j];
		}
		returns.push(means[i] + stdDevs[i] * correlatedZ);
	}

	return returns;
}

/**
 * Decomposizione di Cholesky di una matrice simmetrica definita positiva.
 * Restituisce la matrice triangolare inferiore L tale che A = L * L^T.
 *
 * @param matrix - Matrice simmetrica definita positiva
 * @returns Matrice triangolare inferiore L
 */
function choleskyDecomposition(matrix: number[][]): number[][] {
	const n = matrix.length;
	const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

	for (let i = 0; i < n; i++) {
		for (let j = 0; j <= i; j++) {
			let sum = 0;

			if (j === i) {
				// Elemento diagonale
				for (let k = 0; k < j; k++) {
					sum += L[j][k] * L[j][k];
				}
				const diag = matrix[j][j] - sum;
				if (diag < 0) {
					// Matrice non definita positiva, usa valore piccolo
					L[j][j] = 1e-10;
				} else {
					L[j][j] = Math.sqrt(diag);
				}
			} else {
				// Elemento non diagonale
				for (let k = 0; k < j; k++) {
					sum += L[i][k] * L[j][k];
				}
				L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
			}
		}
	}

	return L;
}
