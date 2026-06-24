/**
 * Layer assistente AI: rilevamento provider e generazione, tutto client-side.
 *
 * NON viene mai scaricato un modello a carico dell'app (vincolo Vercel):
 *  - Chrome Prompt API (Gemini Nano): il modello e' nel browser/OS;
 *  - Ollama: runtime locale dell'utente su http://localhost.
 * Se nessun provider e' disponibile, l'app resta pienamente funzionante senza AI
 * (degrado con grazia, come il ticker di mercato).
 *
 * INTEGRITA' NUMERICA: l'assistente spiega/narra, NON calcola numeri fiscali o
 * finanziari (vedi SYSTEM_PROMPT). I numeri arrivano gia' calcolati dal motore.
 */
import type {
	LLMMessage,
	LLMProviderId,
	LLMProviderStatus,
	LLMStreamOptions
} from './types';
import type { LLMSettings } from './store.svelte';

/**
 * System prompt che vincola l'assistente: niente consulenza, niente numeri
 * inventati. E' la traduzione operativa del disclaimer "strumento educativo".
 */
export const SYSTEM_PROMPT = `Sei l'assistente di FIRE Planner, un'app italiana di pianificazione finanziaria FIRE.
Regole tassative:
- NON sei un consulente finanziario: non dare consigli operativi su cosa comprare o vendere.
- NON inventare aliquote, soglie, coefficienti o numeri: usa SOLO i valori presenti nel contesto fornito o gia' calcolati dal motore. Se un numero non c'e', dillo e rimanda alla sezione/strumento corretto.
- Spiega in modo chiaro e in italiano i risultati gia' calcolati (FIRE number, tasso di successo, ecc.), non rifarli a mente.
- Chiudi ricordando che e' uno strumento educativo, non consulenza finanziaria.`;

// ---------------------------------------------------------------------------
// Chrome Prompt API (Gemini Nano) — in-browser, 0 byte a carico dell'app
// ---------------------------------------------------------------------------

interface ChromeLanguageModel {
	availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
	create(opts?: {
		initialPrompts?: { role: string; content: string }[];
	}): Promise<ChromeSession>;
}
interface ChromeSession {
	prompt(input: string): Promise<string>;
	destroy?(): void;
}

function getChromeLM(): ChromeLanguageModel | null {
	if (typeof window === 'undefined') return null;
	const w = window as unknown as {
		LanguageModel?: ChromeLanguageModel;
		ai?: { languageModel?: ChromeLanguageModel };
	};
	return w.LanguageModel ?? w.ai?.languageModel ?? null;
}

async function detectChrome(): Promise<LLMProviderStatus> {
	const lm = getChromeLM();
	if (!lm) {
		return {
			id: 'chrome-builtin',
			available: false,
			label: 'Chrome AI integrata (Gemini Nano)',
			detail: 'Non disponibile in questo browser'
		};
	}
	try {
		const av = await lm.availability();
		const available = av === 'available';
		return {
			id: 'chrome-builtin',
			available,
			label: 'Chrome AI integrata (Gemini Nano)',
			detail: available
				? 'Pronta, on-device (nessun dato lascia il dispositivo)'
				: av === 'downloadable' || av === 'downloading'
					? 'Supportata ma il modello va scaricato dal browser'
					: 'Non disponibile su questo dispositivo'
		};
	} catch {
		return {
			id: 'chrome-builtin',
			available: false,
			label: 'Chrome AI integrata (Gemini Nano)',
			detail: 'Non disponibile'
		};
	}
}

async function* streamChrome(messages: LLMMessage[]): AsyncGenerator<string> {
	const lm = getChromeLM();
	if (!lm) throw new Error('Chrome AI non disponibile');
	const system = messages.find((m) => m.role === 'system')?.content;
	const convo = messages.filter((m) => m.role !== 'system');
	const session = await lm.create(
		system ? { initialPrompts: [{ role: 'system', content: system }] } : undefined
	);
	try {
		const input = convo.map((m) => `${m.role}: ${m.content}`).join('\n');
		const text = await session.prompt(input);
		yield text;
	} finally {
		session.destroy?.();
	}
}

// ---------------------------------------------------------------------------
// Ollama (runtime locale dell'utente) — 0 byte a carico dell'app
// ---------------------------------------------------------------------------

function ollamaBase(settings: LLMSettings): string {
	return settings.ollamaUrl.replace(/\/+$/, '');
}

async function detectOllama(settings: LLMSettings): Promise<LLMProviderStatus> {
	try {
		const res = await fetch(`${ollamaBase(settings)}/api/tags`, { method: 'GET' });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as { models?: { name: string }[] };
		const models = (data.models ?? []).map((m) => m.name);
		return {
			id: 'ollama',
			available: models.length > 0,
			label: 'Ollama (locale)',
			detail: models.length
				? `${models.length} modelli disponibili in locale`
				: 'Attivo ma nessun modello installato (usa: ollama pull ...)',
			models
		};
	} catch {
		return {
			id: 'ollama',
			available: false,
			label: 'Ollama (locale)',
			detail: 'Non raggiungibile. Avvia Ollama in locale; su web pubblico (https) il browser puo\' bloccare localhost.'
		};
	}
}

async function* streamOllama(
	messages: LLMMessage[],
	settings: LLMSettings,
	opts: LLMStreamOptions
): AsyncGenerator<string> {
	const model = opts.model || settings.ollamaModel;
	if (!model) throw new Error('Nessun modello Ollama selezionato nelle impostazioni.');
	const res = await fetch(`${ollamaBase(settings)}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			messages,
			stream: true,
			options: { temperature: opts.temperature ?? 0.4 }
		}),
		signal: opts.signal
	});
	if (!res.ok || !res.body) throw new Error(`Ollama: errore ${res.status}`);
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				const obj = JSON.parse(trimmed) as { message?: { content?: string } };
				if (obj.message?.content) yield obj.message.content;
			} catch {
				// riga non-JSON: ignora
			}
		}
	}
}

// ---------------------------------------------------------------------------
// API pubblica
// ---------------------------------------------------------------------------

/** Rileva lo stato dei provider (per la UI di Impostazioni). */
export function detectProviders(settings: LLMSettings): Promise<LLMProviderStatus[]> {
	return Promise.all([detectChrome(), detectOllama(settings)]);
}

/** Determina il provider da usare in base a impostazioni e disponibilita'. */
export async function resolveProvider(settings: LLMSettings): Promise<LLMProviderId> {
	if (!settings.enabled) return 'none';
	const statuses = await detectProviders(settings);
	const byId = (id: 'chrome-builtin' | 'ollama') => statuses.find((s) => s.id === id);
	if (settings.preferredProvider !== 'auto') {
		return byId(settings.preferredProvider)?.available ? settings.preferredProvider : 'none';
	}
	// auto: prima Ollama (qualita' superiore), poi Chrome on-device
	if (byId('ollama')?.available) return 'ollama';
	if (byId('chrome-builtin')?.available) return 'chrome-builtin';
	return 'none';
}

/**
 * Genera una risposta in streaming. Antepone SYSTEM_PROMPT se non gia' presente.
 * Lancia se nessun provider e' disponibile (la UI deve gestire il fallback).
 */
export async function* streamChat(
	messages: LLMMessage[],
	settings: LLMSettings,
	opts: LLMStreamOptions = {}
): AsyncGenerator<string> {
	const provider = await resolveProvider(settings);
	if (provider === 'none') {
		throw new Error('Nessun provider AI disponibile. Attiva Ollama in locale o usa un browser con AI integrata.');
	}
	const withSystem: LLMMessage[] = messages.some((m) => m.role === 'system')
		? messages
		: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
	if (provider === 'chrome-builtin') {
		yield* streamChrome(withSystem);
	} else {
		yield* streamOllama(withSystem, settings, opts);
	}
}
