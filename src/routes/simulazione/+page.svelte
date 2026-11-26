<script lang="ts">
	import { onMount } from 'svelte';
	import { Heading, Breadcrumb, BreadcrumbItem, Button, Toast } from 'flowbite-svelte';
	import { FloppyDiskSolid, CheckCircleSolid, CloseCircleSolid } from 'flowbite-svelte-icons';
	import type { MonteCarloParams, MonteCarloResult } from '$lib/engine/monte-carlo';
	import { runMonteCarloWorker } from '$lib/workers/monte-carlo-client';
	import type { SimulationResult } from '$lib/db/index';
	import {
		ALL_SERIES_PRESETS,
		getSeriesPreset,
		ALLWORLD_US_WEIGHT_DEFAULT,
		alignHistory,
		recenterHistory,
		meanRealReturn,
		ROBUSTNESS_WINDOWS,
		type HistoricalAsset,
		type SeriesPresetId
	} from '$lib/data/default-series';
	import { DEFAULT_2026, getPreset } from '$lib/engine/assumptions';
	import { blendedCapitalGainsRate } from '$lib/engine/tax-italy';
	import { createResult, getAllResults, deleteResult } from '$lib/db/results';
	import { getAllProfiles } from '$lib/db/profiles';
	import { calculateLiquidNetWorth, liquidMonthlyContributions } from '$lib/engine/fire-calculator';
	import {
		pensionFundPlanFromProfile,
		type PensionFundPlan,
		type PensionFundProfileData
	} from '$lib/engine/rita';

	import ConfigPanel from '$lib/components/simulazione/ConfigPanel.svelte';
	import SuccessGauge from '$lib/components/simulazione/SuccessGauge.svelte';
	import FanChart from '$lib/components/simulazione/FanChart.svelte';
	import HistogramChart from '$lib/components/simulazione/HistogramChart.svelte';
	import SummaryTable from '$lib/components/simulazione/SummaryTable.svelte';
	import SpendingChart from '$lib/components/simulazione/SpendingChart.svelte';
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
	// Parametri fiscali del MC derivati dal profilo (coerenza col deterministico):
	// aliquota capital gain blended dalla composizione e quota BFP esente da bollo.
	let mcCapGainsRate = $state(0);
	let mcBolloExemptShare = $state(0);
	// #5: valori iniziali della simulazione ereditati dal profilo (come il calcolatore).
	let simDefaults = $state<{
		initialPortfolio?: number;
		annualContribution?: number;
		annualExpenses?: number;
		yearsToFire?: number;
		yearsInRetirement?: number;
		currentAge?: number;
		pensionAnnual?: number;
		pensionStartAge?: number;
		otherIncomeAnnual?: number;
		otherIncomeEndAge?: number;
	}>({});
	let paramsReady = $state(false);

	// Worker reference
	let worker: Worker | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Preset di serie storiche: default MSCI World (pesi storici) in lire/EUR con BTP
	// JST, oro in EUR e ISTAT; alternative: mix a peso fisso, ex-USA, US in USD. Le serie vengono
	// allineate per anno al momento del run (finestra comune alle asset class usate).
	let seriesPresetId = $state<SeriesPresetId>('it-world');
	/** Peso USA (%) del preset All-World: default = peso attuale nell'MSCI World */
	let allWorldUsPct = $state(Math.round(ALLWORLD_US_WEIGHT_DEFAULT * 100));
	const activePreset = $derived(
		getSeriesPreset(seriesPresetId, Math.min(100, Math.max(0, allWorldUsPct || 0)) / 100)
	);
	/** Finestra storica effettivamente usata dall'ultimo run (per trasparenza) */
	let historyWindow = $state<{ from: number; to: number } | null>(null);
	/** Primo anno storico ammesso (0 = tutto lo storico disponibile) */
	let historyFromYear = $state(0);
	// Bootstrap ricentrato: forma storica, media = ipotesi dichiarate dall'utente
	let recenterEnabled = $state(false);
	let recenterStocksPct = $state(5.0);
	let recenterBondsPct = $state(1.5);
	/** Rendimenti reali medi storici della finestra usata (prima della ricentratura) */
	let historyMeans = $state<{ stocks?: number; bonds?: number } | null>(null);

	// Verifica di robustezza per sottoperiodi
	type RobustnessRow = {
		label: string;
		from?: number;
		to?: number;
		successRate?: number;
		floorSuccessRate?: number;
		medianFinalValue?: number;
		note?: string;
	};
	let robustnessRows = $state<RobustnessRow[]>([]);
	let robustnessRunning = $state(false);
	let robustnessWorker: Worker | null = null;
	// #41: dati del fondo pensione dal profilo e piano usato nell'ultima simulazione
	let fundProfile = $state<PensionFundProfileData | null>(null);
	let lastFundPlan = $state<PensionFundPlan | null>(null);

	onMount(() => {
		loadPreviousResults();
		loadProfileDefaults();
		return () => {
			worker?.terminate();
			robustnessWorker?.terminate();
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

	async function loadProfileDefaults() {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length > 0) {
				const p = profiles[0];
				const liquid = calculateLiquidNetWorth(p.portfolio as unknown as Record<string, number>);
				mcCapGainsRate = blendedCapitalGainsRate(
					p.portfolio as unknown as Record<string, number>,
					getPreset(p.assumptionsId).capital
				);
				mcBolloExemptShare = liquid > 0 ? (p.portfolio.bfp ?? 0) / liquid : 0;
				// I versamenti al fondo pensione alimentano il fondo, non il portafoglio (#41)
				const monthly =
					liquidMonthlyContributions(p.monthlyContributions as unknown as Record<string, number>) *
					12;
				fundProfile = {
					portfolio: { pensionFund: p.portfolio.pensionFund ?? 0 },
					monthlyContributions: { pensionFund: p.monthlyContributions.pensionFund ?? 0 },
					pension: { contributionYears: p.pension?.contributionYears ?? 0 }
				};
				const income = (p.annualIncome || 0) + (p.otherIncome || 0);
				const contribution =
					income > 0 ? Math.min(monthly, Math.max(0, income - (p.annualExpenses || 0))) : monthly;
				const age = new Date().getFullYear() - p.birthYear;
				const retAge = p.retirementAge || 65;
				const lifeExp = p.lifeExpectancy || 90;
				simDefaults = {
					initialPortfolio: Math.round(liquid),
					annualContribution: Math.round(contribution),
					annualExpenses: Math.round(p.fireExpenses || p.annualExpenses || 30000),
					yearsToFire: Math.max(0, retAge - age),
					yearsInRetirement: Math.max(1, lifeExp - retAge),
					currentAge: age,
					pensionAnnual: Math.round((p.pension?.estimatedMonthly || 0) * 13),
					pensionStartAge: p.pension?.pensionAge || 67,
					otherIncomeAnnual: Math.round(p.otherIncome || 0),
					otherIncomeEndAge: p.otherIncomeEndAge ?? lifeExp
				};
				profileLoaded = true;
			}
		} catch {
			/* nessun profilo: si usano i default */
		} finally {
			paramsReady = true;
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

		// Serie storiche per le modalita' non parametriche
		robustnessRows = [];
		const attached = attachHistory(params, historyFromYear || undefined);
		historyWindow = attached.window;
		historyMeans = attached.means;

		// #41: fondo pensione come asset differito. Il piano (RITA o prestazione) e'
		// ricalcolato con le eta' del pannello; il rendimento del fondo e' quello
		// atteso del mix azioni/obbligazioni (tassato al 20% in rita.ts).
		lastFundPlan = null;
		if (fundProfile && params.currentAge !== undefined) {
			const retirementAge = params.currentAge + (params.yearsToFire ?? 0);
			const stockAlloc = params.stockAllocation ?? 0.7;
			const plan = pensionFundPlanFromProfile(fundProfile, {
				currentAge: params.currentAge,
				retirementAge,
				pensionAge: params.pensionAge ?? 67,
				lifeExpectancy: retirementAge + (params.yearsInRetirement ?? 30),
				nominalReturn:
					(params.expectedStockReturn ?? 0.07) * stockAlloc +
					(params.expectedBondReturn ?? 0.03) * (params.bondAllocation ?? 1 - stockAlloc),
				inflationRate: params.inflationRate ?? 0.02
			});
			if (plan.mode !== 'none') lastFundPlan = plan;
		}

		try {
			worker = runMonteCarloWorker(worker, toWorkerParams(params), {
				onProgress: (percent) => {
					progress = percent;
				},
				onResult: (data) => {
					result = data;
					running = false;
					progress = 100;
					stopTimer();
					showNotification('Simulazione completata con successo!');
				},
				onError: (message) => {
					running = false;
					stopTimer();
					showNotification(`Errore: ${message}`, 'error');
				},
				onWorkerError: (e) => {
					running = false;
					stopTimer();
					showNotification(`Errore nel worker: ${e.message}`, 'error');
				}
			});
		} catch {
			running = false;
			stopTimer();
			showNotification('Impossibile avviare il Web Worker', 'error');
		}
	}

	/**
	 * Allinea le serie del preset attivo sulle asset class in portafoglio (finestra
	 * comune, eventualmente dal `fromYear`), applica la ricentratura se attiva e le
	 * aggancia ai parametri. Restituisce la finestra usata e le medie storiche.
	 */
	function attachHistory(
		params: Partial<MonteCarloParams>,
		fromYear?: number
	): {
		window: { from: number; to: number } | null;
		means: { stocks?: number; bonds?: number } | null;
	} {
		if (params.simulationMode === 'parametric') return { window: null, means: null };
		// Asset class effettivamente in portafoglio: determinano la finestra comune.
		const required: HistoricalAsset[] = [];
		if (params.assetClasses) {
			for (const ac of params.assetClasses) {
				if (
					ac.allocation > 0 &&
					(ac.name === 'stocks' || ac.name === 'bonds' || ac.name === 'gold')
				) {
					required.push(ac.name);
				}
			}
		} else {
			if ((params.stockAllocation ?? 0) > 0 || params.glidePathEnabled) required.push('stocks');
			if ((params.bondAllocation ?? 0) > 0 || params.glidePathEnabled) required.push('bonds');
		}
		let h = alignHistory(activePreset, required, fromYear);
		const means = {
			stocks: h.stocks.length ? meanRealReturn(h.stocks, h.inflation) : undefined,
			bonds: h.bonds.length ? meanRealReturn(h.bonds, h.inflation) : undefined
		};
		if (recenterEnabled) {
			h = recenterHistory(h, {
				stocks: (recenterStocksPct || 0) / 100,
				bonds: (recenterBondsPct || 0) / 100
			});
		}
		params.historicalStockReturns = h.stocks;
		params.historicalBondReturns = h.bonds;
		params.historicalInflation = h.inflation;
		params.jointHistoricalSampling = true;

		// Serie allineate per anno anche per le configurazioni multi-asset (copie:
		// la verifica per sottoperiodi riusa gli stessi parametri)
		if (params.assetClasses) {
			const histMap: Record<string, number[]> = { stocks: h.stocks, bonds: h.bonds, gold: h.gold };
			params.assetClasses = params.assetClasses.map((ac) =>
				histMap[ac.name] ? { ...ac, historicalReturns: histMap[ac.name] } : ac
			);
		}
		return {
			window: h.years.length > 0 ? { from: h.years[0], to: h.years[h.years.length - 1] } : null,
			means
		};
	}

	/** Parametri completi per il worker (default espliciti) */
	function toWorkerParams(params: Partial<MonteCarloParams>): MonteCarloParams {
		return {
			initialPortfolio: params.initialPortfolio ?? 200000,
			annualContribution: params.annualContribution ?? 20000,
			annualExpenses: params.annualExpenses ?? 30000,
			withdrawalRate: params.withdrawalRate ?? 0.04,
			withdrawalStrategy: params.withdrawalStrategy ?? 'fixed',
			lifeExpectancy: params.lifeExpectancy,
			capeRatio: params.capeRatio,
			targetBequest: params.targetBequest,
			plannedRealReturn: params.plannedRealReturn,
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
			jointHistoricalSampling: params.jointHistoricalSampling,
			useCorrelation: params.useCorrelation,
			assetClasses: params.assetClasses,
			correlationMatrix: params.correlationMatrix,
			glidePathEnabled: params.glidePathEnabled,
			glidePathStartEquity: params.glidePathStartEquity,
			glidePathEndEquity: params.glidePathEndEquity,
			stampDutyRate: params.stampDutyRate ?? DEFAULT_2026.capital.stampDuty,
			ivafeRate: params.ivafeRate ?? DEFAULT_2026.capital.ivafe,
			foreignBrokerShare: params.foreignBrokerShare ?? 0,
			capitalGainsTaxRate: params.capitalGainsTaxRate ?? mcCapGainsRate,
			capitalGainsTaxMode: params.capitalGainsTaxMode,
			initialCostBasis: params.initialCostBasis,
			levelIncomeWithPension: params.levelIncomeWithPension,
			minAcceptableSpending: params.minAcceptableSpending,
			bolloExemptShare: params.bolloExemptShare ?? mcBolloExemptShare,
			currentAge: params.currentAge,
			annualPension: params.annualPension ?? 0,
			pensionAge: params.pensionAge,
			otherIncome: params.otherIncome ?? 0,
			otherIncomeEndAge: params.otherIncomeEndAge,
			pensionFundIncomeByAge: lastFundPlan?.incomeByAge
		} satisfies MonteCarloParams;
	}

	/**
	 * Verifica di robustezza: rilancia lo stesso piano su finestre storiche diverse
	 * (tutto, dal 1991, dal 1999) in sequenza, con al massimo 5.000 iterazioni.
	 */
	function runRobustness() {
		if (!lastParams || robustnessRunning || lastParams.simulationMode === 'parametric') return;
		const base = $state.snapshot(lastParams) as Partial<MonteCarloParams>;
		const rows: RobustnessRow[] = ROBUSTNESS_WINDOWS.map((w) => ({ label: w.label }));
		robustnessRows = rows;
		robustnessRunning = true;
		const step = (i: number) => {
			if (i >= ROBUSTNESS_WINDOWS.length) {
				robustnessRunning = false;
				robustnessWorker?.terminate();
				robustnessWorker = null;
				return;
			}
			const params: Partial<MonteCarloParams> = {
				...base,
				iterations: Math.min(base.iterations ?? 10000, 5000)
			};
			const { window } = attachHistory(params, ROBUSTNESS_WINDOWS[i].fromYear);
			if (!window || window.to - window.from + 1 < 10) {
				robustnessRows[i] = { ...rows[i], note: 'Meno di 10 anni di dati: non significativo' };
				step(i + 1);
				return;
			}
			try {
				robustnessWorker = runMonteCarloWorker(robustnessWorker, toWorkerParams(params), {
					onResult: (data) => {
						robustnessRows[i] = {
							label: rows[i].label,
							from: window.from,
							to: window.to,
							successRate: data.successRate,
							floorSuccessRate: data.spending?.floorSuccessRate,
							medianFinalValue: data.medianFinalValue
						};
						step(i + 1);
					},
					onError: (message) => {
						robustnessRows[i] = { ...rows[i], note: `Errore: ${message}` };
						step(i + 1);
					}
				});
			} catch {
				robustnessRunning = false;
			}
		};
		step(0);
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
					withdrawalStrategy: lastParams.withdrawalStrategy ?? 'fixed',
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
			failureYear: null,
			// Un risultato salvato non porta con se' l'errore standard: lo lasciamo
			// neutro (nessuna banda di incertezza ricostruibile a posteriori).
			successRateStdError: 0,
			successRateCI95: { lower: saved.successRate, upper: saved.successRate }
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
					<CheckCircleSolid class="h-5 w-5" />
				{:else}
					<CloseCircleSolid class="h-5 w-5" />
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

<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
	<div>
		<Heading tag="h1" class="mb-2">Simulazione Monte Carlo</Heading>
		<p class="text-gray-600 dark:text-gray-400">
			Testa la robustezza del tuo piano FIRE simulando migliaia di scenari di mercato.
		</p>
	</div>
	{#if result && !running}
		<Button color="primary" onclick={handleSave}>
			<FloppyDiskSolid class="me-2 h-4 w-4" />
			Salva Risultato
		</Button>
	{/if}
</div>

<!-- Series preset switcher -->
<div
	class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="flex-1">
			<label
				for="series-preset"
				class="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200"
			>
				Serie storica di riferimento
			</label>
			<p class="text-xs text-gray-600 dark:text-gray-400">
				{activePreset.description}
				{#if historyWindow}
					<br /><span class="font-medium"
						>Ultima simulazione: anni {historyWindow.from}-{historyWindow.to} ({historyWindow.to -
							historyWindow.from +
							1} anni), valuta {activePreset.currency}.</span
					>
				{/if}
				{#if lastFundPlan}
					<br /><span class="font-medium text-violet-700 dark:text-violet-300"
						>Fondo pensione (fuori dal portafoglio):
						{#if lastFundPlan.mode === 'rita'}
							RITA netta ~{Math.round(lastFundPlan.ritaAnnualNet).toLocaleString('it-IT')} &euro;/anno
							(euro di oggi) dai {lastFundPlan.startAge} ai {lastFundPlan.ritaEndAge} anni.
						{:else}
							prestazione dai {lastFundPlan.startAge} anni (50% capitale, 50% rendita).
						{/if}</span
					>
				{/if}
			</p>
		</div>
		<select
			id="series-preset"
			bind:value={seriesPresetId}
			class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
		>
			{#each ALL_SERIES_PRESETS as preset (preset.id)}
				<option value={preset.id}>{preset.label}</option>
			{/each}
		</select>
		{#if seriesPresetId === 'it-allworld'}
			<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
				Peso USA
				<input
					type="number"
					min="0"
					max="100"
					step="5"
					bind:value={allWorldUsPct}
					class="w-20 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
				/>
				%
			</label>
		{/if}
	</div>

	<!-- Periodo storico e bootstrap ricentrato -->
	<div
		class="mt-3 grid grid-cols-1 gap-3 border-t border-blue-200 pt-3 md:grid-cols-2 dark:border-blue-800"
	>
		<div>
			<label
				for="history-from"
				class="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200"
			>
				Periodo storico
			</label>
			<select
				id="history-from"
				bind:value={historyFromYear}
				class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
			>
				<option value={0}>Tutto lo storico disponibile</option>
				<option value={1991}>Dal 1991</option>
				<option value={1999}>Dal 1999 (solo era dell'euro)</option>
			</select>
			<p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
				Si usano solo anni coperti da tutte le asset class in portafoglio. Finestre corte = pochi
				anni da campionare: risultato meno affidabile.
			</p>
		</div>
		<div>
			<label class="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
				<input type="checkbox" bind:checked={recenterEnabled} class="rounded border-gray-300" />
				Ricentra sui rendimenti reali attesi
			</label>
			<p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
				Tiene la <em>forma</em> della storia (crolli, sequenze di anni negativi, legame con l'inflazione)
				ma sposta la media sulle tue ipotesi: lo storico diventa uno stress test, non una previsione.
			</p>
			{#if recenterEnabled}
				<div class="mt-2 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-200">
					<label class="flex items-center gap-1">
						Azioni
						<input
							type="number"
							step="0.5"
							min="-5"
							max="12"
							bind:value={recenterStocksPct}
							class="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
						/>
						% reale
					</label>
					<label class="flex items-center gap-1">
						Obbligazioni
						<input
							type="number"
							step="0.5"
							min="-5"
							max="8"
							bind:value={recenterBondsPct}
							class="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
						/>
						% reale
					</label>
				</div>
			{/if}
			{#if historyMeans && (historyMeans.stocks !== undefined || historyMeans.bonds !== undefined)}
				<p class="mt-1 text-xs font-medium text-gray-700 dark:text-gray-300">
					Media reale storica dell'ultima simulazione:
					{#if historyMeans.stocks !== undefined}azioni {(historyMeans.stocks * 100).toFixed(
							1
						)}%{/if}
					{#if historyMeans.bonds !== undefined}
						· obbligazioni {(historyMeans.bonds * 100).toFixed(1)}%{/if}
					(media aritmetica annua).
				</p>
			{/if}
		</div>
	</div>
</div>

<!-- Configuration Panel -->
<div class="mb-8">
	{#if paramsReady}
		<ConfigPanel
			onRun={handleRun}
			{running}
			{progress}
			{elapsedTime}
			{profileLoaded}
			seriesLabel={activePreset.label}
			seriesDescription={activePreset.description}
			defaults={simDefaults}
		/>
	{:else}
		<div class="py-10 text-center text-gray-400 dark:text-gray-500">
			Caricamento dati dal profilo…
		</div>
	{/if}
</div>

<!-- Results Section -->
{#if result}
	<div class="mb-8 space-y-8">
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

			<!-- Spesa reale in pensione (decisiva per le strategie variabili) -->
			{#if result.spending && result.spending.p50.length > 0}
				<div class="mb-8">
					<SpendingChart
						spending={result.spending}
						strategy={lastParams?.withdrawalStrategy ?? 'fixed'}
						targetExpenses={lastParams?.annualExpenses ?? 0}
						yearsToFire={lastParams?.yearsToFire ?? 0}
					/>
				</div>
			{/if}

			<!-- Verifica di robustezza per sottoperiodi -->
			{#if lastParams && lastParams.simulationMode !== 'parametric'}
				<div
					class="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
							Verifica per sottoperiodi
						</h3>
						<Button size="sm" color="light" onclick={runRobustness} disabled={robustnessRunning}>
							{robustnessRunning ? 'Calcolo in corso…' : 'Esegui la verifica'}
						</Button>
					</div>
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
						Lo stesso piano simulato su periodi storici diversi (max 5.000 iterazioni ciascuno). Se
						il successo cambia molto tra le righe, il risultato dipende dal periodo scelto: leggilo
						con prudenza.
					</p>
					{#if robustnessRows.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full text-left text-sm">
								<thead class="text-xs text-gray-500 uppercase dark:text-gray-400">
									<tr>
										<th class="py-2 pr-4">Periodo</th>
										<th class="py-2 pr-4">Anni</th>
										<th class="py-2 pr-4">Successo</th>
										{#if lastParams.withdrawalStrategy !== 'fixed'}
											<th class="py-2 pr-4">Spesa mai sotto la minima</th>
										{/if}
										<th class="py-2 pr-4">Patrimonio finale mediano</th>
									</tr>
								</thead>
								<tbody>
									{#each robustnessRows as row (row.label)}
										<tr class="border-t border-gray-100 dark:border-gray-700">
											<td class="py-2 pr-4 font-medium text-gray-900 dark:text-white"
												>{row.label}</td
											>
											{#if row.note}
												<td class="py-2 pr-4 text-gray-500" colspan="4">{row.note}</td>
											{:else if row.successRate === undefined}
												<td class="py-2 pr-4 text-gray-400" colspan="4">…</td>
											{:else}
												<td class="py-2 pr-4">{row.from}-{row.to}</td>
												<td class="py-2 pr-4">{(row.successRate * 100).toFixed(1)}%</td>
												{#if lastParams.withdrawalStrategy !== 'fixed'}
													<td class="py-2 pr-4">
														{row.floorSuccessRate !== undefined
															? `${(row.floorSuccessRate * 100).toFixed(1)}%`
															: '—'}
													</td>
												{/if}
												<td class="py-2 pr-4"
													>{Math.round(row.medianFinalValue ?? 0).toLocaleString('it-IT')} &euro;</td
												>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Histogram + Summary Table -->
			<div class="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
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
