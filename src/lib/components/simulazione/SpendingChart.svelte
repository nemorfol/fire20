<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import EChart from '$lib/components/shared/EChart.svelte';
	import type { MonteCarloParams, MonteCarloResult } from '$lib/engine/monte-carlo';
	import { formatCompact, formatCurrency } from '$lib/utils/format';

	type Spending = NonNullable<MonteCarloResult['spending']>;

	let {
		spending: sp,
		strategy,
		targetExpenses,
		yearsToFire
	}: {
		spending: Spending;
		strategy: MonteCarloParams['withdrawalStrategy'];
		/** Spese annue obiettivo in pensione (euro di oggi) */
		targetExpenses: number;
		yearsToFire: number;
	} = $props();

	const isVariable = $derived(strategy !== 'fixed');

	const options = $derived.by(() => {
		const years = sp.p50.map((_, r) => `Anno ${yearsToFire + r + 1}`);
		const series: Record<string, unknown>[] = [
			{
				name: '_p10_base',
				type: 'line',
				data: sp.p10,
				lineStyle: { opacity: 0 },
				areaStyle: { opacity: 0 },
				symbol: 'none',
				stack: 'band',
				silent: true,
				tooltip: { show: false }
			},
			{
				name: 'P10-P90',
				type: 'line',
				data: sp.p90.map((v, i) => v - sp.p10[i]),
				lineStyle: { opacity: 0 },
				areaStyle: { color: 'rgba(99, 102, 241, 0.18)' },
				symbol: 'none',
				stack: 'band',
				silent: true,
				tooltip: { show: false }
			},
			{
				name: 'P10',
				type: 'line',
				data: sp.p10,
				lineStyle: { width: 1, type: 'dashed', color: '#6366f1' },
				symbol: 'none'
			},
			{
				name: 'Mediana',
				type: 'line',
				data: sp.p50,
				lineStyle: { width: 2.5, color: '#4f46e5' },
				symbol: 'none'
			},
			{
				name: 'P90',
				type: 'line',
				data: sp.p90,
				lineStyle: { width: 1, type: 'dashed', color: '#6366f1' },
				symbol: 'none'
			}
		];
		if (targetExpenses > 0) {
			series.push({
				name: 'Spese obiettivo',
				type: 'line',
				data: sp.p50.map(() => targetExpenses),
				lineStyle: { width: 1.5, color: '#f59e0b' },
				symbol: 'none'
			});
		}
		return {
			tooltip: {
				trigger: 'axis',
				valueFormatter: (v: number) => formatCurrency(v)
			},
			legend: {
				data: ['P10-P90', 'Mediana', ...(targetExpenses > 0 ? ['Spese obiettivo'] : [])],
				bottom: 0,
				textStyle: { fontSize: 11 }
			},
			grid: { left: 70, right: 20, top: 15, bottom: 50 },
			xAxis: {
				type: 'category',
				data: years,
				axisLabel: { interval: Math.max(0, Math.floor(years.length / 10) - 1), fontSize: 11 }
			},
			yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatCompact(v) } },
			series
		};
	});

	const pct = (x: number) => (x * 100).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%';
</script>

<Card class="max-w-none">
	<h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
		Spesa reale in pensione (&euro; di oggi)
	</h3>
	<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
		{#if isVariable}
			Con una strategia variabile il portafoglio raramente si azzera: il rischio vero e' che la
			<strong>spesa scenda</strong>. Qui vedi quanto potresti spendere davvero, anno per anno, nelle
			simulazioni.
		{:else}
			Con la spesa fissa la spesa reale resta pari alle spese obiettivo finche' il portafoglio
			regge; se si esaurisce, restano solo pensione e altri redditi.
		{/if}
	</p>

	<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
			<p class="text-xs text-gray-500 dark:text-gray-400">Primo anno (mediana)</p>
			<p class="text-lg font-semibold text-gray-900 dark:text-white">
				{formatCurrency(sp.p50[0] ?? 0)}
			</p>
		</div>
		<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
			<p class="text-xs text-gray-500 dark:text-gray-400">Anno peggiore (mediana)</p>
			<p class="text-lg font-semibold text-gray-900 dark:text-white">
				{formatCurrency(sp.minMedian)}
			</p>
		</div>
		<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
			<p class="text-xs text-gray-500 dark:text-gray-400">Anno peggiore (1 caso su 10)</p>
			<p class="text-lg font-semibold text-gray-900 dark:text-white">
				{formatCurrency(sp.minP10)}
			</p>
		</div>
		{#if targetExpenses > 0}
			<div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
				<p class="text-xs text-amber-700 dark:text-amber-400">
					Almeno un anno sotto le spese obiettivo
				</p>
				<p class="text-lg font-semibold text-amber-800 dark:text-amber-300">
					{pct(sp.belowTargetRate)}
				</p>
			</div>
		{/if}
		{#if isVariable && sp.floorSuccessRate !== undefined && (sp.floor ?? 0) > 0}
			<div class="col-span-2 rounded-lg bg-indigo-50 p-3 lg:col-span-4 dark:bg-indigo-900/20">
				<p class="text-xs text-indigo-700 dark:text-indigo-300">
					Successo con spesa minima: spesa reale mai sotto {formatCurrency(sp.floor ?? 0)}
				</p>
				<p class="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
					{pct(sp.floorSuccessRate)}
				</p>
				<p class="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
					E' il "tasso di successo" adatto alle strategie variabili: il portafoglio non si esaurisce
					quasi mai, ma la spesa puo' scendere.
				</p>
			</div>
		{/if}
	</div>

	<EChart {options} height="320px" />
	<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
		Spesa = prelievo deciso dalla strategia (limitato a portafoglio + redditi se il portafoglio si
		esaurisce), deflazionato con l'inflazione simulata. Pensione e altri redditi coprono parte di
		questa spesa, non si sommano. Gli eventi di rischio non sono inclusi in questo grafico.
	</p>
</Card>
