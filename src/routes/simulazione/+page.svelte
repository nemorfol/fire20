<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Toast
	} from 'flowbite-svelte';
	import {
		FloppyDiskSolid,
		CheckCircleSolid,
		CloseCircleSolid
	} from 'flowbite-svelte-icons';
	import type { MonteCarloParams, MonteCarloResult } from '$lib/engine/monte-carlo';
	import type { SimulationResult } from '$lib/db/index';
	import { sp500Returns } from '$lib/data/sp500';
	import { bondReturns } from '$lib/data/bonds';
	import { goldReturns } from '$lib/data/gold';
	import { inflationUSReturns } from '$lib/data/inflation-us';
	import {
		createResult,
		getAllResults,
		deleteResult
	} from '$lib/db/results';

	import ConfigPanel from '$lib/components/simulazione/ConfigPanel.svelte';
	import SuccessGauge from '$lib/components/simulazione/SuccessGauge.svelte';
	import FanChart from '$lib/components/simulazione/FanChart.svelte';
	import HistogramChart from '$lib/components/simulazione/HistogramChart.svelte';
	import SummaryTable from '$lib/components/simulazione/SummaryTable.svelte';
	import ScenarioTabs from '$lib/components/simulazione/ScenarioTabs.svelte';
	import PreviousResults from '$lib/components/simulazione/PreviousResults.svelte';

	// State
	let running = $state(false);
	let progress = $state(0);
	let elapsedTime = $state(0);
	let result = $state<MonteCarloResult | null>(null);
	let previousResults = $state<SimulationResult[]>([]);
	let lastParams = $state<Partial<MonteCarloParams> | null>(null);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');
	let showToast = $state(false);
	let profileLoaded = $state(false);

	// Worker reference
	let worker: Worker | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Historical returns as decimals
	const historicalStockReturns = sp500Returns.map((r) => r.value / 100);
	const historicalBondReturns = bondReturns.map((r) => r.value / 100);
	const historicalGoldReturns = goldReturns.map((r) => r.value / 100);
	const historicalInflation = inflationUSReturns.map((r) => r.value / 100);

	onMount(() => {
		loadPreviousResults();
		return () => {
			worker?.terminate();
			if (timerInterval) clearInterval(timerInterval);
		};
	});

	async function loadPreviousResults() {
		try {
			previousResults = await getAllResults();
		} catch {
			// IndexedDB may not be available
		}
	}

	function showNotification(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 4000);
	}

	function startTimer() {
		const startTime = performance.now();
		elapsedTime = 0;
		timerInterval = setInterval(() => {
			elapsedTime = Math.round(performance.now() - startTime);
		}, 100);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function handleRun(params: Partial<MonteCarloParams>) {
		if (running) return;

		running = true;
		progress = 0;
		result = null;
		lastParams = params;
		startTimer();

		// Add historical data for non-parametric modes
		if (params.simulationMode !== 'parametric') {
			params.historicalStockReturns = historicalStockReturns;
			params.historicalBondReturns = historicalBondReturns;
			params.historicalInflation = historicalInflation;

			// Attach historical returns to multi-asset configs
			if (params.assetClasses) {
				const histMap: Record<string, number[]> = {
					stocks: historicalStockReturns,
					bonds: historicalBondReturns,
					gold: historicalGoldReturns
				};
				for (const ac of params.assetClasses) {
					if (histMap[ac.name]) {
						ac.historicalReturns = histMap[ac.name];
					}
				}
			}
		}

		// Terminate previous worker if still running
		worker?.terminate();

		try {
			worker = new Worker(
				new URL('$lib/workers/monte-carlo.worker.ts', import.meta.url),
				{ type: 'module' }
			);

			worker.onmessage = (e: MessageEvent) => {
				const data = e.data;
				if (data.type === 'progress') {
					progress = data.percent;
				} else if (data.type === 'result') {
					result = data.data as MonteCarloResult;
					running = false;
					progress = 100;
					stopTimer();
					showNotification('Simulazione completata con successo!');
				} else if (data.type === 'error') {
					running = false;
					stopTimer();
					showNotification(`Errore: ${data.message}`, 'error');
				}
			};

			worker.onerror = (e) => {
				running = false;
				stopTimer();
				showNotification(`Errore nel worker: ${e.message}`, 'error');
			};

			worker.postMessage({
				type: 'run',
				params: {
					initialPortfolio: params.initialPortfolio ?? 200000,
					annualContribution: params.annualContribution ?? 20000,
					annualExpenses: params.annualExpenses ?? 30000,
					withdrawalRate: params.withdrawalRate ?? 0.04,
					withdrawalStrategy: params.withdrawalStrategy ?? 'fixed',
					stockAllocation: params.stockAllocation ?? 0.7,
					bondAllocation: params.bondAllocation ?? 0.3,
					yearsToFire: params.yearsToFire ?? 10,
					yearsInRetirement: params.yearsInRetirement ?? 30,
					inflationRate: params.inflationRate ?? 0.02,
					simulationMode: params.simulationMode ?? 'historical',
					iterations: params.iterations ?? 10000,
					expectedStockReturn: params.expectedStockReturn,
					stockStdDev: params.stockStdDev,
					expectedBondReturn: params.expectedBondReturn,
					bondStdDev: params.bondStdDev,
					historicalStockReturns: params.historicalStockReturns,
					historicalBondReturns: params.historicalBondReturns,
					historicalInflation: params.historicalInflation,
					useCorrelation: params.useCorrelation,
					assetClasses: params.assetClasses,
					correlationMatrix: params.correlationMatrix
				} satisfies MonteCarloParams
			});
		} catch (err) {
			running = false;
			stopTimer();
			showNotification('Impossibile avviare il Web Worker', 'error');
		}
	}

	async function handleSave() {
		if (!result || !lastParams) return;

		try {
			const totalYears = (lastParams.yearsToFire ?? 10) + (lastParams.yearsInRetirement ?? 30);
			const finalYear = result.percentiles.p5.length - 1;

			await createResult({
				scenarioId: 0,
				profileId: 0,
				iterations: lastParams.iterations ?? 10000,
				years: totalYears,
				successRate: result.successRate,
				medianFinalValue: result.medianFinalValue,
				percentiles: {
					p5: result.percentiles.p5[finalYear] ?? 0,
					p10: result.percentiles.p10[finalYear] ?? 0,
					p25: result.percentiles.p25[finalYear] ?? 0,
					p50: result.percentiles.p50[finalYear] ?? 0,
					p75: result.percentiles.p75[finalYear] ?? 0,
					p90: result.percentiles.p90[finalYear] ?? 0,
					p95: result.percentiles.p95[finalYear] ?? 0
				},
				yearlyData: result!.yearlyStats.map((s) => ({
					year: s.year,
					median: s.median,
					p5: s.p5,
					p25: result!.percentiles.p25[s.year - 1] ?? 0,
					p75: result!.percentiles.p75[s.year - 1] ?? 0,
					p95: s.p95,
					successRate: s.successRate
				})),
				params: {
					withdrawalRate: (lastParams.withdrawalRate ?? 0.04) * 100,
					withdrawalStrategy: 'fixed',
					stockAllocation: (lastParams.stockAllocation ?? 0.7) * 100,
					bondAllocation: (lastParams.bondAllocation ?? 0.3) * 100,
					glidePathEnabled: false,
					inflationRate: (lastParams.inflationRate ?? 0.02) * 100,
					expectedReturn: 7,
					iterations: lastParams.iterations ?? 10000
				}
			});

			await loadPreviousResults();
			showNotification('Risultato salvato con successo!');
		} catch (err) {
			showNotification('Errore nel salvataggio', 'error');
		}
	}

	function handleLoadResult(saved: SimulationResult) {
		// Reconstruct a MonteCarloResult from the saved data
		const p5: number[] = saved.yearlyData.map((d) => d.p5);
		const p25: number[] = saved.yearlyData.map((d) => d.p25);
		const p50: number[] = saved.yearlyData.map((d) => d.median);
		const p75: number[] = saved.yearlyData.map((d) => d.p75);
		const p95: number[] = saved.yearlyData.map((d) => d.p95);
		// Approximate p10 and p90
		const p10: number[] = saved.yearlyData.map((d) => Math.round((d.p5 + d.median) / 2));
		const p90: number[] = saved.yearlyData.map((d) => Math.round((d.median + d.p95) / 2));

		result = {
			successRate: saved.successRate,
			medianFinalValue: saved.medianFinalValue,
			meanFinalValue: saved.medianFinalValue,
			percentiles: { p5, p10, p25, p50, p75, p90, p95 },
			yearlyStats: saved.yearlyData.map((d) => ({
				year: d.year,
				median: d.median,
				mean: d.median,
				p5: d.p5,
				p95: d.p95,
				successRate: d.successRate
			})),
			worstCase: p5,
			bestCase: p95,
			failureYear: null
		};

		showNotification('Risultato caricato');
	}

	async function handleDeleteResult(id: number) {
		try {
			await deleteResult(id);
			await loadPreviousResults();
			showNotification('Risultato eliminato');
		} catch {
			showNotification('Errore nella cancellazione', 'error');
		}
	}
</script>

<svelte:head>
	<title>Simulazione Monte Carlo - FIRE Planner</title>
</svelte:head>

<!-- Toast notification -->
{#if showToast}
	<div class="fixed top-4 right-4 z-50">
		<Toast color={toastType === 'success' ? 'green' : 'red'} dismissable toastStatus={showToast}>
			{#snippet icon()}
				{#if toastType === 'success'}
					<CheckCircleSolid class="w-5 h-5" />
				{:else}
					<CloseCircleSolid class="w-5 h-5" />
				{/if}
			{/snippet}
			{toastMessage}
		</Toast>
	</div>
{/if}

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Simulazione Monte Carlo</BreadcrumbItem>
</Breadcrumb>

<div class="flex items-start justify-between mb-6 flex-wrap gap-4">
	<div>
		<Heading tag="h1" class="mb-2">Simulazione Monte Carlo</Heading>
		<p class="text-gray-600 dark:text-gray-400">
			Testa la robustezza del tuo piano FIRE simulando migliaia di scenari di mercato.
		</p>
	</div>
	{#if result && !running}
		<Button color="primary" onclick={handleSave}>
			<FloppyDiskSolid class="w-4 h-4 me-2" />
			Salva Risultato
		</Button>
	{/if}
</div>

<!-- Configuration Panel -->
<div class="mb-8">
	<ConfigPanel
		onRun={handleRun}
		{running}
		{progress}
		{elapsedTime}
		{profileLoaded}
	/>
</div>

<!-- Results Section -->
{#if result}
	<div class="space-y-8 mb-8">
		<!-- Animated entrance -->
		<div class="animate-fade-in">
			<!-- Success Gauge + Key Stats -->
			<div class="mb-8">
				<SuccessGauge {result} />
			</div>

			<!-- Fan Chart -->
			<div class="mb-8">
				<FanChart {result} />
			</div>

			<!-- Histogram + Summary Table -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
				<HistogramChart {result} />
				<SummaryTable {result} />
			</div>

			<!-- Scenario Detail Tabs -->
			<div class="mb-8">
				<ScenarioTabs {result} />
			</div>
		</div>
	</div>
{/if}

<!-- Previous Results -->
<div class="mb-8">
	<PreviousResults
		results={previousResults}
		onLoad={handleLoadResult}
		onDelete={handleDeleteResult}
	/>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	:global(.animate-fade-in) {
		animation: fadeIn 0.6s ease-out;
	}
</style>
