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
	import { formatCurrency, formatCompact } from '$lib/utils/format';

	let {
		result
	}: {
		result: MonteCarloResult;
	} = $props();

	// Key years to display
	let keyYears = $derived.by(() => {
		const total = result.yearlyStats.length;
		const targets = [5, 10, 15, 20, 25, 30, 35, 40];
		return targets.filter((y) => y <= total);
	});

	function getPercentileAt(key: string, year: number): number {
		const arr = result.percentiles[key];
		if (!arr || year - 1 >= arr.length) return 0;
		return arr[year - 1];
	}

	function getSuccessRateAt(year: number): number {
		const stat = result.yearlyStats[year - 1];
		return stat ? stat.successRate * 100 : 0;
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 overflow-x-auto">
	<h4 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
		Statistiche per Anno Chiave
	</h4>
	<Table striped hoverable>
		<TableHead>
			<TableHeadCell class="text-xs">Anno</TableHeadCell>
			<TableHeadCell class="text-xs text-right">P5</TableHeadCell>
			<TableHeadCell class="text-xs text-right">P10</TableHeadCell>
			<TableHeadCell class="text-xs text-right">P25</TableHeadCell>
			<TableHeadCell class="text-xs text-right font-bold">P50</TableHeadCell>
			<TableHeadCell class="text-xs text-right">P75</TableHeadCell>
			<TableHeadCell class="text-xs text-right">P90</TableHeadCell>
			<TableHeadCell class="text-xs text-right">P95</TableHeadCell>
			<TableHeadCell class="text-xs text-right">Successo</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each keyYears as year}
				{@const successRate = getSuccessRateAt(year)}
				{@const successColor =
					successRate >= 95
						? 'text-green-600 dark:text-green-400'
						: successRate >= 80
							? 'text-yellow-600 dark:text-yellow-400'
							: 'text-red-600 dark:text-red-400'}
				<TableBodyRow>
					<TableBodyCell class="font-medium">Anno {year}</TableBodyCell>
					<TableBodyCell class="text-right text-xs">
						{formatCompact(getPercentileAt('p5', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs">
						{formatCompact(getPercentileAt('p10', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs">
						{formatCompact(getPercentileAt('p25', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs font-bold">
						{formatCompact(getPercentileAt('p50', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs">
						{formatCompact(getPercentileAt('p75', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs">
						{formatCompact(getPercentileAt('p90', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs">
						{formatCompact(getPercentileAt('p95', year))}
					</TableBodyCell>
					<TableBodyCell class="text-right text-xs font-semibold {successColor}">
						{successRate.toFixed(1)}%
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</div>
