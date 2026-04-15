<script lang="ts">
	import { formatCurrency, formatCompact } from '$lib/utils/format';
	import type { MonteCarloResult } from '$lib/engine/monte-carlo';

	let {
		result
	}: {
		result: MonteCarloResult;
	} = $props();

	let finalYear = $derived(result.percentiles.p5?.length ? result.percentiles.p5.length - 1 : 0);

	let successPercent = $derived(Math.round(result.successRate * 1000) / 10);
	let colorClass = $derived(
		successPercent >= 95
			? 'text-green-500'
			: successPercent >= 80
				? 'text-yellow-500'
				: 'text-red-500'
	);
	let bgRingClass = $derived(
		successPercent >= 95
			? 'stroke-green-500'
			: successPercent >= 80
				? 'stroke-yellow-500'
				: 'stroke-red-500'
	);
	let bgGlowClass = $derived(
		successPercent >= 95
			? 'shadow-green-500/20'
			: successPercent >= 80
				? 'shadow-yellow-500/20'
				: 'shadow-red-500/20'
	);
	let statusLabel = $derived(
		successPercent >= 95
			? 'Eccellente'
			: successPercent >= 90
				? 'Molto Buono'
				: successPercent >= 80
					? 'Buono'
					: successPercent >= 70
						? 'Sufficiente'
						: 'A Rischio'
	);

	// SVG arc calculation
	let circumference = 2 * Math.PI * 54;
	let dashOffset = $derived(circumference - (circumference * Math.min(successPercent, 100)) / 100);
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
	<!-- Success Rate Gauge -->
	<div class="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg {bgGlowClass}">
		<div class="relative w-40 h-40">
			<svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
				<!-- Background circle -->
				<circle
					cx="60" cy="60" r="54"
					fill="none"
					stroke-width="8"
					class="stroke-gray-200 dark:stroke-gray-700"
				/>
				<!-- Progress arc -->
				<circle
					cx="60" cy="60" r="54"
					fill="none"
					stroke-width="8"
					stroke-linecap="round"
					class="{bgRingClass} transition-all duration-1000 ease-out"
					stroke-dasharray="{circumference}"
					stroke-dashoffset="{dashOffset}"
				/>
			</svg>
			<div class="absolute inset-0 flex flex-col items-center justify-center">
				<span class="text-3xl font-bold {colorClass}">{successPercent}%</span>
				<span class="text-xs text-gray-500 dark:text-gray-400 mt-1">Successo</span>
			</div>
		</div>
		<p class="mt-3 text-sm font-semibold {colorClass}">{statusLabel}</p>
		<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
			Tasso di Successo della Simulazione
		</p>
	</div>

	<!-- Key Stats -->
	<div class="flex flex-col gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
		<h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
			Portafoglio Finale
		</h4>
		<div>
			<p class="text-xs text-gray-500 dark:text-gray-400">Mediana</p>
			<p class="text-2xl font-bold text-gray-900 dark:text-white">
				{formatCurrency(result.medianFinalValue)}
			</p>
		</div>
		<div>
			<p class="text-xs text-gray-500 dark:text-gray-400">Media</p>
			<p class="text-xl font-semibold text-gray-700 dark:text-gray-300">
				{formatCurrency(result.meanFinalValue)}
			</p>
		</div>
		{#if result.failureYear}
			<div class="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
				<p class="text-xs text-red-500">Anno mediano di esaurimento</p>
				<p class="text-lg font-bold text-red-600 dark:text-red-400">
					Anno {result.failureYear}
				</p>
			</div>
		{/if}
	</div>

	<!-- Percentile Summary -->
	<div class="flex flex-col gap-3 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
		<h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
			Distribuzione Valore Finale
		</h4>
		{#each [
			{ label: 'P95 (ottimista)', key: 'p95', color: 'text-green-600 dark:text-green-400' },
			{ label: 'P75', key: 'p75', color: 'text-green-500 dark:text-green-500' },
			{ label: 'P50 (mediana)', key: 'p50', color: 'text-blue-600 dark:text-blue-400' },
			{ label: 'P25', key: 'p25', color: 'text-yellow-600 dark:text-yellow-400' },
			{ label: 'P5 (pessimista)', key: 'p5', color: 'text-red-600 dark:text-red-400' }
		] as item}
			<div class="flex items-center justify-between">
				<span class="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
				<span class="text-sm font-semibold {item.color}">
					{formatCompact(result.percentiles[item.key]?.[finalYear] ?? 0)}
				</span>
			</div>
		{/each}
	</div>
</div>
