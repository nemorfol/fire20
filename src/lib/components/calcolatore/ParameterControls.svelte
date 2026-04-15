<script lang="ts">
	import { Card, Label, Range, Toggle } from 'flowbite-svelte';

	let {
		swr = $bindable(4),
		expectedReturn = $bindable(7),
		inflationRate = $bindable(2),
		taxMode = $bindable('blended' as 'stocks' | 'btp' | 'blended')
	}: {
		swr?: number;
		expectedReturn?: number;
		inflationRate?: number;
		taxMode?: 'stocks' | 'btp' | 'blended';
	} = $props();

	let effectiveTaxRate = $derived(
		taxMode === 'stocks' ? 26 : taxMode === 'btp' ? 12.5 : 20
	);
</script>

<Card class="max-w-none">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">
		Parametri Regolabili
	</h3>

	<div class="space-y-6">
		<!-- SWR -->
		<div>
			<div class="flex justify-between items-center mb-2">
				<Label>Tasso di Prelievo Sicuro (SWR)</Label>
				<span class="text-lg font-bold text-primary-600 dark:text-primary-400 tabular-nums">
					{swr.toFixed(1)}%
				</span>
			</div>
			<Range min={1} max={8} step={0.1} bind:value={swr} />
			<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
				<span>1%</span>
				<span>4% (classico)</span>
				<span>8%</span>
			</div>
		</div>

		<!-- Expected Return -->
		<div>
			<div class="flex justify-between items-center mb-2">
				<Label>Rendimento Annuo Atteso</Label>
				<span class="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
					{expectedReturn.toFixed(1)}%
				</span>
			</div>
			<Range min={1} max={15} step={0.1} bind:value={expectedReturn} />
			<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
				<span>1%</span>
				<span>7% (media storica)</span>
				<span>15%</span>
			</div>
		</div>

		<!-- Inflation -->
		<div>
			<div class="flex justify-between items-center mb-2">
				<Label>Tasso di Inflazione</Label>
				<span class="text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">
					{inflationRate.toFixed(1)}%
				</span>
			</div>
			<Range min={0} max={10} step={0.1} bind:value={inflationRate} />
			<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
				<span>0%</span>
				<span>2% (target BCE)</span>
				<span>10%</span>
			</div>
		</div>

		<!-- Tax Rate -->
		<div>
			<div class="flex justify-between items-center mb-2">
				<Label>Regime Fiscale Italiano</Label>
				<span class="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">
					{effectiveTaxRate}%
				</span>
			</div>
			<div class="flex flex-wrap gap-2 mt-2">
				<button
					type="button"
					class="px-4 py-2 rounded-lg text-sm font-medium transition-all {taxMode === 'stocks'
						? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500'
						: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
					onclick={() => (taxMode = 'stocks')}
				>
					Azioni/ETF (26%)
				</button>
				<button
					type="button"
					class="px-4 py-2 rounded-lg text-sm font-medium transition-all {taxMode === 'btp'
						? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500'
						: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
					onclick={() => (taxMode = 'btp')}
				>
					BTP/Gov (12,5%)
				</button>
				<button
					type="button"
					class="px-4 py-2 rounded-lg text-sm font-medium transition-all {taxMode === 'blended'
						? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-500'
						: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
					onclick={() => (taxMode = 'blended')}
				>
					Misto (~20%)
				</button>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
				Aliquota applicata sui rendimenti del portafoglio
			</p>
		</div>
	</div>
</Card>
