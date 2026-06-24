<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Card,
		Button,
		Alert,
		Textarea,
		Toggle,
		Spinner,
		Badge
	} from 'flowbite-svelte';
	import { getLLMSettings, updateLLMSettings } from '$lib/llm/store.svelte';
	import { detectProviders, streamChat, SYSTEM_PROMPT, pickBestOllamaModel } from '$lib/llm';
	import type { LLMMessage, LLMProviderStatus } from '$lib/llm/types';
	import { getAllProfiles } from '$lib/db/profiles';
	import { calculateFireNumber, calculateNetWorth } from '$lib/engine/fire-calculator';
	import { formatCurrency } from '$lib/utils/format';
	import { guideSteps } from '$lib/guida/steps';
	import { renderMarkdown, stripMarkdown } from '$lib/utils/markdown';

	let enabled = $state(false);
	let checking = $state(true);
	let providerStatuses = $state<LLMProviderStatus[]>([]);
	let providerAvailable = $derived(providerStatuses.some((s) => s.available));

	let profileSummary = $state('');
	let messages = $state<{ role: 'user' | 'assistant'; content: string }[]>([]);
	let input = $state('');
	let busy = $state(false);
	let errorMsg = $state('');

	// Voce (Web Speech API, locale)
	let ttsOn = $state(false);
	let listening = $state(false);
	const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
	const sttSupported =
		typeof window !== 'undefined' &&
		('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

	onMount(async () => {
		const s = getLLMSettings();
		enabled = s.enabled;
		// Grounding sui numeri reali del profilo (best-effort).
		try {
			const profiles = await getAllProfiles();
			const p = profiles[0];
			if (p) {
				const netWorth = calculateNetWorth(p.portfolio as unknown as Record<string, number>);
				const expenses = p.fireExpenses || p.annualExpenses || 0;
				const swr = p.simulation?.withdrawalRate ?? 0.04;
				const fireNumber = calculateFireNumber(expenses, swr);
				profileSummary =
					`Numeri del profilo "${p.name}": patrimonio netto ${formatCurrency(netWorth)}, ` +
					`spese annue di riferimento ${formatCurrency(expenses)}, SWR ${(swr * 100).toFixed(1)}%, ` +
					`FIRE number ${formatCurrency(fireNumber)}.`;
			}
		} catch {
			// nessun profilo / errore: l'assistente risponde senza i numeri personali
		}
		if (enabled) {
			try {
				providerStatuses = await detectProviders(s);
				// Se Ollama e' attivo ma manca un modello scelto, seleziona il migliore.
				const ollama = providerStatuses.find((p) => p.id === 'ollama');
				if (ollama?.available && ollama.models?.length && !getLLMSettings().ollamaModel) {
					updateLLMSettings({ ollamaModel: pickBestOllamaModel(ollama.models) });
				}
			} catch {
				// degrado con grazia
			}
		}
		checking = false;
	});

	/** Estrae fino a 2 capitoli di guida pertinenti alla domanda (grounding). */
	function guideExcerpts(question: string): string {
		const words = question
			.toLowerCase()
			.split(/\W+/)
			.filter((w) => w.length > 3);
		if (words.length === 0) return '';
		const scored = guideSteps
			.map((g) => {
				const hay = (g.title + ' ' + g.summary).toLowerCase();
				const score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
				return { g, score };
			})
			.filter((x) => x.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 2);
		if (scored.length === 0) return '';
		return (
			'Estratti pertinenti della guida (usali come riferimento):\n' +
			scored.map((x) => `- ${x.g.title}: ${x.g.summary}`).join('\n')
		);
	}

	function buildSystem(question: string): LLMMessage {
		const parts = [SYSTEM_PROMPT];
		if (profileSummary) parts.push('\nDati gia\' calcolati dal motore:\n' + profileSummary);
		const ex = guideExcerpts(question);
		if (ex) parts.push('\n' + ex);
		return { role: 'system', content: parts.join('\n') };
	}

	function speak(text: string) {
		if (!ttsSupported) return;
		const u = new SpeechSynthesisUtterance(text);
		u.lang = 'it-IT';
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(u);
	}

	function startListening() {
		if (!sttSupported) {
			errorMsg = 'Riconoscimento vocale non supportato da questo browser.';
			return;
		}
		const w = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
		const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
		const rec = new SR();
		rec.lang = 'it-IT';
		rec.interimResults = false;
		listening = true;
		rec.onresult = (e: any) => {
			input = e.results?.[0]?.[0]?.transcript ?? input;
		};
		rec.onend = () => (listening = false);
		rec.onerror = () => (listening = false);
		rec.start();
	}

	async function send() {
		const q = input.trim();
		if (!q || busy) return;
		errorMsg = '';
		messages.push({ role: 'user', content: q });
		input = '';
		busy = true;
		const idx = messages.push({ role: 'assistant', content: '' }) - 1;
		try {
			const convo: LLMMessage[] = [
				buildSystem(q),
				...messages
					.slice(0, idx)
					.map((m) => ({ role: m.role, content: m.content }) as LLMMessage)
			];
			let full = '';
			for await (const chunk of streamChat(convo, getLLMSettings())) {
				full += chunk;
				messages[idx] = { role: 'assistant', content: full };
			}
			if (ttsOn && full) speak(full);
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Errore durante la generazione.';
			messages.splice(idx, 1);
		} finally {
			busy = false;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<svelte:head>
	<title>Assistente AI — FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/">Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Assistente AI</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Assistente AI <Badge color="purple" class="align-middle">opzionale</Badge></Heading>
<p class="mb-6 text-gray-600 dark:text-gray-400">
	Spiega i tuoi numeri (FIRE number, fisco, pensione) usando un'AI che gira sul tuo dispositivo.
	Nessun dato lascia il browser. L'AI <strong>spiega</strong> i risultati del motore, non li calcola.
</p>

{#if checking}
	<div class="flex items-center gap-2 text-gray-500"><Spinner size="5" /> Verifica disponibilità…</div>
{:else if !enabled}
	<Alert color="yellow">
		L'assistente AI è <strong>disattivato</strong>. Attivalo da
		<a href="/impostazioni/" class="font-medium underline">Impostazioni → Assistente AI</a>.
	</Alert>
{:else if !providerAvailable}
	<Alert color="yellow">
		<p class="font-medium">Nessun provider AI disponibile su questo dispositivo.</p>
		<p class="mt-1 text-sm">
			Per usare l'assistente serve un'AI integrata nel browser (Chrome/Edge recenti) oppure
			<strong>Ollama</strong> in locale. Sul sito pubblico (https) le chiamate a localhost possono
			essere bloccate: in tal caso esegui l'app in locale. Configura tutto da
			<a href="/impostazioni/" class="font-medium underline">Impostazioni</a>.
		</p>
	</Alert>
{:else}
	<Card class="max-w-none mb-4">
		<div class="flex flex-col gap-3">
			{#if messages.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Esempi: «Perché il mio FIRE number è quello?», «Come funziona la regola del 4%?»,
					«Cosa cambia tra ETF ad accumulazione e distribuzione?»
				</p>
			{/if}
			{#each messages as m (m)}
				<div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[85%] rounded-lg px-3 py-2 text-sm {m.role === 'user'
							? 'whitespace-pre-wrap bg-primary-600 text-white'
							: 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'}"
					>
						{#if m.role === 'assistant'}
							{#if m.content}
								<div class="leading-relaxed">{@html renderMarkdown(m.content)}</div>
								{#if ttsSupported}
									<button
										class="mt-1 text-xs underline opacity-70"
										onclick={() => speak(stripMarkdown(m.content))}
									>
										🔊 leggi
									</button>
								{/if}
							{:else}
								{busy ? '…' : ''}
							{/if}
						{:else}
							{m.content}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</Card>

	{#if errorMsg}
		<Alert color="red" class="mb-3">{errorMsg}</Alert>
	{/if}

	<Textarea
		bind:value={input}
		onkeydown={onKey}
		rows={3}
		placeholder="Scrivi una domanda…  (Invio per inviare, Shift+Invio per andare a capo)"
		class="mb-2 w-full"
	/>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-3">
			{#if sttSupported}
				<Button color="light" onclick={startListening} disabled={listening} title="Detta la domanda">
					{listening ? '🎙️ ascolto…' : '🎙️ Detta'}
				</Button>
			{/if}
			{#if ttsSupported}
				<Toggle bind:checked={ttsOn} size="small">Leggi ad alta voce</Toggle>
			{/if}
		</div>
		<Button color="primary" onclick={send} disabled={busy || !input.trim()}>
			{busy ? 'Genero…' : 'Invia'}
		</Button>
	</div>
	<p class="mt-2 text-right text-xs text-gray-400">
		Strumento educativo, non è consulenza finanziaria.
	</p>
{/if}
