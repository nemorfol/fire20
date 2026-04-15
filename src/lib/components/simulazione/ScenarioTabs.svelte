<script lang="ts">
	import {
		Tabs,
		TabItem,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import type { MonteCarloResult } from '$lib/engine/monte-carlo';
	import { formatCurrency, formatCompact } from '$lib/utils/format';

	let {
		result
	}: {
		result: MonteCarloResult;
	} = $props();

	let activeTab = $state(0);

	let scenarios = $derived([
		{
			label: 'Scenario Peggiore (P5)',
			data: result.worstCase,
			color: 'text-red-600 dark:text-red-400',
			icon: '&#9660;'
		},
		{
			label: 'Scenario Mediano (P50)',
			data: result.percentiles.p50,
			color: 'text-blue-600 dark:text-blue-400',
			icon: '&#9679;'
		},
		{
			label: 'Scenario Migliore (P95)',
			data: result.bestCase,
			color: 'text-green-600 dark:text-green-400',
			icon: '&#9650;'
		}
	]);

	let activeScenario = $derived(scenarios[activeTab]);
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
	<h4 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
		Dettaglio Scenari
	</h4>

	<div class="flex gap-2 mb-4">
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
					<TableHeadCell class="text-xs text-right">Valore Portafoglio</TableHeadCell>
					<TableHeadCell class="text-xs text-right">Variazione</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each activeScenario.data as value, idx}
						{@const prevValue = idx > 0 ? activeScenario.data[idx - 1] : value}
						{@const change = idx > 0 ? ((value - prevValue) / (prevValue || 1)) * 100 : 0}
						{@const changeColor =
							change >= 0
								? 'text-green-600 dark:text-green-400'
								: 'text-red-600 dark:text-red-400'}
						<TableBodyRow>
							<TableBodyCell class="font-medium">Anno {idx + 1}</TableBodyCell>
							<TableBodyCell class="text-right {activeScenario.color}">
								{formatCurrency(value)}
							</TableBodyCell>
							<TableBodyCell class="text-right text-xs {changeColor}">
								{#if idx > 0}
									{change >= 0 ? '+' : ''}{change.toFixed(1)}%
								{:else}
									&mdash;
								{/if}
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>
