<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import type { PensionAtAge } from '$lib/engine/inps-simulator';
	import { formatCurrency } from '$lib/utils/format';
	import EChart from '$lib/components/simulazione/EChart.svelte';

	let {
		pensionAtAge,
		fireMonthlyExpenses = 0
	}: {
		pensionAtAge: PensionAtAge[];
		fireMonthlyExpenses?: number;
	} = $props();

	// Filtra alle eta chiave
	const KEY_AGES = [57, 60, 62, 65, 67, 70];

	let filtered = $derived(pensionAtAge.filter((p) => KEY_AGES.includes(p.age)));

	let chartOptions = $derived.by(() => {
		if (filtered.length === 0) return {};
		return {
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: unknown[]) => {
					const arr = params as { name: string; marker: string; seriesName: string; value: number }[];
					let html = `<strong>${arr[0].name} anni</strong><br/>`;
					for (const p of arr) {
						html += `${p.marker} ${p.seriesName}: ${formatCurrency(p.value)}/mese<br/>`;
					}
					return html;
				}
			},
			legend: {
				data: ['Pensione lorda', 'Pensione netta'],
				bottom: 0
			},
			grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
			xAxis: {
				type: 'category',
				data: filtered.map((p) => p.age.toString()),
				name: 'Eta',
				nameLocation: 'middle',
				nameGap: 30
			},
			yAxis: {
				type: 'value',
				name: '€ mese',
				axisLabel: { formatter: (v: number) => formatCurrency(v) }
			},
			series: [
				{
					name: 'Pensione lorda',
					type: 'bar',
					data: filtered.map((p) => Math.round(p.monthlyGross)),
					itemStyle: { color: '#60a5fa' },
					barGap: '10%'
				},
				{
					name: 'Pensione netta',
					type: 'bar',
					data: filtered.map((p) => Math.round(p.monthlyNet)),
					itemStyle: { color: '#2563eb' },
					markLine: fireMonthlyExpenses > 0 ? {
						silent: true,
						symbol: 'none',
						lineStyle: { color: '#dc2626', type: 'dashed', width: 2 },
						label: {
							formatter: `Spese FIRE: ${formatCurrency(fireMonthlyExpenses)}/mese`,
							color: '#dc2626',
							position: 'insideEndTop'
						},
						data: [{ yAxis: Math.round(fireMonthlyExpenses) }]
					} : undefined
				}
			]
		};
	});
</script>

<Card class="max-w-none">
	<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Pensione mensile per eta di uscita
	</h5>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Confronto della pensione INPS stimata in base all'eta di pensionamento. Aspettare
		paga: il coefficiente di trasformazione cresce e si accumulano contributi aggiuntivi.
		{#if fireMonthlyExpenses > 0}
			La linea rossa mostra le spese FIRE mensili: quanto l'INPS copre da solo.
		{/if}
	</p>
	<EChart options={chartOptions} height="380px" />
</Card>
