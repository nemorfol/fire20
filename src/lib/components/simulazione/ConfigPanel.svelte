<script lang="ts">
	import {
		Card,
		Label,
		Select,
		Input,
		Button,
		Radio,
		Helper,
		Tooltip,
		Badge,
		Spinner
	} from 'flowbite-svelte';
	import { InfoCircleSolid, PlaySolid } from 'flowbite-svelte-icons';
	import type { MonteCarloParams } from '$lib/engine/monte-carlo';
	import { sp500Stats } from '$lib/data/sp500';
	import { bondStats } from '$lib/data/bonds';

	let {
		onRun,
		running = false,
		progress = 0,
		elapsedTime = 0,
		profileLoaded = false
	}: {
		onRun: (params: Partial<MonteCarloParams>) => void;
		running?: boolean;
		progress?: number;
		elapsedTime?: number;
		profileLoaded?: boolean;
	} = $props();

	// Configuration state
	let iterations = $state(10000);
	let simulationMode = $state<'parametric' | 'historical' | 'block-bootstrap'>('historical');
	let yearsToSimulate = $state(30);
	let yearsToFire = $state(10);

	// Parametric params
	let stockReturn = $state(7.0);
	let stockStdDev = $state(16.0);
	let bondReturn = $state(3.5);
	let bondStdDev = $state(7.0);

	// Portfolio params
	let stockAllocation = $state(70);
	let bondAllocation = $state(30);
	let initialPortfolio = $state(200000);
	let annualContribution = $state(20000);
	let annualExpenses = $state(30000);
	let withdrawalRate = $state(4.0);
	let inflationRate = $state(2.0);

	const iterationOptions = [
		{ value: 1000, name: '1.000 (veloce)' },
		{ value: 5000, name: '5.000 (bilanciato)' },
		{ value: 10000, name: '10.000 (raccomandato)' },
		{ value: 50000, name: '50.000 (preciso)' },
		{ value: 100000, name: '100.000 (molto preciso)' }
	];

	function handleRun() {
		const params: Partial<MonteCarloParams> = {
			iterations,
			simulationMode,
			yearsToFire,
			yearsInRetirement: yearsToSimulate,
			stockAllocation: stockAllocation / 100,
			bondAllocation: bondAllocation / 100,
			initialPortfolio,
			annualContribution,
			annualExpenses,
			withdrawalRate: withdrawalRate / 100,
			inflationRate: inflationRate / 100,
			withdrawalStrategy: 'fixed'
		};

		if (simulationMode === 'parametric') {
			params.expectedStockReturn = stockReturn / 100;
			params.stockStdDev = stockStdDev / 100;
			params.expectedBondReturn = bondReturn / 100;
			params.bondStdDev = bondStdDev / 100;
		}

		onRun(params);
	}

	let formattedElapsed = $derived.by(() => {
		const secs = Math.floor(elapsedTime / 1000);
		const ms = elapsedTime % 1000;
		if (secs > 0) return `${secs},${Math.floor(ms / 100)}s`;
		return `${ms}ms`;
	});
</script>

<Card class="max-w-none">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Configurazione Simulazione
	</h3>

	<div class="space-y-5">
		<!-- Portfolio Parameters -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			<div>
				<Label for="initial-portfolio" class="mb-2">Portafoglio iniziale (&euro;)</Label>
				<Input
					id="initial-portfolio"
					type="number"
					bind:value={initialPortfolio}
					min={0}
					step={10000}
				/>
			</div>
			<div>
				<Label for="annual-contribution" class="mb-2">Contributo annuale (&euro;)</Label>
				<Input
					id="annual-contribution"
					type="number"
					bind:value={annualContribution}
					min={0}
					step={1000}
				/>
			</div>
			<div>
				<Label for="annual-expenses" class="mb-2">Spese annuali in pensione (&euro;)</Label>
				<Input
					id="annual-expenses"
					type="number"
					bind:value={annualExpenses}
					min={0}
					step={1000}
				/>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div>
				<Label for="stock-alloc" class="mb-2">Allocazione azioni (%)</Label>
				<Input
					id="stock-alloc"
					type="number"
					bind:value={stockAllocation}
					min={0}
					max={100}
					step={5}
				/>
			</div>
			<div>
				<Label for="bond-alloc" class="mb-2">Allocazione obbligazioni (%)</Label>
				<Input
					id="bond-alloc"
					type="number"
					bind:value={bondAllocation}
					min={0}
					max={100}
					step={5}
				/>
			</div>
			<div>
				<Label for="withdrawal-rate" class="mb-2">Tasso di prelievo (%)</Label>
				<Input
					id="withdrawal-rate"
					type="number"
					bind:value={withdrawalRate}
					min={1}
					max={10}
					step={0.5}
				/>
			</div>
			<div>
				<Label for="inflation-rate" class="mb-2">Inflazione (%)</Label>
				<Input
					id="inflation-rate"
					type="number"
					bind:value={inflationRate}
					min={0}
					max={10}
					step={0.5}
				/>
			</div>
		</div>

		<hr class="border-gray-200 dark:border-gray-700" />

		<!-- Simulation Parameters -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div>
				<Label for="iterations" class="mb-2">Numero di iterazioni</Label>
				<Select id="iterations" bind:value={iterations} items={iterationOptions} />
			</div>
			<div>
				<Label for="years-to-fire" class="mb-2">Anni di accumulazione</Label>
				<Input
					id="years-to-fire"
					type="number"
					bind:value={yearsToFire}
					min={0}
					max={50}
				/>
			</div>
			<div>
				<Label for="years-retire" class="mb-2">Anni in pensione</Label>
				<Input
					id="years-retire"
					type="number"
					bind:value={yearsToSimulate}
					min={5}
					max={60}
				/>
			</div>
		</div>

		<!-- Simulation Mode -->
		<div>
			<Label class="mb-3 block text-sm font-medium">Modalit&agrave; di simulazione</Label>
			<div class="flex flex-wrap gap-4">
				<div class="flex items-center gap-2">
					<Radio
						name="sim-mode"
						value="parametric"
						bind:group={simulationMode}
					>
						Parametrica
					</Radio>
					<span id="tip-parametric">
						<InfoCircleSolid class="w-4 h-4 text-gray-400 cursor-help" />
					</span>
					<Tooltip triggeredBy="#tip-parametric" class="max-w-xs">
						Genera rendimenti casuali da distribuzioni statistiche (log-normale per azioni, normale per obbligazioni). Permette di specificare rendimento medio e volatilit&agrave;.
					</Tooltip>
				</div>
				<div class="flex items-center gap-2">
					<Radio
						name="sim-mode"
						value="historical"
						bind:group={simulationMode}
					>
						Bootstrap Storico
					</Radio>
					<span id="tip-historical">
						<InfoCircleSolid class="w-4 h-4 text-gray-400 cursor-help" />
					</span>
					<Tooltip triggeredBy="#tip-historical" class="max-w-xs">
						Campiona casualmente dai rendimenti storici reali (S&P 500 e Treasury Bond dal 1928). Cattura la distribuzione reale dei rendimenti.
					</Tooltip>
				</div>
				<div class="flex items-center gap-2">
					<Radio
						name="sim-mode"
						value="block-bootstrap"
						bind:group={simulationMode}
					>
						Block Bootstrap
					</Radio>
					<span id="tip-block">
						<InfoCircleSolid class="w-4 h-4 text-gray-400 cursor-help" />
					</span>
					<Tooltip triggeredBy="#tip-block" class="max-w-xs">
						Campiona blocchi consecutivi di 5 anni dai dati storici, preservando le autocorrelazioni temporali e i cicli di mercato.
					</Tooltip>
				</div>
			</div>
		</div>

		<!-- Parametric mode inputs -->
		{#if simulationMode === 'parametric'}
			<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
				<p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
					Parametri distribuzione
				</p>
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<Label for="stock-ret" class="mb-1 text-xs">Rendimento azioni (%)</Label>
						<Input id="stock-ret" type="number" bind:value={stockReturn} step={0.5} size="sm" />
					</div>
					<div>
						<Label for="stock-std" class="mb-1 text-xs">Volatilit&agrave; azioni (%)</Label>
						<Input id="stock-std" type="number" bind:value={stockStdDev} step={0.5} size="sm" />
					</div>
					<div>
						<Label for="bond-ret" class="mb-1 text-xs">Rendimento bond (%)</Label>
						<Input id="bond-ret" type="number" bind:value={bondReturn} step={0.5} size="sm" />
					</div>
					<div>
						<Label for="bond-std" class="mb-1 text-xs">Volatilit&agrave; bond (%)</Label>
						<Input id="bond-std" type="number" bind:value={bondStdDev} step={0.5} size="sm" />
					</div>
				</div>
			</div>
		{:else}
			<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
				<p class="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
					Dati storici utilizzati
				</p>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-emerald-700 dark:text-emerald-400">
					<div>
						<span class="font-medium">S&P 500 (1928-2024):</span>
						media {sp500Stats.mean}%, dev.std {sp500Stats.stdDev}%
					</div>
					<div>
						<span class="font-medium">Treasury Bond (1928-2024):</span>
						media {bondStats.mean}%, dev.std {bondStats.stdDev}%
					</div>
				</div>
				{#if simulationMode === 'block-bootstrap'}
					<p class="text-xs text-emerald-600 dark:text-emerald-500 mt-2">
						Blocchi di 5 anni consecutivi per preservare le autocorrelazioni.
					</p>
				{/if}
			</div>
		{/if}

		<hr class="border-gray-200 dark:border-gray-700" />

		<!-- Run Button + Progress -->
		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
			<Button
				color="primary"
				size="lg"
				class="px-8"
				disabled={running}
				onclick={handleRun}
			>
				{#if running}
					<Spinner size="4" class="me-2" />
					Simulazione in corso...
				{:else}
					<PlaySolid class="w-4 h-4 me-2" />
					Avvia Simulazione
				{/if}
			</Button>

			{#if running}
				<div class="flex-1 w-full sm:w-auto">
					<div class="flex items-center justify-between mb-1">
						<span class="text-sm font-medium text-primary-700 dark:text-primary-400">
							Progresso: {Math.round(progress)}%
						</span>
						<span class="text-xs text-gray-500 dark:text-gray-400">
							{formattedElapsed}
						</span>
					</div>
					<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
						<div
							class="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-out"
							style="width: {progress}%"
						></div>
					</div>
				</div>
			{/if}
		</div>

		{#if !running && iterations >= 50000}
			<Helper class="text-yellow-600 dark:text-yellow-400">
				Con {iterations.toLocaleString('it-IT')} iterazioni la simulazione potrebbe richiedere qualche secondo.
			</Helper>
		{/if}
	</div>
</Card>
