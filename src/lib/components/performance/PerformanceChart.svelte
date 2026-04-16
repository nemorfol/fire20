<script lang="ts">
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import type { PortfolioSnapshot, CashFlow } from '$lib/engine/twr-calculator';
	import { buildPortfolioCumulativeSeries, buildBenchmarkCumulativeSeries } from '$lib/engine/twr-calculator';
	import { sp500Returns } from '$lib/data/sp500';

	let {
		snapshots = [] as PortfolioSnapshot[],
		cashFlows = [] as CashFlow[]
	}: {
		snapshots?: PortfolioSnapshot[];
		cashFlows?: CashFlow[];
	} = $props();

	const chartOptions = $derived.by(() => {
		if (snapshots.length < 2) {
			return {
				title: {
					text: 'Inserisci almeno 2 snapshot per visualizzare il grafico',
					left: 'center',
					top: 'center',
					textStyle: { color: '#9ca3af', fontSize: 14 }
				}
			};
		}

		const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
		const startDate = sorted[0].date;
		const endDate = sorted[sorted.length - 1].date;

		const portfolioSeries = buildPortfolioCumulativeSeries(snapshots, cashFlows);
		const benchmarkSeries = buildBenchmarkCumulativeSeries(startDate, endDate, sp500Returns);

		const allDates = [
			...portfolioSeries.map((p) => p.date),
			...benchmarkSeries.map((b) => b.date)
		].sort((a, b) => a.getTime() - b.getTime());

		// Deduplica date
		const uniqueDates = [...new Set(allDates.map((d) => d.toISOString().split('T')[0]))];

		// Mappa i valori per data
		const portfolioMap = new Map(portfolioSeries.map((p) => [p.date.toISOString().split('T')[0], p.value]));
		const benchmarkMap = new Map(benchmarkSeries.map((b) => [b.date.toISOString().split('T')[0], b.value]));

		return {
			tooltip: {
				trigger: 'axis',
				valueFormatter: (v: number) => (v != null ? v.toFixed(2) : '-')
			},
			legend: {
				data: ['Portafoglio', 'S&P 500'],
				top: 0
			},
			grid: { left: 60, right: 30, top: 40, bottom: 60 },
			xAxis: {
				type: 'category',
				data: uniqueDates,
				axisLabel: {
					rotate: 30,
					formatter: (v: string) => {
						const d = new Date(v);
						return d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
					}
				}
			},
			yAxis: {
				type: 'value',
				name: 'Valore (base 100)',
				axisLabel: { formatter: '{value}' }
			},
			dataZoom: [{ type: 'slider', start: 0, end: 100, bottom: 5, height: 25 }],
			series: [
				{
					name: 'Portafoglio',
					type: 'line',
					data: uniqueDates.map((d) => portfolioMap.get(d) ?? null),
					smooth: true,
					symbol: 'circle',
					symbolSize: 6,
					lineStyle: { width: 2.5, color: '#3b82f6' },
					itemStyle: { color: '#3b82f6' }
				},
				{
					name: 'S&P 500',
					type: 'line',
					data: uniqueDates.map((d) => benchmarkMap.get(d) ?? null),
					smooth: true,
					symbol: 'none',
					lineStyle: { width: 2, color: '#f59e0b', type: 'dashed' },
					itemStyle: { color: '#f59e0b' }
				}
			]
		} as any;
	});
</script>

<EChart options={chartOptions} height="400px" />
