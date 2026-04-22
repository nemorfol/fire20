<script lang="ts">
	import { Card, Badge } from 'flowbite-svelte';
	import { ExclamationCircleSolid } from 'flowbite-svelte-icons';
	import type { YearlyProjection } from '$lib/engine/fire-calculator';
	import type { RiskEvent } from '$lib/engine/risk-scenarios';
	import { formatCurrency, formatCompact } from '$lib/utils/format';
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import StatCard from '$lib/components/shared/StatCard.svelte';

	let {
		baseline,
		combined,
		events
	}: {
		baseline: YearlyProjection[];
		combined: YearlyProjection[];
		events: RiskEvent[];
	} = $props();

	let finalBaseline = $derived(baseline.length > 0 ? baseline[baseline.length - 1].portfolio : 0);
	let finalCombined = $derived(combined.length > 0 ? combined[combined.length - 1].portfolio : 0);
	let portfolioReduction = $derived(
		finalBaseline > 0 ? ((finalBaseline - finalCombined) / finalBaseline) * 100 : 0
	);

	let baselineZeroYear = $derived.by(() => {
		const idx = baseline.findIndex((p) => p.portfolio <= 0);
		return idx >= 0 ? baseline[idx].year : -1;
	});
	let combinedZeroYear = $derived.by(() => {
		const idx = combined.findIndex((p) => p.portfolio <= 0);
		return idx >= 0 ? combined[idx].year : -1;
	});

	let baselineSurvives = $derived(baseline.every((p) => p.portfolio > 0));
	let combinedSurvives = $derived(combined.every((p) => p.portfolio > 0));

	let chartOptions = $derived.by(() => {
		if (baseline.length === 0) return {};
		return {
			tooltip: {
				trigger: 'axis',
				formatter: (params: unknown[]) => {
					const arr = params as { name: string; marker: string; seriesName: string; value: number }[];
					let html = `<strong>${arr[0].name}</strong><br/>`;
					for (const p of arr) {
						html += `${p.marker} ${p.seriesName}: ${formatCurrency(Math.max(0, p.value))}<br/>`;
					}
					return html;
				}
			},
			legend: {
				data: ['Scenario Base', 'Scenario Combinato'],
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
					name: 'Scenario Combinato',
					type: 'line',
					data: combined.map((p) => Math.round(Math.max(0, p.portfolio))),
					smooth: true,
					lineStyle: { width: 3, color: '#dc2626' },
					itemStyle: { color: '#dc2626' },
					areaStyle: { opacity: 0.12, color: '#dc2626' }
				}
			]
		};
	});
</script>

<Card class="max-w-none">
	<div class="flex items-start justify-between mb-4 gap-4">
		<div class="flex-1">
			<div class="flex items-center gap-2 mb-2">
				<ExclamationCircleSolid class="w-5 h-5 text-red-600 dark:text-red-400" />
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white">
					Scenario Combinato
				</h5>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
				Applicazione simultanea di {events.length} eventi. Gli effetti si sommano e il
				portafoglio subisce gli shock in sequenza.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each events as event (event.id)}
					<Badge color="red" class="text-xs">{event.name}</Badge>
				{/each}
			</div>
		</div>
		<Badge color={combinedSurvives ? 'green' : 'red'}>
			{combinedSurvives ? 'Piano Sopravvive' : 'Piano Fallisce'}
		</Badge>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
		<StatCard
			title="Portafoglio Finale"
			value={formatCurrency(finalCombined)}
			subtitle="Base: {formatCurrency(finalBaseline)}"
			color={finalCombined >= finalBaseline * 0.8 ? 'green' : 'red'}
			trend={finalCombined >= finalBaseline ? 'up' : 'down'}
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
			value={combinedSurvives ? 'OK' : `Esaurito nel ${combinedZeroYear}`}
			subtitle={baselineSurvives && !combinedSurvives
				? 'Fallimento causato dalla combinazione'
				: baselineSurvives
					? 'Piano resiliente alla combinazione'
					: 'Piano gia\' a rischio'}
			color={combinedSurvives ? 'green' : 'red'}
		/>
	</div>

	<EChart options={chartOptions} height="400px" />
</Card>
