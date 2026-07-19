<script lang="ts">
	import { onMount } from 'svelte';
	import { init, use } from 'echarts/core';
	import type { ECharts, EChartsCoreOption } from 'echarts/core';
	import { LineChart, BarChart, PieChart } from 'echarts/charts';
	import {
		GridComponent,
		TooltipComponent,
		LegendComponent,
		MarkLineComponent,
		MarkAreaComponent,
		DataZoomComponent,
		TitleComponent
	} from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';

	use([
		LineChart,
		BarChart,
		PieChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		MarkLineComponent,
		MarkAreaComponent,
		DataZoomComponent,
		TitleComponent,
		CanvasRenderer
	]);

	let {
		options = {} as EChartsCoreOption,
		height = '400px',
		class: className = ''
	}: {
		options?: EChartsCoreOption;
		height?: string;
		class?: string;
	} = $props();

	let container: HTMLDivElement;
	let chart: ECharts | undefined;

	function isDarkMode(): boolean {
		return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
	}

	// Applica le opzioni iniettando un colore di testo di DEFAULT in base al tema.
	// Senza questo, assi/legende/titoli ECharts usano un grigio scuro illeggibile
	// sul tema scuro. I componenti che impostano un colore esplicito (es. le
	// etichette dentro le celle della heatmap) vincono comunque su questo default.
	function render() {
		if (!chart) return;
		const textColor = isDarkMode() ? '#cbd5e1' : '#374151';
		chart.setOption({ textStyle: { color: textColor }, ...options }, { notMerge: true });
	}

	onMount(() => {
		chart = init(container, undefined, { renderer: 'canvas' });
		render();

		const resizeObserver = new ResizeObserver(() => chart?.resize());
		resizeObserver.observe(container);

		// Ridisegna i testi al cambio di tema (il toggle dark mode commuta la
		// classe 'dark' su <html>).
		const themeObserver = new MutationObserver(() => render());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => {
			resizeObserver.disconnect();
			themeObserver.disconnect();
			chart?.dispose();
		};
	});

	$effect(() => {
		if (chart && options) render();
	});
</script>

<div bind:this={container} class={className} style="width: 100%; height: {height};"></div>
