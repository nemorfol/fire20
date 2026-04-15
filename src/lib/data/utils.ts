/**
 * Utilita' condivise per i moduli dati storici.
 * Evita duplicazione di interfacce e funzioni di calcolo statistico.
 */

/** Rendimento annuale con anno e valore in percentuale */
export interface AnnualReturn {
	year: number;
	/** Valore in percentuale (es. 7.5 per 7.5%) */
	value: number;
}

/** Statistiche descrittive di una serie storica */
export interface DataStats {
	mean: number;
	stdDev: number;
	min: number;
	max: number;
	count: number;
}

/**
 * Calcola le statistiche descrittive di una serie di rendimenti.
 * I valori sono in percentuale (es. 7.5 per 7.5%).
 */
export function computeStats(data: AnnualReturn[]): DataStats {
	const values = data.map((d) => d.value);
	const count = values.length;
	const mean = values.reduce((a, b) => a + b, 0) / count;
	const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count;
	const stdDev = Math.sqrt(variance);
	const min = Math.min(...values);
	const max = Math.max(...values);
	return { mean, stdDev, min, max, count };
}

/**
 * Converte un array di rendimenti da formato percentuale (7.5) a decimale (0.075).
 * Essenziale per passare dati storici al motore Monte Carlo.
 */
export function toDecimalReturns(data: AnnualReturn[]): number[] {
	return data.map((d) => d.value / 100);
}

/**
 * Estrae solo i valori numerici da un array di AnnualReturn (in percentuale).
 */
export function extractValues(data: AnnualReturn[]): number[] {
	return data.map((d) => d.value);
}
