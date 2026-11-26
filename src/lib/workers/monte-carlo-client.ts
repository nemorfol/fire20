/**
 * Client condiviso per il Web Worker Monte Carlo.
 *
 * Incapsula il ciclo di vita del worker (creazione, invio parametri, dispatch
 * dei messaggi progress/result/error, terminazione) cosi' che le pagine che lo
 * usano (simulazione, scenari) non duplichino il boilerplate e restino allineate
 * al contratto in `monte-carlo.contract.ts`.
 */
import type { MonteCarloResult } from '../engine/monte-carlo.js';
import type {
	SerializableMonteCarloParams,
	WorkerInMessage,
	WorkerOutMessage
} from './monte-carlo.contract.js';

/** Callback invocati dal client al ricevere i messaggi del worker. */
export interface MonteCarloWorkerHandlers {
	/** Percentuale di avanzamento (0-100). */
	onProgress?: (percent: number) => void;
	/** Risultato finale della simulazione. */
	onResult: (result: MonteCarloResult) => void | Promise<void>;
	/** Errore applicativo riportato dal worker (messaggio 'error'). */
	onError: (message: string) => void;
	/**
	 * Errore a basso livello del worker stesso (evento `onerror`). Se non
	 * fornito, viene inoltrato a `onError` col messaggio dell'evento.
	 */
	onWorkerError?: (event: ErrorEvent) => void;
}

/** Crea una nuova istanza del worker Monte Carlo. */
export function createMonteCarloWorker(): Worker {
	return new Worker(new URL('./monte-carlo.worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Termina l'eventuale worker precedente, ne avvia uno nuovo, aggancia gli
 * handler e invia i parametri. Ritorna il nuovo worker: il chiamante deve
 * conservarne il riferimento per poterlo terminare (es. onunmount).
 */
export function runMonteCarloWorker(
	previous: Worker | null,
	params: SerializableMonteCarloParams,
	handlers: MonteCarloWorkerHandlers
): Worker {
	previous?.terminate();

	const worker = createMonteCarloWorker();

	worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
		const data = e.data;
		if (data.type === 'progress') {
			handlers.onProgress?.(data.percent);
		} else if (data.type === 'result') {
			void handlers.onResult(data.data);
		} else if (data.type === 'error') {
			handlers.onError(data.message);
		}
	};

	worker.onerror = (event: ErrorEvent) => {
		if (handlers.onWorkerError) {
			handlers.onWorkerError(event);
		} else {
			handlers.onError(event.message);
		}
	};

	worker.postMessage({ type: 'run', params } satisfies WorkerInMessage);

	return worker;
}
