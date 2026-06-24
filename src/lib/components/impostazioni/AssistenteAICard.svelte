<script lang="ts">
	import { Card, Heading, Toggle, Select, Input, Label, Button, Badge, Alert } from 'flowbite-svelte';
	import { getLLMSettings, updateLLMSettings, type LLMSettings } from '$lib/llm/store.svelte';
	import { detectProviders } from '$lib/llm';
	import type { LLMProviderStatus } from '$lib/llm/types';

	// Copia locale reattiva (stesso pattern delle altre impostazioni).
	let settings = $state<LLMSettings>({ ...getLLMSettings() });
	// Intermediario string per il Select (evita problemi di tipizzazione del bind).
	let pref = $state<string>(settings.preferredProvider);
	let statuses = $state<LLMProviderStatus[]>([]);
	let detecting = $state(false);
	let detected = $state(false);

	const providerItems = [
		{ value: 'auto', name: 'Automatico (migliore disponibile)' },
		{ value: 'ollama', name: 'Ollama (locale)' },
		{ value: 'chrome-builtin', name: 'Chrome AI integrata' }
	];

	// Sincronizza la preferenza (string -> union) e persiste a ogni modifica.
	$effect(() => {
		settings.preferredProvider =
			pref === 'ollama' || pref === 'chrome-builtin' ? pref : 'auto';
	});
	$effect(() => {
		updateLLMSettings({
			enabled: settings.enabled,
			preferredProvider: settings.preferredProvider,
			ollamaUrl: settings.ollamaUrl,
			ollamaModel: settings.ollamaModel
		});
	});

	async function detect() {
		detecting = true;
		try {
			statuses = await detectProviders(getLLMSettings());
			detected = true;
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

	<Toggle bind:checked={settings.enabled}>Attiva l'assistente AI</Toggle>

	{#if settings.enabled}
		<div class="mt-4 space-y-4">
			<div>
				<Label class="mb-1">Provider preferito</Label>
				<Select items={providerItems} bind:value={pref} />
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<Label class="mb-1">URL Ollama (locale)</Label>
					<Input bind:value={settings.ollamaUrl} placeholder="http://localhost:11434" />
				</div>
				<div>
					<Label class="mb-1">Modello Ollama</Label>
					<Input bind:value={settings.ollamaModel} placeholder="es. llama3.2" />
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
