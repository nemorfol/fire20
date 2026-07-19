<script lang="ts">
	import { Card, Label, Range, Toggle } from 'flowbite-svelte';

	let {
		swr = $bindable(4),
		expectedReturn = $bindable(7),
		inflationRate = $bindable(2),
		taxMode = $bindable('blended' as 'stocks' | 'btp' | 'blended'),
		returnOverridden = false
	}: {
		swr?: number;
		expectedReturn?: number;
		inflationRate?: number;
		taxMode?: 'stocks' | 'btp' | 'blended';
		/** Se true, il rendimento atteso e' calcolato altrove (es. dall'allocazione):
		 *  lo slider viene disabilitato e attenuato per evitare un controllo "morto". */
		returnOverridden?: boolean;
	} = $props();

	let effectiveTaxRate = $derived(taxMode === 'stocks' ? 26 : taxMode === 'btp' ? 12.5 : 20);
</script>

<Card class="max-w-none">
	<h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Parametri Regolabili</h3>

	<div class="space-y-6">
		<!-- SWR -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<Label>Tasso di Prelievo Sicuro (SWR)</Label>
				<span class="text-primary-600 dark:text-primary-400 text-lg font-bold tabular-nums">
					{swr.toFixed(1)}%
				</span>
			</div>
			<Range min={1} max={8} step={0.1} bind:value={swr} />
			<div class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>1%</span>
				<span>4% (classico)</span>
				<span>8%</span>
			</div>
		</div>

		<!-- Expected Return -->
		<div class:opacity-50={returnOverridden}>
			<div class="mb-2 flex items-center justify-between">
				<Label>Rendimento Annuo Atteso</Label>
				<span class="text-lg font-bold text-green-600 tabular-nums dark:text-green-400">
					{expectedReturn.toFixed(1)}%
				</span>
			</div>
			<Range min={1} max={15} step={0.1} bind:value={expectedReturn} disabled={returnOverridden} />
			<div class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>1%</span>
				<span>7% (media storica)</span>
				<span>15%</span>
			</div>
			{#if returnOverridden}
				<p class="mt-2 text-xs text-blue-600 dark:text-blue-400">
					Sovrascritto da &laquo;Stima il rendimento dall'allocazione&raquo; (attivo nel pannello
					sotto).
				</p>
			{/if}
		</div>

		<!-- Inflation -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<Label>Tasso di Inflazione</Label>
				<span class="text-lg font-bold text-orange-600 tabular-nums dark:text-orange-400">
					{inflationRate.toFixed(1)}%
				</span>
			</div>
			<Range min={0} max={10} step={0.1} bind:value={inflationRate} />
			<div class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>0%</span>
				<span>2% (target BCE)</span>
				<span>10%</span>
			</div>
		</div>

		<!-- Tax Rate -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<Label>Regime Fiscale Italiano</Label>
				<span class="text-lg font-bold text-red-600 tabular-nums dark:text-red-400">
					{effectiveTaxRate}%
				</span>
			</div>
			<div class="mt-2 flex flex-wrap gap-2">
				<button
					type="button"
					class="rounded-lg px-4 py-2 text-sm font-medium transition-all {taxMode === 'stocks'
						? 'bg-red-100 text-red-800 ring-2 ring-red-500 dark:bg-red-900/40 dark:text-red-300'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
					onclick={() => (taxMode = 'stocks')}
				>
					Azioni/ETF (26%)
				</button>
				<button
					type="button"
					class="rounded-lg px-4 py-2 text-sm font-medium transition-all {taxMode === 'btp'
						? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500 dark:bg-blue-900/40 dark:text-blue-300'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
					onclick={() => (taxMode = 'btp')}
				>
					BTP/Gov (12,5%)
				</button>
				<button
					type="button"
					class="rounded-lg px-4 py-2 text-sm font-medium transition-all {taxMode === 'blended'
						? 'bg-purple-100 text-purple-800 ring-2 ring-purple-500 dark:bg-purple-900/40 dark:text-purple-300'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
					onclick={() => (taxMode = 'blended')}
				>
					Misto (~20%)
				</button>
			</div>
			<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
				Aliquota applicata sui rendimenti del portafoglio
			</p>
		</div>
	</div>
</Card>
