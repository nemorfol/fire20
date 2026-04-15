/**
 * Web Worker per l'esecuzione della simulazione Monte Carlo.
 * Riceve i parametri via postMessage, esegue la simulazione e
 * invia aggiornamenti di progresso e il risultato finale.
 *
 * Messaggi in ingresso:
 *   { type: 'run', params: MonteCarloParams }
 *
 * Messaggi in uscita:
 *   { type: 'progress', percent: number }
 *   { type: 'result', data: MonteCarloResult }
 *   { type: 'error', message: string }
 */

import { runMonteCarloSimulation } from '../engine/monte-carlo.js';
import type { MonteCarloParams, MonteCarloResult } from '../engine/monte-carlo.js';

/** Tipo dei messaggi in ingresso al worker */
interface WorkerInMessage {
	type: 'run';
	params: MonteCarloParams;
}

/** Tipo dei messaggi in uscita dal worker */
type WorkerOutMessage =
	| { type: 'progress'; percent: number }
	| { type: 'result'; data: MonteCarloResult }
	| { type: 'error'; message: string };

/**
 * Gestore dei messaggi in arrivo.
 * Esegue la simulazione Monte Carlo e invia il risultato.
 */
self.onmessage = function (event: MessageEvent<WorkerInMessage>) {
	const { type, params } = event.data;

	if (type !== 'run') {
		const msg: WorkerOutMessage = {
			type: 'error',
			message: `Tipo di messaggio non riconosciuto: ${type}`
		};
		self.postMessage(msg);
		return;
	}

	try {
		// Aggiunge il callback per il progresso
		const paramsWithProgress: MonteCarloParams = {
			...params,
			onProgress: (percent: number) => {
				const msg: WorkerOutMessage = { type: 'progress', percent };
				self.postMessage(msg);
			}
		};

		// Esegui la simulazione
		const result = runMonteCarloSimulation(paramsWithProgress);

		// Invia il risultato
		const msg: WorkerOutMessage = { type: 'result', data: result };
		self.postMessage(msg);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Errore sconosciuto durante la simulazione';
		const msg: WorkerOutMessage = { type: 'error', message };
		self.postMessage(msg);
	}
};
