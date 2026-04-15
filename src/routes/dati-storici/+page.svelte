<script lang="ts">
	import { Heading, Breadcrumb, BreadcrumbItem, Card, Select, Checkbox } from 'flowbite-svelte';
	import * as echarts from 'echarts/core';
	import { HeatmapChart } from 'echarts/charts';
	import { VisualMapComponent } from 'echarts/components';
	echarts.use([HeatmapChart, VisualMapComponent]);

	import EChart from '$lib/components/simulazione/EChart.svelte';
	import type { AnnualReturn } from '$lib/data/utils';
	import { sp500Returns, sp500Stats } from '$lib/data/sp500';
	import { bondReturns, bondStats } from '$lib/data/bonds';
	import { goldReturns, goldStats } from '$lib/data/gold';
	import { inflationUSReturns, inflationUSStats } from '$lib/data/inflation-us';
	import { inflationITReturns, inflationITStats } from '$lib/data/inflation-it';
	import { internationalReturns, internationalStats } from '$lib/data/international';
	import { capeRatios, capeStats } from '$lib/data/cape';
	import { correlationMatrix, assetLabels, type AssetClass } from '$lib/data/correlations';

	// Dataset definitions
	const datasets = [
		{ key: 'sp500', label: 'S&P 500', data: sp500Returns, stats: sp500Stats, unit: '%' },
		{ key: 'bonds', label: 'Obbligazioni USA', data: bondReturns, stats: bondStats, unit: '%' },
		{ key: 'gold', label: 'Oro', data: goldReturns, stats: goldStats, unit: '%' },
		{ key: 'inflUS', label: 'Inflazione USA', data: inflationUSReturns, stats: inflationUSStats, unit: '%' },
		{ key: 'inflIT', label: 'Inflazione Italia', data: inflationITReturns, stats: inflationITStats, unit: '%' },
		{ key: 'intl', label: 'Azioni Internazionali', data: internationalReturns, stats: internationalStats, unit: '%' },
		{ key: 'cape', label: 'CAPE Ratio', data: capeRatios, stats: capeStats, unit: '' }
	] as const;

	let selectedKey = $state('sp500');
	let showRolling1 = $state(true);
	let showRolling5 = $state(true);
	let showRolling10 = $state(true);
	let showRolling20 = $state(true);

	const selected = $derived(datasets.find(d => d.key === selectedKey)!);

	// Find year for min/max
	function findYear(data: AnnualReturn[], targetValue: number): number {
		return data.find(d => d.value === targetValue)?.year ?? 0;
	}

	const sharpe = $derived(
		selected.stats.stdDev > 0
			? ((selected.stats.mean - 3) / selected.stats.stdDev)
			: 0
	);

	// === Main Bar Chart ===
	const barChartOptions = $derived({
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const p = Array.isArray(params) ? params[0] : params;
				return `<b>${p.name}</b><br/>${selected.label}: ${p.value.toFixed(2)}${selected.unit}`;
			}
		},
		grid: { left: 60, right: 30, top: 20, bottom: 80 },
		xAxis: {
			type: 'category',
			data: selected.data.map(d => d.year.toString()),
			axisLabel: { rotate: 45, interval: Math.max(0, Math.floor(selected.data.length / 20) - 1) }
		},
		yAxis: {
			type: 'value',
			axisLabel: { formatter: `{value}${selected.unit}` }
		},
		dataZoom: [
			{ type: 'slider', start: 0, end: 100, bottom: 10, height: 25 }
		],
		series: [{
			type: 'bar',
			data: selected.data.map(d => ({
				value: d.value,
				itemStyle: { color: d.value >= 0 ? '#22c55e' : '#ef4444' }
			})),
			barMaxWidth: 12
		}]
	} as any);

	// === Rolling Returns ===
	function computeRolling(data: AnnualReturn[], windowYears: number): { year: number; value: number }[] {
		const result: { year: number; value: number }[] = [];
		for (let i = windowYears - 1; i < data.length; i++) {
			const slice = data.slice(i - windowYears + 1, i + 1);
			// Annualized: geometric for returns, arithmetic for non-return data (CAPE)
			if (selectedKey === 'cape') {
				const avg = slice.reduce((s, d) => s + d.value, 0) / slice.length;
				result.push({ year: data[i].year, value: avg });
			} else {
				const product = slice.reduce((p, d) => p * (1 + d.value / 100), 1);
				const annualized = (Math.pow(product, 1 / windowYears) - 1) * 100;
				result.push({ year: data[i].year, value: annualized });
			}
		}
		return result;
	}

	const rolling1 = $derived(computeRolling(selected.data, 1));
	const rolling5 = $derived(computeRolling(selected.data, 5));
	const rolling10 = $derived(computeRolling(selected.data, 10));
	const rolling20 = $derived(computeRolling(selected.data, 20));

	// Build x-axis from union of all visible rolling periods
	const rollingAllYears = $derived.by(() => {
		const yearSet = new Set<number>();
		if (showRolling1) rolling1.forEach(d => yearSet.add(d.year));
		if (showRolling5) rolling5.forEach(d => yearSet.add(d.year));
		if (showRolling10) rolling10.forEach(d => yearSet.add(d.year));
		if (showRolling20) rolling20.forEach(d => yearSet.add(d.year));
		return [...yearSet].sort((a, b) => a - b);
	});

	function rollingToMap(arr: { year: number; value: number }[]): Map<number, number> {
		return new Map(arr.map(d => [d.year, d.value]));
	}

	const rollingChartOptions = $derived.by(() => {
		const years = rollingAllYears;
		const map1 = rollingToMap(rolling1);
		const map5 = rollingToMap(rolling5);
		const map10 = rollingToMap(rolling10);
		const map20 = rollingToMap(rolling20);

		const series: any[] = [];
		if (showRolling1) series.push({ name: '1 anno', type: 'line', data: years.map((y: number) => map1.get(y) ?? null), smooth: true, symbol: 'none', lineStyle: { width: 1 } });
		if (showRolling5) series.push({ name: '5 anni', type: 'line', data: years.map((y: number) => map5.get(y) ?? null), smooth: true, symbol: 'none', lineStyle: { width: 1.5 } });
		if (showRolling10) series.push({ name: '10 anni', type: 'line', data: years.map((y: number) => map10.get(y) ?? null), smooth: true, symbol: 'none', lineStyle: { width: 2 } });
		if (showRolling20) series.push({ name: '20 anni', type: 'line', data: years.map((y: number) => map20.get(y) ?? null), smooth: true, symbol: 'none', lineStyle: { width: 2.5 } });

		return {
			tooltip: {
				trigger: 'axis',
				valueFormatter: (v: number) => v != null ? v.toFixed(2) + selected.unit : '-'
			},
			legend: { top: 0 },
			grid: { left: 60, right: 30, top: 40, bottom: 80 },
			xAxis: {
				type: 'category',
				data: years.map((y: number) => y.toString()),
				axisLabel: { rotate: 45, interval: Math.max(0, Math.floor(years.length / 20) - 1) }
			},
			yAxis: {
				type: 'value',
				axisLabel: { formatter: `{value}${selected.unit}` }
			},
			dataZoom: [{ type: 'slider', start: 0, end: 100, bottom: 10, height: 25 }],
			series
		} as any;
	});

	// === Correlation Heatmap ===
	const assetKeys: AssetClass[] = ['usStocks', 'intlStocks', 'bonds', 'gold', 'realEstate', 'cash'];
	const assetNames = assetKeys.map(k => assetLabels[k]);

	const heatmapData = $derived.by(() => {
		const data: [number, number, number][] = [];
		for (let i = 0; i < assetKeys.length; i++) {
			for (let j = 0; j < assetKeys.length; j++) {
				data.push([j, i, correlationMatrix[assetKeys[i]][assetKeys[j]]]);
			}
		}
		return data;
	});

	const heatmapOptions = $derived({
		tooltip: {
			formatter: (params: any) => {
				const [x, y, val] = params.data;
				return `${assetNames[y]} vs ${assetNames[x]}: <b>${val.toFixed(3)}</b>`;
			}
		},
		grid: { left: 140, right: 60, top: 10, bottom: 60 },
		xAxis: {
			type: 'category',
			data: assetNames,
			axisLabel: { rotate: 30, fontSize: 11 },
			splitArea: { show: true }
		},
		yAxis: {
			type: 'category',
			data: assetNames,
			axisLabel: { fontSize: 11 },
			splitArea: { show: true }
		},
		visualMap: {
			min: -1,
			max: 1,
			calculable: true,
			orient: 'vertical',
			right: 0,
			top: 'center',
			inRange: {
				color: ['#ef4444', '#fca5a5', '#ffffff', '#86efac', '#22c55e']
			}
		},
		series: [{
			type: 'heatmap',
			data: heatmapData,
			label: {
				show: true,
				formatter: (p: any) => p.data[2].toFixed(2),
				fontSize: 11
			},
			emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
		}]
	} as any);

	// === Distribution Histogram ===
	const histogramOptions = $derived.by(() => {
		const values = selected.data.map(d => d.value);
		const min = Math.floor(Math.min(...values));
		const max = Math.ceil(Math.max(...values));
		const binCount = Math.max(10, Math.min(30, Math.ceil(Math.sqrt(values.length))));
		const binWidth = (max - min) / binCount;

		const bins: { label: string; count: number }[] = [];
		for (let i = 0; i < binCount; i++) {
			const lo = min + i * binWidth;
			const hi = lo + binWidth;
			const count = values.filter(v => i === binCount - 1 ? (v >= lo && v <= hi) : (v >= lo && v < hi)).length;
			bins.push({ label: `${lo.toFixed(0)}`, count });
		}

		return {
			tooltip: {
				trigger: 'axis',
				formatter: (params: any) => {
					const p = Array.isArray(params) ? params[0] : params;
					const idx = p.dataIndex;
					const lo = min + idx * binWidth;
					const hi = lo + binWidth;
					return `${lo.toFixed(1)}${selected.unit} ~ ${hi.toFixed(1)}${selected.unit}<br/>Frequenza: <b>${p.value}</b>`;
				}
			},
			grid: { left: 60, right: 30, top: 20, bottom: 40 },
			xAxis: {
				type: 'category',
				data: bins.map(b => b.label),
				axisLabel: { rotate: 0 }
			},
			yAxis: { type: 'value', name: 'Frequenza' },
			series: [{
				type: 'bar',
				data: bins.map(b => b.count),
				itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] },
				barCategoryGap: '10%'
			}]
		} as any;
	});

	const selectItems = datasets.map(d => ({ value: d.key, name: d.label }));
</script>

<svelte:head>
	<title>Dati Storici - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Dati Storici</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-6">Dati Storici</Heading>

<p class="text-gray-600 dark:text-gray-400 mb-6">
	Esplora i dati storici di mercato utilizzati per le simulazioni:
	rendimenti azionari, obbligazionari, inflazione e correlazioni tra asset.
</p>

<!-- Dataset Selector -->
<div class="mb-6">
	<Select items={selectItems} bind:value={selectedKey} placeholder="Seleziona dataset" class="max-w-xs" />
</div>

<!-- Statistics Summary -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">{selected.label} &mdash; Statistiche</Heading>
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
		<div class="text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Media</p>
			<p class="text-xl font-bold">{selected.stats.mean.toFixed(2)}{selected.unit}</p>
		</div>
		<div class="text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Dev. Standard</p>
			<p class="text-xl font-bold">{selected.stats.stdDev.toFixed(2)}{selected.unit}</p>
		</div>
		<div class="text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Minimo</p>
			<p class="text-xl font-bold text-red-600">{selected.stats.min.toFixed(2)}{selected.unit}</p>
			<p class="text-xs text-gray-400">({findYear(selected.data, selected.stats.min)})</p>
		</div>
		<div class="text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Massimo</p>
			<p class="text-xl font-bold text-green-600">{selected.stats.max.toFixed(2)}{selected.unit}</p>
			<p class="text-xs text-gray-400">({findYear(selected.data, selected.stats.max)})</p>
		</div>
		<div class="text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Osservazioni</p>
			<p class="text-xl font-bold">{selected.stats.count}</p>
		</div>
		<div class="text-center">
			<p class="text-sm text-gray-500 dark:text-gray-400">Sharpe (approx.)</p>
			<p class="text-xl font-bold">{sharpe.toFixed(3)}</p>
		</div>
	</div>
</Card>

<!-- Main Bar Chart -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Rendimenti Annuali &mdash; {selected.label}</Heading>
	<EChart options={barChartOptions} height="400px" />
</Card>

<!-- Rolling Returns -->
<Card class="max-w-none mb-6">
	<div class="flex flex-wrap items-center gap-4 mb-4">
		<Heading tag="h3">Rendimenti Rolling &mdash; {selected.label}</Heading>
	</div>
	<div class="flex flex-wrap gap-4 mb-4">
		<Checkbox bind:checked={showRolling1}>1 anno</Checkbox>
		<Checkbox bind:checked={showRolling5}>5 anni</Checkbox>
		<Checkbox bind:checked={showRolling10}>10 anni</Checkbox>
		<Checkbox bind:checked={showRolling20}>20 anni</Checkbox>
	</div>
	<EChart options={rollingChartOptions} height="400px" />
</Card>

<!-- Distribution Histogram -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Distribuzione &mdash; {selected.label}</Heading>
	<EChart options={histogramOptions} height="350px" />
</Card>

<!-- Correlation Heatmap -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Matrice di Correlazione tra Asset Class</Heading>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
		Correlazioni di Pearson sui rendimenti annuali reali (1970-2024). Fonte: Morningstar / Vanguard.
	</p>
	<EChart options={heatmapOptions} height="450px" />
</Card>
