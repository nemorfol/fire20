/**
 * Tipi del layer assistente AI (opzionale, off di default).
 *
 * Principio: l'assistente e' un "provider client-side" in piu', come il ticker
 * di mercato. Non gira nessun modello a carico dell'app ne' su Vercel:
 *  - 'chrome-builtin' = Prompt API del browser (Gemini Nano), on-device, 0 byte;
 *  - 'ollama'         = runtime locale dell'utente (http://localhost), 0 byte lato app.
 * Nessun peso di modello viene mai servito dalla nostra origin (vincolo Vercel).
 */

/** Provider effettivamente utilizzabile per generare. */
export type LLMProviderId = 'chrome-builtin' | 'ollama' | 'none';

/** Preferenza dell'utente (auto = scegli il migliore disponibile). */
export type ProviderPreference = 'auto' | 'chrome-builtin' | 'ollama';

/** Messaggio della conversazione. */
export interface LLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/** Stato di disponibilita' di un provider (per la UI di Impostazioni). */
export interface LLMProviderStatus {
	id: 'chrome-builtin' | 'ollama';
	available: boolean;
	/** Etichetta leggibile. */
	label: string;
	/** Dettaglio stato in italiano. */
	detail: string;
	/** Modelli rilevati (solo Ollama). */
	models?: string[];
}

/** Opzioni di generazione. */
export interface LLMStreamOptions {
	signal?: AbortSignal;
	temperature?: number;
	model?: string;
}
