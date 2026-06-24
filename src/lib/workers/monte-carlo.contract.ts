/**
 * Contratto dei messaggi scambiati con monte-carlo.worker.ts.
 *
 * Estratto in un modulo CONDIVISO cosi' che il worker e i suoi consumer (le
 * pagine simulazione/scenari) usino esattamente gli stessi tipi: rinominare un
 * campo del messaggio ora rompe il type-check invece di passare in silenzio
 * (postMessage/onmessage altrimenti sono `any`).
 */
import type { MonteCarloParams, MonteCarloResult } from '../engine/monte-carlo.js';

/**
 * Parametri serializzabili inviati al worker: come MonteCarloParams ma senza
 * `onProgress` (le funzioni non sono clonabili via postMessage; il progresso
 * torna al main thread come messaggio 'progress').
 */
export type SerializableMonteCarloParams = Omit<MonteCarloParams, 'onProgress'>;

/** Messaggi in ingresso al worker */
export interface WorkerInMessage {
	type: 'run';
	params: SerializableMonteCarloParams;
}

/** Messaggi in uscita dal worker */
export type WorkerOutMessage =
	| { type: 'progress'; percent: number }
	| { type: 'result'; data: MonteCarloResult }
	| { type: 'error'; message: string };
