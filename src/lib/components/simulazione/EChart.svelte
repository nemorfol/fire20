<script lang="ts">
	import { onMount } from 'svelte';
	import * as echarts from 'echarts/core';
	import { LineChart, BarChart, PieChart } from 'echarts/charts';
	import {
		GridComponent,
		TooltipComponent,
		LegendComponent,
		DataZoomComponent,
		MarkLineComponent,
		MarkAreaComponent,
		TitleComponent
	} from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';

	echarts.use([
		LineChart,
		BarChart,
		PieChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		DataZoomComponent,
		MarkLineComponent,
		MarkAreaComponent,
		TitleComponent,
		CanvasRenderer
	]);

	let {
		options = {} as echarts.EChartsOption,
		height = '400px',
		class: className = ''
	}: {
		options?: echarts.EChartsOption;
		height?: string;
		class?: string;
	} = $props();

	let container: HTMLDivElement;
	let chart: echarts.ECharts | undefined;

	onMount(() => {
		chart = echarts.init(container, undefined, { renderer: 'canvas' });
		chart.setOption(options);

		const resizeObserver = new ResizeObserver(() => {
			chart?.resize();
		});
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			chart?.dispose();
		};
	});

	$effect(() => {
		if (chart && options) {
			chart.setOption(options, { notMerge: true });
		}
	});
</script>

<div bind:this={container} class={className} style="width: 100%; height: {height};"></div>
