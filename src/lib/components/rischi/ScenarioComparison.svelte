<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import type { YearlyProjection } from '$lib/engine/fire-calculator';
	import type { RiskEvent } from '$lib/engine/risk-scenarios';
	import { formatCurrency, formatCompact } from '$lib/utils/format';
	import EChart from '$lib/components/simulazione/EChart.svelte';

	let {
		baseline,
		scenarios
	}: {
		baseline: YearlyProjection[];
		scenarios: { event: RiskEvent; data: YearlyProjection[] }[];
	} = $props();

	const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

	let chartOptions = $derived.by(() => {
		if (baseline.length === 0 || scenarios.length === 0) return {};

		const legendData = ['Scenario Base', ...scenarios.map((s) => s.event.name)];

		const series = [
			{
				name: 'Scenario Base',
				type: 'line',
				data: baseline.map((p) => Math.round(p.portfolio)),
				smooth: true,
				lineStyle: { width: 2.5, color: colors[0] },
				itemStyle: { color: colors[0] }
			},
			...scenarios.map((s, i) => ({
				name: s.event.name,
				type: 'line',
				data: s.data.map((p: YearlyProjection) => Math.round(Math.max(0, p.portfolio))),
				smooth: true,
				lineStyle: { width: 2, color: colors[(i + 1) % colors.length], type: i > 2 ? 'dashed' as const : 'solid' as const },
				itemStyle: { color: colors[(i + 1) % colors.length] }
			}))
		];

		return {
			tooltip: {
				trigger: 'axis',
				formatter: (params: any) => {
					let html = `<strong>${params[0].name}</strong><br/>`;
					for (const p of params) {
						html += `${p.marker} ${p.seriesName}: ${formatCurrency(Math.max(0, p.value))}<br/>`;
					}
					return html;
				}
			},
			legend: { data: legendData, bottom: 0 },
			grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
			xAxis: {
				type: 'category',
				data: baseline.map((p) => p.year.toString())
			},
			yAxis: {
				type: 'value',
				axisLabel: { formatter: (v: number) => formatCompact(v) }
			},
			series
		};
	});
</script>

<Card class="max-w-none">
	<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Confronto Scenari ({scenarios.length} selezionati)
	</h5>
	<EChart options={chartOptions} height="450px" />
</Card>
