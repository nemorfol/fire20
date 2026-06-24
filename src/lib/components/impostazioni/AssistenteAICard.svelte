<script lang="ts">
	import { Card, Heading, Toggle, Select, Input, Label, Button, Badge, Alert } from 'flowbite-svelte';
	import { getLLMSettings, updateLLMSettings, type LLMSettings } from '$lib/llm/store.svelte';
	import { detectProviders, pickBestOllamaModel } from '$lib/llm';
	import type { LLMProviderStatus } from '$lib/llm/types';

	// Copia locale reattiva (stesso pattern delle altre impostazioni).
	let settings = $state<LLMSettings>({ ...getLLMSettings() });
	// Intermediario string per il Select (evita problemi di tipizzazione del bind).
	let prefStr = $state<string>(settings.preferredProvider);
	let statuses = $state<LLMProviderStatus[]>([]);
	let detecting = $state(false);
	let detected = $state(false);
	let ollamaModels = $state<string[]>([]);

	const providerItems = [
		{ value: 'auto', name: 'Automatico (migliore disponibile)' },
		{ value: 'ollama', name: 'Ollama (locale)' },
		{ value: 'chrome-builtin', name: 'Chrome AI integrata' }
	];

	// Persistenza ESPLICITA su ogni modifica (niente $effect: eviterebbe cicli
	// read/write dello stesso stato -> effect_update_depth_exceeded).
	function persist() {
		settings.preferredProvider =
			prefStr === 'ollama' || prefStr === 'chrome-builtin' ? prefStr : 'auto';
		updateLLMSettings({
			enabled: settings.enabled,
			preferredProvider: settings.preferredProvider,
			ollamaUrl: settings.ollamaUrl,
			ollamaModel: settings.ollamaModel
		});
	}

	async function detect() {
		persist();
		detecting = true;
		try {
			statuses = await detectProviders(getLLMSettings());
			detected = true;
			const ollama = statuses.find((s) => s.id === 'ollama');
			ollamaModels = ollama?.models ?? [];
			// Seleziona di default il modello locale "migliore" per l'app se l'utente
			// non ne ha gia' scelto uno valido tra quelli installati.
			if (
				ollamaModels.length > 0 &&
				(!settings.ollamaModel || !ollamaModels.includes(settings.ollamaModel))
			) {
				settings.ollamaModel = pickBestOllamaModel(ollamaModels);
				persist();
			}
		} finally {
			detecting = false;
		}
	}
</script>

<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-2">
		Assistente AI <Badge color="purple" class="ml-2 align-middle">opzionale</Badge>
	</Heading>
	<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
		Spiega i tuoi numeri (FIRE number, Monte Carlo, fisco) usando un'AI che gira sul tuo
		dispositivo. <strong>Gratis</strong> e <strong>privato</strong>: nessun dato viene inviato a
		server esterni, nessun modello viene scaricato dall'app. Disattivato di default.
	</p>

	<Toggle bind:checked={settings.enabled} onchange={persist}>Attiva l'assistente AI</Toggle>

	{#if settings.enabled}
		<div class="mt-4 space-y-4">
			<div>
				<Label class="mb-1">Provider preferito</Label>
				<Select items={providerItems} bind:value={prefStr} onchange={persist} />
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<Label class="mb-1">URL Ollama (locale)</Label>
					<Input bind:value={settings.ollamaUrl} onchange={persist} placeholder="http://localhost:11434" />
				</div>
				<div>
					<Label class="mb-1">Modello Ollama</Label>
					{#if ollamaModels.length > 0}
						<Select
							items={ollamaModels.map((m) => ({ value: m, name: m }))}
							bind:value={settings.ollamaModel}
							onchange={persist}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Consigliato per l'app: <strong>{pickBestOllamaModel(ollamaModels)}</strong> (selezionato
							di default). Premi «Rileva provider» per aggiornare la lista.
						</p>
					{:else}
						<Input bind:value={settings.ollamaModel} onchange={persist} placeholder="es. llama3.2" />
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Premi «Rileva provider» per elencare i modelli installati e scegliere dal menu.
						</p>
					{/if}
				</div>
			</div>

			<Button color="light" onclick={detect} disabled={detecting}>
				{detecting ? 'Rilevamento…' : 'Rileva provider'}
			</Button>

			{#if detected}
				<ul class="space-y-2">
					{#each statuses as s (s.id)}
						<li class="flex items-center gap-2 text-sm flex-wrap">
							<Badge color={s.available ? 'green' : 'gray'}>
								{s.available ? 'disponibile' : 'non disponibile'}
							</Badge>
							<span class="font-medium">{s.label}</span>
							<span class="text-gray-500 dark:text-gray-400">— {s.detail}</span>
						</li>
					{/each}
				</ul>
			{/if}

			<Alert color="blue" class="text-sm">
				<strong>Privacy & costi:</strong> l'assistente usa solo l'AI gia' presente sul tuo
				dispositivo (browser o Ollama locale). Nessun modello viene scaricato dall'app, nessun
				costo, nessun dato inviato. Sul sito pubblico funziona solo se il browser ha l'AI
				integrata; per usare Ollama esegui l'app in locale. <strong>Non e' consulenza
				finanziaria</strong>: l'AI spiega i numeri, non li calcola.
			</Alert>
		</div>
	{/if}
</Card>
