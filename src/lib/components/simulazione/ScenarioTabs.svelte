<script lang="ts">
	import {
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import type { MonteCarloResult } from '$lib/engine/monte-carlo';
	import { formatCurrency } from '$lib/utils/format';

	let {
		result
	}: {
		result: MonteCarloResult;
	} = $props();

	let activeTab = $state(0);

	// NB: queste sono BANDE DI PERCENTILE (sezione trasversale su tutte le
	// simulazioni, anno per anno), NON singole traiettorie di un portafoglio.
	// Il valore di un anno e quello dell'anno dopo appartengono a simulazioni
	// diverse, quindi NON mostriamo una "variazione %" anno-su-anno: non sarebbe
	// un rendimento reale e quando la banda tocca lo zero darebbe un fuorviante
	// "-100%".
	let scenarios = $derived([
		{
			label: 'Banda pessimistica (P5)',
			data: result.worstCase,
			color: 'text-red-600 dark:text-red-400',
			icon: '&#9660;'
		},
		{
			label: 'Banda mediana (P50)',
			data: result.percentiles.p50,
			color: 'text-blue-600 dark:text-blue-400',
			icon: '&#9679;'
		},
		{
			label: 'Banda ottimistica (P95)',
			data: result.bestCase,
			color: 'text-green-600 dark:text-green-400',
			icon: '&#9650;'
		}
	]);

	let activeScenario = $derived(scenarios[activeTab]);
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
	<h4 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
		Dettaglio bande di percentile
	</h4>
	<p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
		Ogni riga è il valore di quel percentile in quell'anno, calcolato su tutte le simulazioni:
		è un <strong>inviluppo statistico</strong>, non l'andamento di un singolo portafoglio. Anni
		consecutivi appartengono a simulazioni diverse, perciò la loro differenza non rappresenta un
		rendimento (per questo non mostriamo una variazione percentuale anno&#8209;su&#8209;anno).
	</p>

	<div class="flex gap-2 mb-4 flex-wrap">
		{#each scenarios as scenario, idx}
			<button
				class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === idx
					? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
					: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}"
				onclick={() => (activeTab = idx)}
			>
				<span class={scenario.color}>{@html scenario.icon}</span>
				{scenario.label}
			</button>
		{/each}
	</div>

	{#if activeScenario}
		<div class="max-h-96 overflow-y-auto">
			<Table striped hoverable>
				<TableHead class="sticky top-0">
					<TableHeadCell class="text-xs">Anno</TableHeadCell>
					<TableHeadCell class="text-xs text-right">Valore portafoglio (percentile)</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each activeScenario.data as value, idx}
						<TableBodyRow>
							<TableBodyCell class="font-medium">Anno {idx + 1}</TableBodyCell>
							<TableBodyCell class="text-right {activeScenario.color}">
								{formatCurrency(value)}
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>
