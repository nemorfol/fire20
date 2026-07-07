<script lang="ts">
	import { Button, Badge, Textarea, Alert, Radio } from 'flowbite-svelte';
	import { parseGestptfExport, type GestptfImportResult } from '$lib/utils/gestptf-import';
	import type { PortfolioAllocation } from '$lib/db/index';
	import { formatCurrency } from '$lib/utils/format';

	let {
		onApply
	}: {
		onApply?: (
			assets: Record<keyof PortfolioAllocation, number>,
			mode: 'replace' | 'add'
		) => void;
	} = $props();

	let jsonText = $state('');
	let parseResult = $state<GestptfImportResult | null>(null);
	let errorMessage = $state('');
	let successMessage = $state('');
	let mode = $state<'replace' | 'add'>('replace');

	const labels: Record<keyof PortfolioAllocation, string> = {
		stocks: 'Azioni / ETF',
		bonds: 'Obbligazioni / BTP',
		bfp: 'Buoni Postali (BFP)',
		cd: 'Conti deposito',
		cash: 'Liquidita',
		realEstate: 'Immobili',
		gold: 'Oro',
		crypto: 'Cripto',
		pensionFund: 'Fondo pensione',
		tfr: 'TFR',
		other: 'Altro'
	};
	const orderedKeys = Object.keys(labels) as (keyof PortfolioAllocation)[];

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			jsonText = (e.target?.result as string) || '';
			doParse();
		};
		reader.readAsText(file);
		input.value = '';
	}

	function doParse() {
		errorMessage = '';
		successMessage = '';
		parseResult = null;
		if (!jsonText.trim()) {
			errorMessage = 'Carica o incolla il file JSON esportato da GestPTF.';
			return;
		}
		try {
			parseResult = parseGestptfExport(jsonText);
			if (parseResult.totalAssets === 0) {
				errorMessage = 'Il file e\' valido ma non contiene asset con valore positivo.';
				parseResult = null;
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
		}
	}

	function handleApply() {
		if (!parseResult) return;
		onApply?.(parseResult.assets, mode);
		successMessage =
			mode === 'replace'
				? 'Patrimonio sostituito con lo snapshot importato.'
				: 'Snapshot importato sommato al patrimonio esistente.';
		parseResult = null;
		jsonText = '';
	}
</script>

<div class="space-y-4">
	<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Importa da GestPTF</h4>
	<p class="text-sm text-gray-500 dark:text-gray-400">
		Carica il file JSON esportato da GestPTF (<em>Import/Export → Esporta per FIRE Planner</em>):
		il patrimonio per categoria viene riportato qui. Tutto in locale, nessun dato lascia il
		dispositivo.
	</p>

	{#if errorMessage}
		<Alert color="red" dismissable>{errorMessage}</Alert>
	{/if}
	{#if successMessage}
		<Alert color="green" dismissable>{successMessage}</Alert>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label
				for="gestptf-file"
				class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Carica file (JSON)
			</label>
			<input
				type="file"
				id="gestptf-file"
				accept=".json,application/json"
				onchange={handleFileUpload}
				class="block w-full text-sm text-gray-500 dark:text-gray-400
					file:mr-4 file:py-2 file:px-4
					file:rounded-lg file:border-0
					file:text-sm file:font-semibold
					file:bg-primary-50 file:text-primary-700
					dark:file:bg-primary-900/30 dark:file:text-primary-400
					hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50
					cursor-pointer"
			/>
		</div>
		<div>
			<label
				for="gestptf-paste"
				class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Oppure incolla il JSON
			</label>
			<Textarea
				id="gestptf-paste"
				bind:value={jsonText}
				rows={4}
				placeholder={'{ "format": "patrimonio-italiano", "version": 1, ... }'}
			/>
		</div>
	</div>

	<Button size="sm" onclick={doParse}>Analizza file</Button>

	{#if parseResult}
		<div class="space-y-4">
			{#if parseResult.asOf}
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Snapshot al <strong>{parseResult.asOf}</strong>{parseResult.app
						? ` · sorgente: ${parseResult.app}`
						: ''}
				</p>
			{/if}

			<div class="flex flex-wrap gap-3">
				{#each orderedKeys as key}
					{#if parseResult.assets[key] > 0}
						<Badge color="primary" large>{labels[key]}: {formatCurrency(parseResult.assets[key])}</Badge>
					{/if}
				{/each}
				<Badge color="green" large>Totale: {formatCurrency(parseResult.totalAssets)}</Badge>
			</div>

			{#each parseResult.warnings as w}
				<Alert color="yellow">{w}</Alert>
			{/each}

			<fieldset class="space-y-2">
				<legend class="text-sm font-medium text-gray-700 dark:text-gray-300">
					Come applicare l'import
				</legend>
				<Radio name="gestptf-mode" bind:group={mode} value="replace">
					<span><strong>Sostituisci</strong> — rimpiazza i valori del patrimonio con lo snapshot
						(consigliato: lo snapshot e' completo)</span>
				</Radio>
				<Radio name="gestptf-mode" bind:group={mode} value="add">
					<span><strong>Somma</strong> — aggiunge gli importi a quelli gia' presenti</span>
				</Radio>
			</fieldset>

			<Button color="green" onclick={handleApply}>Applica al Patrimonio</Button>
		</div>
	{/if}
</div>
