<script lang="ts">
	import { calculateFireVariants } from '$lib/engine/fire-calculator';
	import { formatCurrency } from '$lib/utils/format';
	import { Badge } from 'flowbite-svelte';

	let {
		annualExpenses = 0,
		withdrawalRate = 0.04,
		liquidNetWorth = 0
	}: {
		annualExpenses?: number;
		withdrawalRate?: number;
		liquidNetWorth?: number;
	} = $props();

	let variants = $derived(calculateFireVariants({ annualExpenses, withdrawalRate }));
</script>

<div class="mt-6">
	<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-white">Varianti FIRE</h3>
	<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
		Quanto capitale serve per i diversi "livelli" di FIRE, sui tuoi numeri (SWR {(
			withdrawalRate * 100
		).toFixed(1)}%). Le soglie sono ipotesi indicative, non regole fisse.
	</p>
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each variants as v (v.key)}
			<div
				class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
				class:ring-2={v.key === 'standard'}
				class:ring-primary-500={v.key === 'standard'}
			>
				<div class="mb-1 flex items-center justify-between gap-1">
					<span class="text-sm font-semibold text-gray-900 dark:text-white">{v.label}</span>
					{#if v.fireNumber > 0 && liquidNetWorth >= v.fireNumber}
						<Badge color="green">raggiunto</Badge>
					{/if}
				</div>
				<div class="text-lg font-bold text-gray-900 dark:text-white">
					{formatCurrency(v.fireNumber)}
				</div>
				<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Spesa: {formatCurrency(v.annualExpenses)}/anno
				</div>
				<div class="mt-1 text-xs leading-snug text-gray-400 dark:text-gray-500">{v.description}</div>
			</div>
		{/each}
	</div>
</div>
