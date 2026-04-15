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
		const years = result.yearlyStats.map((s) => `Anno ${s.year}`);
		const p5 = result.percentiles.p5 ?? [];
		const p10 = result.percentiles.p10 ?? [];
		const p25 = result.percentiles.p25 ?? [];
		const p50 = result.percentiles.p50 ?? [];
		const p75 = result.percentiles.p75 ?? [];
		const p90 = result.percentiles.p90 ?? [];
		const p95 = result.percentiles.p95 ?? [];

		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'cross' },
				formatter: (params: any) => {
					if (!Array.isArray(params) || params.length === 0) return '';
					const yearLabel = params[0].axisValue;
					let html = `<strong>${yearLabel}</strong><br/>`;
					for (const p of params) {
						if (p.seriesName && p.value != null) {
							const val = typeof p.value === 'number' ? p.value : p.value[1];
							html += `${p.marker} ${p.seriesName}: ${formatCurrency(val)}<br/>`;
						}
					}
					return html;
				}
			},
			legend: {
				data: ['P5-P95', 'P10-P90', 'P25-P75', 'Mediana (P50)'],
				bottom: 35,
				textStyle: { fontSize: 11 }
			},
			grid: {
				left: 80,
				right: 30,
				top: 20,
				bottom: 100
			},
			xAxis: {
				type: 'category',
				data: years,
				axisLabel: {
					interval: Math.max(0, Math.floor(years.length / 10) - 1),
					rotate: 0,
					fontSize: 11
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: (v: number) => formatCompact(v)
				}
			},
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100
				},
				{
					type: 'slider',
					start: 0,
					end: 100,
					bottom: 5,
					height: 20
				}
			],
			series: [
				// P5 base (invisible, for stacking)
				{
					name: '_p5_base',
					type: 'line',
					data: p5,
					lineStyle: { opacity: 0 },
					areaStyle: { opacity: 0 },
					symbol: 'none',
					stack: 'band1',
					silent: true,
					tooltip: { show: false }
				},
				// P5-P95 band
				{
					name: 'P5-P95',
					type: 'line',
					data: p95.map((v, i) => v - p5[i]),
					lineStyle: { opacity: 0 },
					areaStyle: {
						color: 'rgba(59, 130, 246, 0.08)'
					},
					symbol: 'none',
					stack: 'band1',
					silent: true
				},
				// P10 base
				{
					name: '_p10_base',
					type: 'line',
					data: p10,
					lineStyle: { opacity: 0 },
					areaStyle: { opacity: 0 },
					symbol: 'none',
					stack: 'band2',
					silent: true,
					tooltip: { show: false }
				},
				// P10-P90 band
				{
					name: 'P10-P90',
					type: 'line',
					data: p90.map((v, i) => v - p10[i]),
					lineStyle: { opacity: 0 },
					areaStyle: {
						color: 'rgba(59, 130, 246, 0.15)'
					},
					symbol: 'none',
					stack: 'band2',
					silent: true
				},
				// P25 base
				{
					name: '_p25_base',
					type: 'line',
					data: p25,
					lineStyle: { opacity: 0 },
					areaStyle: { opacity: 0 },
					symbol: 'none',
					stack: 'band3',
					silent: true,
					tooltip: { show: false }
				},
				// P25-P75 band
				{
					name: 'P25-P75',
					type: 'line',
					data: p75.map((v, i) => v - p25[i]),
					lineStyle: { opacity: 0 },
					areaStyle: {
						color: 'rgba(59, 130, 246, 0.25)'
					},
					symbol: 'none',
					stack: 'band3',
					silent: true
				},
				// Median line
				{
					name: 'Mediana (P50)',
					type: 'line',
					data: p50,
					lineStyle: {
						width: 3,
						color: '#2563eb'
					},
					itemStyle: {
						color: '#2563eb'
					},
					symbol: 'none',
					smooth: false
				}
			]
		};
	});
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
	<h4 class="text-base font-semibold text-gray-900 dark:text-white mb-2">
		Proiezione del Portafoglio - Fan Chart
	</h4>
	<p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
		Bande di probabilit&agrave;: P5-P95 (chiara), P10-P90 (media), P25-P75 (scura), P50 mediana (linea)
	</p>
	<EChart {options} height="420px" />
</div>
