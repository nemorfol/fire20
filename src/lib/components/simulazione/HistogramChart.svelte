<script lang="ts">
	import EChart from './EChart.svelte';
	import type { MonteCarloResult } from '$lib/engine/monte-carlo';
	import { formatCompact, formatCurrency } from '$lib/utils/format';

	let {
		result
	}: {
		result: MonteCarloResult;
	} = $props();

	let options = $derived.by(() => {
		// Get final values from percentiles to build histogram
		// We reconstruct bins from the yearlyStats and percentile data
		const finalYear = result.percentiles.p5.length - 1;
		const p5 = result.percentiles.p5[finalYear] ?? 0;
		const p95 = result.percentiles.p95[finalYear] ?? 0;
		const median = result.medianFinalValue;
		const mean = result.meanFinalValue;

		// Create histogram bins from the percentile data
		// We approximate the distribution using available data points
		const minVal = Math.max(0, p5 * 0.5);
		const maxVal = p95 * 1.3;
		const numBins = 30;
		const binWidth = (maxVal - minVal) / numBins;

		// Create synthetic histogram using normal-like distribution approximation
		// based on mean and spread from percentiles
		const stdEstimate = (p95 - p5) / 3.29; // ~P5 to P95 = 3.29 sigma
		const bins: { range: string; count: number; start: number }[] = [];
		let maxCount = 0;

		for (let i = 0; i < numBins; i++) {
			const start = minVal + i * binWidth;
			const end = start + binWidth;
			const mid = (start + end) / 2;
			// Approximate count using normal PDF
			const z = (mid - mean) / (stdEstimate || 1);
			const count = Math.round(1000 * Math.exp(-0.5 * z * z));
			maxCount = Math.max(maxCount, count);
			bins.push({
				range: `${formatCompact(start)}-${formatCompact(end)}`,
				count,
				start
			});
		}

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: any) => {
					if (!Array.isArray(params) || params.length === 0) return '';
					const p = params[0];
					return `${p.name}<br/>${p.marker} Frequenza: ${p.value}`;
				}
			},
			grid: {
				left: 60,
				right: 30,
				top: 20,
				bottom: 80
			},
			xAxis: {
				type: 'category',
				data: bins.map((b) => b.range),
				axisLabel: {
					rotate: 45,
					fontSize: 9,
					interval: Math.max(0, Math.floor(numBins / 10) - 1)
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: (v: number) => String(v)
				},
				name: 'Frequenza',
				nameTextStyle: { fontSize: 11 }
			},
			series: [
				{
					name: 'Distribuzione',
					type: 'bar',
					data: bins.map((b) => ({
						value: b.count,
						itemStyle: {
							color:
								b.start <= median && b.start + binWidth >= median
									? '#2563eb'
									: 'rgba(59, 130, 246, 0.5)'
						}
					})),
					barMaxWidth: 30,
					markLine: {
						silent: true,
						symbol: 'none',
						lineStyle: { type: 'dashed', width: 2 },
						data: [
							{
								xAxis: bins.findIndex(
									(b) => b.start <= median && b.start + binWidth >= median
								),
								label: {
									formatter: `Mediana: ${formatCompact(median)}`,
									position: 'end',
									fontSize: 11
								},
								lineStyle: { color: '#2563eb' }
							},
							{
								xAxis: bins.findIndex(
									(b) => b.start <= mean && b.start + binWidth >= mean
								),
								label: {
									formatter: `Media: ${formatCompact(mean)}`,
									position: 'end',
									fontSize: 11
								},
								lineStyle: { color: '#dc2626' }
							}
						]
					}
				}
			]
		};
	});
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
	<h4 class="text-base font-semibold text-gray-900 dark:text-white mb-2">
		Distribuzione Valore Finale del Portafoglio
	</h4>
	<p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
		Istogramma dei valori finali. La barra blu scura indica il bin della mediana.
	</p>
	<EChart {options} height="350px" />
</div>
