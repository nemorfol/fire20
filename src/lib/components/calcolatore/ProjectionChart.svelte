<script lang="ts">
	import EChart from '$lib/components/shared/EChart.svelte';
	import { formatCompact, formatCurrency } from '$lib/utils/format';
	import type { YearlyProjection } from '$lib/engine/fire-calculator';
	import type { EChartsOption } from 'echarts';

	let {
		projections = [] as YearlyProjection[],
		fireNumber = 0,
		retirementAge = 0,
		currentAge = 0,
		inflationRate = 0
	}: {
		projections?: YearlyProjection[];
		fireNumber?: number;
		retirementAge?: number;
		currentAge?: number;
		inflationRate?: number;
	} = $props();

	let chartOptions = $derived<EChartsOption>(buildChartOptions(projections, fireNumber, retirementAge, currentAge, inflationRate));

	function buildChartOptions(
		data: YearlyProjection[],
		fireNum: number,
		retAge: number,
		curAge: number,
		inflRate: number
	): EChartsOption {
		if (!data.length) return {};

		const years = data.map((d) => d.year);
		const portfolioValues = data.map((d) => d.portfolio);

		// Split into accumulation and decumulation phases
		const fireIndex = data.findIndex((d) => d.age > retAge);
		const accumulationData = data.map((d, i) => (d.age <= retAge ? d.portfolio : null));
		const decumulationData = data.map((d, i) => (d.age > retAge ? d.portfolio : null));
		// Bridge point: include last accumulation point in decumulation
		if (fireIndex > 0) {
			decumulationData[fireIndex - 1] = data[fireIndex - 1].portfolio;
		}

		// Target FIRE inflazionato anno per anno: in euro di oggi è costante,
		// ma in moneta corrente cresce col tasso di inflazione. Se inflRate = 0
		// la linea è orizzontale e coincide con il comportamento precedente.
		const fireTargetData = data.map((_, i) => fireNum * Math.pow(1 + inflRate, i + 1));
		const fireTargetFinal = fireTargetData[fireTargetData.length - 1] ?? fireNum;

		return {
			tooltip: {
				trigger: 'axis',
				formatter: (params: any) => {
					const p = Array.isArray(params) ? params : [params];
					const dataIndex = p[0]?.dataIndex ?? 0;
					const d = data[dataIndex];
					if (!d) return '';
					const target = fireTargetData[dataIndex] ?? fireNum;
					const deflator = Math.pow(1 + inflRate, dataIndex + 1);
					const realPortfolio = deflator > 0 ? d.portfolio / deflator : d.portfolio;
					let html = `<div class="font-semibold">${d.year} (${d.age} anni)</div>`;
					html += `<div>Portafoglio: <strong>${formatCurrency(d.portfolio)}</strong></div>`;
					if (inflRate > 0) {
						html += `<div class="text-xs opacity-75">(${formatCurrency(realPortfolio)} in euro di oggi)</div>`;
					}
					html += `<div>Target FIRE: ${formatCurrency(target)}</div>`;
					if (d.contributions > 0) html += `<div>Contributi: +${formatCurrency(d.contributions)}</div>`;
					if (d.withdrawals > 0) html += `<div>Prelievi: -${formatCurrency(d.withdrawals)}</div>`;
					html += `<div>Rendimenti: ${formatCurrency(d.returns)}</div>`;
					if (d.taxes > 0) html += `<div>Tasse: -${formatCurrency(d.taxes)}</div>`;
					return html;
				}
			},
			legend: {
				data: ['Accumulazione', 'Decumulo', 'Target FIRE'],
				bottom: 0
			},
			grid: {
				left: 80,
				right: 40,
				top: 40,
				bottom: 50
			},
			xAxis: {
				type: 'category',
				data: years,
				axisLabel: {
					interval: Math.max(Math.floor(years.length / 10) - 1, 0)
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
				}
			],
			series: [
				{
					name: 'Accumulazione',
					type: 'line',
					data: accumulationData,
					smooth: true,
					symbol: 'none',
					lineStyle: { width: 3, color: '#10b981' },
					areaStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(16,185,129,0.35)' },
								{ offset: 1, color: 'rgba(16,185,129,0.05)' }
							]
						}
					},
				},
				{
					name: 'Decumulo',
					type: 'line',
					data: decumulationData,
					smooth: true,
					symbol: 'none',
					lineStyle: { width: 3, color: '#f59e0b' },
					areaStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(245,158,11,0.35)' },
								{ offset: 1, color: 'rgba(245,158,11,0.05)' }
							]
						}
					}
				},
				{
					name: 'Target FIRE',
					type: 'line',
					data: fireTargetData,
					symbol: 'none',
					smooth: false,
					lineStyle: {
						width: 2,
						color: '#ef4444',
						type: 'dashed'
					},
					endLabel: {
						show: true,
						formatter: () => `FIRE: ${formatCompact(fireTargetFinal)}`,
						color: '#ef4444',
						fontWeight: 'bold',
						fontSize: 12
					}
				}
			]
		};
	}
</script>

<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Proiezione del Portafoglio
	</h3>
	{#if projections.length > 0}
		<EChart options={chartOptions} height="420px" />
	{:else}
		<div class="flex items-center justify-center h-64 text-gray-400">
			Nessun dato da visualizzare
		</div>
	{/if}
</div>
