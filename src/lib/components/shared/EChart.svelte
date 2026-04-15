<script lang="ts">
	import { onMount } from 'svelte';
	import { init, use } from 'echarts/core';
	import { LineChart, BarChart } from 'echarts/charts';
	import {
		GridComponent,
		TooltipComponent,
		LegendComponent,
		MarkLineComponent,
		DataZoomComponent
	} from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import type { EChartsOption } from 'echarts';

	use([
		LineChart,
		BarChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		MarkLineComponent,
		DataZoomComponent,
		CanvasRenderer
	]);

	let {
		options = {} as EChartsOption,
		height = '400px'
	}: {
		options?: EChartsOption;
		height?: string;
	} = $props();

	let container: HTMLDivElement;
	let chart: ReturnType<typeof init> | undefined;

	onMount(() => {
		chart = init(container);
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

<div bind:this={container} style="width: 100%; height: {height};"></div>
