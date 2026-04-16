<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import type { PortfolioSnapshot, CashFlow } from '$lib/engine/twr-calculator';
	import { calculateTWR, calculateBenchmarkReturn, calculateAlpha, calculateMaxDrawdown } from '$lib/engine/twr-calculator';
	import { sp500Returns } from '$lib/data/sp500';

	let {
		snapshots = [] as PortfolioSnapshot[],
		cashFlows = [] as CashFlow[]
	}: {
		snapshots?: PortfolioSnapshot[];
		cashFlows?: CashFlow[];
	} = $props();

	const metrics = $derived.by(() => {
		if (snapshots.length < 2) {
			return null;
		}

		const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
		const startDate = sorted[0].date;
		const endDate = sorted[sorted.length - 1].date;

		const twrResult = calculateTWR(snapshots, cashFlows);
		const benchmarkReturn = calculateBenchmarkReturn(startDate, endDate, sp500Returns);
		const alpha = calculateAlpha(twrResult.annualizedReturn, benchmarkReturn);
		const maxDrawdown = calculateMaxDrawdown(snapshots);

		// Annualizzare il benchmark per confronto
		const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
		const benchmarkAnnualized = totalDays > 0 ? Math.pow(1 + benchmarkReturn, 365 / totalDays) - 1 : 0;

		return {
			totalReturn: twrResult.totalReturn,
			annualizedReturn: twrResult.annualizedReturn,
			benchmarkReturn,
			benchmarkAnnualized,
			alpha,
			maxDrawdown
		};
	});

	function fmtPct(v: number): string {
		return (v * 100).toFixed(2) + '%';
	}

	function trendColor(v: number): string {
		if (v > 0) return 'text-green-600 dark:text-green-400';
		if (v < 0) return 'text-red-600 dark:text-red-400';
		return 'text-gray-600 dark:text-gray-400';
	}
</script>

{#if metrics}
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
		<Card class="max-w-none text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">TWR Totale</p>
			<p class="text-xl font-bold {trendColor(metrics.totalReturn)}">{fmtPct(metrics.totalReturn)}</p>
		</Card>
		<Card class="max-w-none text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">TWR Annualizzato</p>
			<p class="text-xl font-bold {trendColor(metrics.annualizedReturn)}">{fmtPct(metrics.annualizedReturn)}</p>
		</Card>
		<Card class="max-w-none text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">S&P 500 (totale)</p>
			<p class="text-xl font-bold {trendColor(metrics.benchmarkReturn)}">{fmtPct(metrics.benchmarkReturn)}</p>
		</Card>
		<Card class="max-w-none text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">S&P 500 (annuale)</p>
			<p class="text-xl font-bold {trendColor(metrics.benchmarkAnnualized)}">{fmtPct(metrics.benchmarkAnnualized)}</p>
		</Card>
		<Card class="max-w-none text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Alpha</p>
			<p class="text-xl font-bold {trendColor(metrics.alpha)}">{fmtPct(metrics.alpha)}</p>
		</Card>
		<Card class="max-w-none text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Max Drawdown</p>
			<p class="text-xl font-bold text-red-600 dark:text-red-400">-{fmtPct(metrics.maxDrawdown)}</p>
		</Card>
	</div>
{:else}
	<p class="text-sm text-gray-500 dark:text-gray-400">
		Inserisci almeno 2 snapshot per calcolare le metriche di performance.
	</p>
{/if}
