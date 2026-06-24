/**
 * Impostazioni dell'assistente AI, persistite in localStorage.
 * OFF DI DEFAULT: l'utente lo abilita esplicitamente da Impostazioni.
 * Stesso pattern degli altri store a rune del progetto (i18n, currency).
 */
import type { ProviderPreference } from './types';

export interface LLMSettings {
	/** Assistente attivo? false di default. */
	enabled: boolean;
	/** Provider preferito (auto = il migliore disponibile). */
	preferredProvider: ProviderPreference;
	/** URL del runtime locale (Ollama / OpenAI-compatibile). */
	ollamaUrl: string;
	/** Modello Ollama da usare (es. 'llama3.2', 'qwen2.5'). */
	ollamaModel: string;
}

const STORAGE_KEY = 'fire-llm-settings';

const DEFAULTS: LLMSettings = {
	enabled: false,
	preferredProvider: 'auto',
	ollamaUrl: 'http://localhost:11434',
	ollamaModel: ''
};

function load(): LLMSettings {
	if (typeof localStorage === 'undefined') return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LLMSettings>) };
	} catch {
		return { ...DEFAULTS };
	}
}

let settings = $state<LLMSettings>(load());

/** Ritorna le impostazioni correnti (oggetto reattivo). */
export function getLLMSettings(): LLMSettings {
	return settings;
}

/** Aggiorna (merge) le impostazioni e persiste in localStorage. */
export function updateLLMSettings(patch: Partial<LLMSettings>): void {
	settings = { ...settings, ...patch };
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	}
}
