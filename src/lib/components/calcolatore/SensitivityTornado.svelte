<script lang="ts">
	/**
	 * Tornado chart: visualizza la sensitivity analysis del piano FIRE.
	 * Per ogni variabile mostriamo una barra orizzontale che va da
	 * lowMetric (shock -10%) a highMetric (shock +10%). La variabile con
	 * la barra piu' lunga e' la piu' influente sul risultato finale.
	 *
	 * Filosofia trasparenza: l'utente non si fida di una proiezione finale
	 * isolata. Mostrare quale leva sposta l'ago e di quanto rende il modello
	 * verificabile.
	 */
	import EChart from '$lib/components/shared/EChart.svelte';
	import { runSensitivity } from '$lib/engine/sensitivity';
	import type { ProjectionParams } from '$lib/engine/fire-calculator';
	import type { EChartsOption } from 'echarts';
	import { Card } from 'flowbite-svelte';

	let {
		baseParams,
		shock = 0.1,
		metric = 'finalPortfolio'
	}: {
		baseParams: ProjectionParams;
		shock?: number;
		metric?: 'finalPortfolio' | 'depletionAge' | 'cumulativeWithdrawals' | 'minPortfolio';
	} = $props();

	let results = $derived(runSensitivity(baseParams, undefined, shock, metric));

	let metricLabel = $derived(
		metric === 'finalPortfolio'
			? 'Portafoglio finale'
			: metric === 'depletionAge'
				? 'Eta\' di esaurimento'
				: metric === 'cumulativeWithdrawals'
					? 'Prelievi cumulati'
					: 'Portafoglio minimo'
	);

	const fmt = (v: number) => {
		if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M€`;
		if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k€`;
		return v.toFixed(0);
	};

	let chartOptions = $derived.by<EChartsOption>(() => {
		const sortedAsc = [...results].sort((a, b) => a.impact - b.impact); // piu' impattante in alto
		const labels = sortedAsc.map((r) => r.variable);
		const baseline = sortedAsc[0]?.baselineMetric ?? 0;
		// Per il tornado: due serie, "low" (negativa rispetto al baseline) e
		// "high" (positiva). Usiamo barre stacked con stack su -delta e +delta.
		const lowDeltas = sortedAsc.map((r) => r.lowMetric - baseline);
		const highDeltas = sortedAsc.map((r) => r.highMetric - baseline);

		return {
			grid: { left: 140, right: 30, top: 30, bottom: 30 },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: ((params: unknown) => {
					const arr = params as { dataIndex?: number }[];
					const idx = arr?.[0]?.dataIndex ?? 0;
					const r = sortedAsc[idx];
					if (!r) return '';
					return `<b>${r.variable}</b><br/>` +
						`Baseline: ${fmt(r.baseline)} → ${metricLabel}: ${fmt(r.baselineMetric)}<br/>` +
						`-${(shock * 100).toFixed(0)}% (${fmt(r.low)}): ${fmt(r.lowMetric)} (${fmt(r.lowMetric - r.baselineMetric)})<br/>` +
						`+${(shock * 100).toFixed(0)}% (${fmt(r.high)}): ${fmt(r.highMetric)} (${fmt(r.highMetric - r.baselineMetric)})`;
				}) as never
			},
			xAxis: {
				type: 'value',
				name: `${metricLabel} (delta vs baseline)`,
				axisLabel: { formatter: ((v: number) => fmt(v)) as never }
			},
			yAxis: {
				type: 'category',
				data: labels,
				axisLabel: { width: 130, overflow: 'truncate' }
			},
			series: [
				{
					name: `Shock -${(shock * 100).toFixed(0)}%`,
					type: 'bar',
					stack: 'tornado',
					data: lowDeltas,
					itemStyle: { color: '#ef4444' }
				},
				{
					name: `Shock +${(shock * 100).toFixed(0)}%`,
					type: 'bar',
					stack: 'tornado',
					data: highDeltas,
					itemStyle: { color: '#22c55e' }
				}
			],
			legend: { top: 0 }
		} satisfies EChartsOption;
	});
</script>

<Card size="xl" class="!max-w-none w-full">
	<div class="mb-3">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Analisi di sensitivita'</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Ogni variabile e' shockata di ±{(shock * 100).toFixed(0)}% rispetto al baseline.
			Le barre piu' lunghe = leve piu' influenti sul {metricLabel.toLowerCase()}.
		</p>
	</div>
	<EChart options={chartOptions} height="380px" />
	<div class="mt-3 text-xs text-gray-500 dark:text-gray-400">
		Top driver: <b>{results[0]?.variable ?? '-'}</b>
		(impatto stimato {fmt(results[0]?.impact ?? 0)} sul {metricLabel.toLowerCase()}).
	</div>
</Card>
