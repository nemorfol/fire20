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
		Spinner,
		Toggle
	} from 'flowbite-svelte';
	import { InfoCircleSolid, PlaySolid } from 'flowbite-svelte-icons';
	import type { MonteCarloParams, AssetClassConfig } from '$lib/engine/monte-carlo';
	import { sp500Stats } from '$lib/data/sp500';
	import { bondStats } from '$lib/data/bonds';
	import { goldStats } from '$lib/data/gold';
	import {
		correlationMatrix as fullCorrMatrix,
		assetLabels,
		type AssetClass
	} from '$lib/data/correlations';

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
	let useCorrelation = $state(true);

	// Portfolio params
	let stockAllocation = $state(70);
	let bondAllocation = $state(30);
	let initialPortfolio = $state(200000);
	let annualContribution = $state(20000);
	let annualExpenses = $state(30000);
	let withdrawalRate = $state(4.0);
	let inflationRate = $state(2.0);

	// Multi-asset advanced mode
	let advancedMode = $state(false);
	let goldEnabled = $state(false);
	let cashEnabled = $state(false);
	let realEstateEnabled = $state(false);

	// Multi-asset allocations (%)
	let goldAllocation = $state(10);
	let cashAllocation = $state(5);
	let realEstateAllocation = $state(10);

	// Multi-asset parametric defaults
	let goldReturn = $state(6.0);
	let goldStdDevParam = $state(15.0);
	let cashReturn = $state(2.0);
	let cashStdDevParam = $state(1.0);
	let realEstateReturn = $state(7.0);
	let realEstateStdDevParam = $state(12.0);

	const iterationOptions = [
		{ value: 1000, name: '1.000 (veloce)' },
		{ value: 5000, name: '5.000 (bilanciato)' },
		{ value: 10000, name: '10.000 (raccomandato)' },
		{ value: 50000, name: '50.000 (preciso)' },
		{ value: 100000, name: '100.000 (molto preciso)' }
	];

	/** Mappa dai nomi interni alle chiavi della matrice di correlazione */
	const assetKeyMap: Record<string, AssetClass> = {
		stocks: 'usStocks',
		bonds: 'bonds',
		gold: 'gold',
		cash: 'cash',
		realEstate: 'realEstate'
	};

	/** Calcola le asset class attive in modalità avanzata */
	let activeAssetKeys = $derived.by(() => {
		const keys: string[] = ['stocks', 'bonds'];
		if (goldEnabled) keys.push('gold');
		if (cashEnabled) keys.push('cash');
		if (realEstateEnabled) keys.push('realEstate');
		return keys;
	});

	/** Etichette italiane per le asset class nel pannello */
	const localLabels: Record<string, string> = {
		stocks: 'Azioni',
		bonds: 'Obbligazioni',
		gold: 'Oro',
		cash: 'Liquidità',
		realEstate: 'Immobiliare'
	};

	/** Somma totale delle allocazioni in modalità avanzata */
	let totalAllocation = $derived.by(() => {
		if (!advancedMode) return stockAllocation + bondAllocation;
		let total = stockAllocation + bondAllocation;
		if (goldEnabled) total += goldAllocation;
		if (cashEnabled) total += cashAllocation;
		if (realEstateEnabled) total += realEstateAllocation;
		return total;
	});

	let allocationValid = $derived(Math.abs(totalAllocation - 100) < 0.01);

	/** Costruisci la sotto-matrice di correlazione per gli asset attivi */
	function buildCorrelationMatrix(keys: string[]): number[][] {
		return keys.map((rowKey) =>
			keys.map((colKey) => {
				const r = assetKeyMap[rowKey];
				const c = assetKeyMap[colKey];
				return fullCorrMatrix[r][c];
			})
		);
	}

	function handleRun() {
		if (advancedMode) {
			// Multi-asset mode
			const assetClasses: AssetClassConfig[] = [];

			// Stocks
			assetClasses.push({
				name: 'stocks',
				allocation: stockAllocation / 100,
				expectedReturn: stockReturn / 100,
				stdDev: stockStdDev / 100
			});

			// Bonds
			assetClasses.push({
				name: 'bonds',
				allocation: bondAllocation / 100,
				expectedReturn: bondReturn / 100,
				stdDev: bondStdDev / 100
			});

			if (goldEnabled) {
				assetClasses.push({
					name: 'gold',
					allocation: goldAllocation / 100,
					expectedReturn: goldReturn / 100,
					stdDev: goldStdDevParam / 100
				});
			}

			if (cashEnabled) {
				assetClasses.push({
					name: 'cash',
					allocation: cashAllocation / 100,
					expectedReturn: cashReturn / 100,
					stdDev: cashStdDevParam / 100
				});
			}

			if (realEstateEnabled) {
				assetClasses.push({
					name: 'realEstate',
					allocation: realEstateAllocation / 100,
					expectedReturn: realEstateReturn / 100,
					stdDev: realEstateStdDevParam / 100
				});
			}

			const corrMatrix = buildCorrelationMatrix(assetClasses.map((a) => a.name));

			const params: Partial<MonteCarloParams> = {
				iterations,
				simulationMode,
				yearsToFire,
				yearsInRetirement: yearsToSimulate,
				// Legacy fields for backwards compat
				stockAllocation: stockAllocation / 100,
				bondAllocation: bondAllocation / 100,
				initialPortfolio,
				annualContribution,
				annualExpenses,
				withdrawalRate: withdrawalRate / 100,
				inflationRate: inflationRate / 100,
				withdrawalStrategy: 'fixed',
				// Multi-asset fields
				assetClasses,
				correlationMatrix: corrMatrix,
				useCorrelation
			};

			if (simulationMode === 'parametric') {
				params.expectedStockReturn = stockReturn / 100;
				params.stockStdDev = stockStdDev / 100;
				params.expectedBondReturn = bondReturn / 100;
				params.bondStdDev = bondStdDev / 100;
			}

			onRun(params);
		} else {
			// Legacy 2-asset mode
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
				params.useCorrelation = useCorrelation;
			}

			onRun(params);
		}
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

		<!-- Multi-asset advanced toggle -->
		<div class="flex items-center gap-3">
			<Toggle bind:checked={advancedMode} size="small">
				Modalit&agrave; avanzata (multi-asset)
			</Toggle>
			<span id="tip-advanced">
				<InfoCircleSolid class="w-4 h-4 text-gray-400 cursor-help" />
			</span>
			<Tooltip triggeredBy="#tip-advanced" class="max-w-xs">
				Abilita la simulazione con pi&ugrave; di 2 asset class (oro, liquidit&agrave;, immobiliare) con matrice di correlazione completa NxN.
			</Tooltip>
		</div>

		{#if advancedMode}
			<div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-4">
				<p class="text-sm font-medium text-purple-800 dark:text-purple-300">
					Asset class aggiuntive
				</p>

				<!-- Asset toggles + allocations -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Toggle bind:checked={goldEnabled} size="small">Oro</Toggle>
						{#if goldEnabled}
							<div>
								<Label for="gold-alloc" class="mb-1 text-xs">Allocazione (%)</Label>
								<Input id="gold-alloc" type="number" bind:value={goldAllocation} min={0} max={100} step={5} size="sm" />
							</div>
						{/if}
					</div>
					<div class="space-y-2">
						<Toggle bind:checked={cashEnabled} size="small">Liquidit&agrave;</Toggle>
						{#if cashEnabled}
							<div>
								<Label for="cash-alloc" class="mb-1 text-xs">Allocazione (%)</Label>
								<Input id="cash-alloc" type="number" bind:value={cashAllocation} min={0} max={100} step={5} size="sm" />
							</div>
						{/if}
					</div>
					<div class="space-y-2">
						<Toggle bind:checked={realEstateEnabled} size="small">Immobiliare</Toggle>
						{#if realEstateEnabled}
							<div>
								<Label for="re-alloc" class="mb-1 text-xs">Allocazione (%)</Label>
								<Input id="re-alloc" type="number" bind:value={realEstateAllocation} min={0} max={100} step={5} size="sm" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Allocation total -->
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium" class:text-green-700={allocationValid} class:text-red-600={!allocationValid}>
						Totale allocazione: {totalAllocation}%
					</span>
					{#if !allocationValid}
						<Badge color="red">Deve essere 100%</Badge>
					{/if}
				</div>

				<!-- Parametric params for extra assets -->
				{#if simulationMode === 'parametric'}
					<div class="space-y-3">
						<p class="text-xs font-medium text-purple-700 dark:text-purple-400">
							Parametri distribuzione asset aggiuntivi
						</p>
						<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
							{#if goldEnabled}
								<div>
									<Label for="gold-ret" class="mb-1 text-xs">Rendimento oro (%)</Label>
									<Input id="gold-ret" type="number" bind:value={goldReturn} step={0.5} size="sm" />
								</div>
								<div>
									<Label for="gold-std" class="mb-1 text-xs">Volatilit&agrave; oro (%)</Label>
									<Input id="gold-std" type="number" bind:value={goldStdDevParam} step={0.5} size="sm" />
								</div>
							{/if}
							{#if cashEnabled}
								<div>
									<Label for="cash-ret" class="mb-1 text-xs">Rendimento liquidit&agrave; (%)</Label>
									<Input id="cash-ret" type="number" bind:value={cashReturn} step={0.5} size="sm" />
								</div>
								<div>
									<Label for="cash-std" class="mb-1 text-xs">Volatilit&agrave; liquidit&agrave; (%)</Label>
									<Input id="cash-std" type="number" bind:value={cashStdDevParam} step={0.5} size="sm" />
								</div>
							{/if}
							{#if realEstateEnabled}
								<div>
									<Label for="re-ret" class="mb-1 text-xs">Rendimento immobiliare (%)</Label>
									<Input id="re-ret" type="number" bind:value={realEstateReturn} step={0.5} size="sm" />
								</div>
								<div>
									<Label for="re-std" class="mb-1 text-xs">Volatilit&agrave; immobiliare (%)</Label>
									<Input id="re-std" type="number" bind:value={realEstateStdDevParam} step={0.5} size="sm" />
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Correlation matrix (read-only) -->
				{#if activeAssetKeys.length > 2}
					<div class="space-y-2">
						<p class="text-xs font-medium text-purple-700 dark:text-purple-400">
							Matrice di correlazione (dati storici 1970-2024)
						</p>
						<div class="overflow-x-auto">
							<table class="text-xs border-collapse">
								<thead>
									<tr>
										<th class="p-1.5 text-left"></th>
										{#each activeAssetKeys as key}
											<th class="p-1.5 text-center font-medium text-purple-800 dark:text-purple-300">{localLabels[key]}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each activeAssetKeys as rowKey}
										<tr>
											<td class="p-1.5 font-medium text-purple-800 dark:text-purple-300">{localLabels[rowKey]}</td>
											{#each activeAssetKeys as colKey}
												{@const val = fullCorrMatrix[assetKeyMap[rowKey]][assetKeyMap[colKey]]}
												<td
													class="p-1.5 text-center tabular-nums"
													class:font-bold={rowKey === colKey}
													class:text-green-700={val > 0.3 && rowKey !== colKey}
													class:text-red-600={val < -0.05}
													class:text-gray-600={val >= -0.05 && val <= 0.3 && rowKey !== colKey}
												>
													{val.toFixed(3)}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		{/if}

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
				<div class="mt-3 flex items-center gap-2">
					<Toggle bind:checked={useCorrelation} size="small">
						Rendimenti correlati
					</Toggle>
					<span id="tip-correlation">
						<InfoCircleSolid class="w-4 h-4 text-gray-400 cursor-help" />
					</span>
					<Tooltip triggeredBy="#tip-correlation" class="max-w-xs">
						Usa la decomposizione di Cholesky per generare rendimenti azionari e obbligazionari correlati (correlazione storica ~0.189). Disattivando questa opzione i rendimenti vengono generati in modo indipendente, sottostimando il rischio reale del portafoglio.
					</Tooltip>
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
					{#if advancedMode && goldEnabled}
						<div>
							<span class="font-medium">Oro (1971-2024):</span>
							media {goldStats.mean}%, dev.std {goldStats.stdDev}%
						</div>
					{/if}
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
				disabled={running || (advancedMode && !allocationValid)}
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
