<script lang="ts">
	import { Card, Badge } from 'flowbite-svelte';
	import type { YearlyProjection } from '$lib/engine/fire-calculator';
	import type { RiskEvent } from '$lib/engine/risk-scenarios';
	import { formatCurrency, formatCompact } from '$lib/utils/format';
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import StatCard from '$lib/components/shared/StatCard.svelte';

	let {
		baseline,
		stressed,
		event
	}: {
		baseline: YearlyProjection[];
		stressed: YearlyProjection[];
		event: RiskEvent;
	} = $props();

	let finalBaseline = $derived(baseline.length > 0 ? baseline[baseline.length - 1].portfolio : 0);
	let finalStressed = $derived(stressed.length > 0 ? stressed[stressed.length - 1].portfolio : 0);
	let portfolioReduction = $derived(
		finalBaseline > 0 ? ((finalBaseline - finalStressed) / finalBaseline) * 100 : 0
	);

	// Calculate years of FIRE delayed: find when stressed portfolio first goes to 0
	// vs baseline
	let baselineZeroYear = $derived.by(() => {
		const idx = baseline.findIndex((p) => p.portfolio <= 0);
		return idx >= 0 ? baseline[idx].year : -1;
	});
	let stressedZeroYear = $derived.by(() => {
		const idx = stressed.findIndex((p) => p.portfolio <= 0);
		return idx >= 0 ? stressed[idx].year : -1;
	});
	let yearsDelayed = $derived.by(() => {
		if (stressedZeroYear === -1 && baselineZeroYear === -1) return 0;
		if (stressedZeroYear === -1) return 0;
		if (baselineZeroYear === -1) return stressedZeroYear - (baseline[baseline.length - 1]?.year ?? 0);
		return stressedZeroYear - baselineZeroYear;
	});

	// Baseline survives = portfolio never goes to 0
	let baselineSurvives = $derived(baseline.every((p) => p.portfolio > 0));
	let stressedSurvives = $derived(stressed.every((p) => p.portfolio > 0));

	let chartOptions = $derived.by(() => {
		if (baseline.length === 0) return {};
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
			legend: {
				data: ['Scenario Base', event.name],
				bottom: 0
			},
			grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
			xAxis: {
				type: 'category',
				data: baseline.map((p) => p.year.toString())
			},
			yAxis: {
				type: 'value',
				axisLabel: { formatter: (v: number) => formatCompact(v) }
			},
			series: [
				{
					name: 'Scenario Base',
					type: 'line',
					data: baseline.map((p) => Math.round(p.portfolio)),
					smooth: true,
					lineStyle: { width: 2.5, color: '#3b82f6' },
					itemStyle: { color: '#3b82f6' },
					areaStyle: { opacity: 0.08, color: '#3b82f6' }
				},
				{
					name: event.name,
					type: 'line',
					data: stressed.map((p) => Math.round(Math.max(0, p.portfolio))),
					smooth: true,
					lineStyle: { width: 2.5, color: '#ef4444' },
					itemStyle: { color: '#ef4444' },
					areaStyle: { opacity: 0.08, color: '#ef4444' }
				}
			]
		};
	});
</script>

<Card class="max-w-none">
	<div class="flex items-center justify-between mb-4">
		<h5 class="text-lg font-semibold text-gray-900 dark:text-white">
			Risultato Stress Test: {event.name}
		</h5>
		<Badge color={stressedSurvives ? 'green' : 'red'}>
			{stressedSurvives ? 'Piano Sopravvive' : 'Piano Fallisce'}
		</Badge>
	</div>

	<!-- Impact Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
		<StatCard
			title="Portafoglio Finale"
			value={formatCurrency(finalStressed)}
			subtitle="Base: {formatCurrency(finalBaseline)}"
			color={finalStressed >= finalBaseline * 0.8 ? 'green' : 'red'}
			trend={finalStressed >= finalBaseline ? 'up' : 'down'}
		/>
		<StatCard
			title="Riduzione Portafoglio"
			value="{portfolioReduction.toFixed(1)}%"
			subtitle="Rispetto allo scenario base"
			color={portfolioReduction < 20 ? 'yellow' : 'red'}
			trend="down"
		/>
		<StatCard
			title="Sostenibilita'"
			value={stressedSurvives ? 'OK' : `Esaurito nel ${stressedZeroYear}`}
			subtitle={baselineSurvives && !stressedSurvives ? 'Fallimento causato dallo stress' : baselineSurvives ? 'Piano resiliente' : 'Piano gia\' a rischio'}
			color={stressedSurvives ? 'green' : 'red'}
		/>
	</div>

	<!-- Before vs After Chart -->
	<EChart options={chartOptions} height="400px" />
</Card>
