<script lang="ts">
	import {
		Card, Label, Input, Select, Button, Badge, Toggle, Alert,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell,
		Tabs, TabItem
	} from 'flowbite-svelte';
	import { ArrowRightOutline, ChartMixedDollarSolid, InfoCircleSolid } from 'flowbite-svelte-icons';
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import {
		compareAllStrategies,
		simulatePayout,
		type PayoutSimulationParams,
		type PayoutSimulationResult,
		type PayoutStrategy
	} from '$lib/engine/pension-fund';

	let montante = $state(200000);
	let contributionsBase = $state(150000);
	let age = $state(67);
	let gender = $state<'M' | 'F'>('M');
	let yearsInFund = $state(25);
	let expectedReturnRate = $state(3);
	let inflationRate = $state(2);
	let reversibile = $state(false);
	let capitalPercentage = $state(50);
	/** Rivalutazione annua della rendita vitalizia. Configurabile perche'
	 * varia molto tra fondi e prodotti assicurativi (0% tasso fisso,
	 * 1-2% gestione separata standard, indicizzati ISTAT rari). */
	let annuityRevaluationPct = $state(1.5);

	let results = $state<PayoutSimulationResult[]>([]);
	let selectedStrategy = $state<PayoutStrategy | null>(null);
	let computed = $state(false);

	function runSimulation() {
		const params: PayoutSimulationParams = {
			montante,
			age,
			gender,
			yearsInFund,
			expectedReturnRate: expectedReturnRate / 100,
			inflationRate: inflationRate / 100,
			reversibile,
			capitalPercentage,
			contributionsBase,
			annuityRevaluationRate: annuityRevaluationPct / 100
		};
		results = compareAllStrategies(params);
		selectedStrategy = null;
		computed = true;
	}

	let selectedResult = $derived(
		selectedStrategy ? results.find(r => r.strategy === selectedStrategy) : null
	);

	let bestStrategy = $derived(() => {
		if (results.length === 0) return null;
		return results.reduce((best, r) => r.totalNetReceived > best.totalNetReceived ? r : best, results[0]);
	});

	let comparisonChartOptions = $derived(() => {
		if (results.length === 0) return {};
		return {
			tooltip: { trigger: 'axis' as const },
			legend: { data: ['Netto Totale', 'Tasse Pagate'] },
			xAxis: {
				type: 'category' as const,
				data: results.map(r => r.strategyName),
				axisLabel: { rotate: 20, fontSize: 11 }
			},
			yAxis: {
				type: 'value' as const,
				axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` }
			},
			series: [
				{
					name: 'Netto Totale',
					type: 'bar' as const,
					data: results.map(r => r.totalNetReceived),
					itemStyle: { color: '#10b981' }
				},
				{
					name: 'Tasse Pagate',
					type: 'bar' as const,
					data: results.map(r => r.totalTaxPaid),
					itemStyle: { color: '#ef4444' }
				}
			]
		};
	});

	let detailChartOptions = $derived(() => {
		if (!selectedResult) return {};
		const payouts = selectedResult.yearlyPayouts;
		return {
			tooltip: { trigger: 'axis' as const },
			legend: { data: ['Netto Annuo', 'Capitale Residuo'] },
			xAxis: {
				type: 'category' as const,
				data: payouts.map(p => `Anno ${p.year}`)
			},
			yAxis: [
				{
					type: 'value' as const,
					name: 'EUR/anno',
					axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` }
				},
				{
					type: 'value' as const,
					name: 'Capitale',
					axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` }
				}
			],
			series: [
				{
					name: 'Netto Annuo',
					type: 'bar' as const,
					data: payouts.map(p => p.net),
					itemStyle: { color: '#10b981' }
				},
				{
					name: 'Capitale Residuo',
					type: 'line' as const,
					yAxisIndex: 1,
					data: payouts.map(p => p.remainingCapital),
					itemStyle: { color: '#3b82f6' },
					areaStyle: { opacity: 0.1 }
				}
			]
		};
	});

	function strategyColor(strategy: PayoutStrategy): 'green' | 'blue' | 'purple' | 'yellow' | 'red' {
		switch (strategy) {
			case 'prelievi-liberi': return 'green';
			case 'durata-definita': return 'blue';
			case 'vitalizia': return 'purple';
			case 'capitale-60': return 'yellow';
			case 'frazionata': return 'red';
		}
	}

	const genderOptions = [
		{ value: 'M', name: 'Uomo' },
		{ value: 'F', name: 'Donna' }
	];
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Parametri della Simulazione
	</h3>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
		<div>
			<Label for="montante" class="mb-1">Montante accumulato (EUR)</Label>
			<Input id="montante" type="number" bind:value={montante} min={1000} step={1000} />
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Valore totale del fondo a fine accumulo (contributi + TFR + rendimenti).
			</p>
		</div>
		<div>
			<Label for="contributionsBase" class="mb-1">Contributi versati + TFR (base imponibile)</Label>
			<Input id="contributionsBase" type="number" bind:value={contributionsBase} min={0} step={1000} max={montante} />
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Solo questa quota e' tassata al 15%-9% in prestazione. I rendimenti sono gia'
				stati tassati al 20% durante l'accumulo e non subiscono ulteriore tassazione.
			</p>
		</div>
		<div>
			<Label for="age" class="mb-1">Eta' al pensionamento</Label>
			<Input id="age" type="number" bind:value={age} min={57} max={75} />
		</div>
		<div>
			<Label for="gender" class="mb-1">Genere</Label>
			<Select id="gender" items={genderOptions} bind:value={gender} />
		</div>
		<div>
			<Label for="yearsInFund" class="mb-1">Anni nel fondo pensione</Label>
			<Input id="yearsInFund" type="number" bind:value={yearsInFund} min={1} max={50} />
		</div>
		<div>
			<Label for="returnRate" class="mb-1">Rendimento atteso (%)</Label>
			<Input id="returnRate" type="number" bind:value={expectedReturnRate} min={0} max={10} step={0.5} />
		</div>
		<div>
			<Label for="inflation" class="mb-1">Inflazione attesa (%)</Label>
			<Input id="inflation" type="number" bind:value={inflationRate} min={0} max={10} step={0.5} />
		</div>
		<div>
			<Label for="capitalPct" class="mb-1">% in capitale (per opzione mista)</Label>
			<Input id="capitalPct" type="number" bind:value={capitalPercentage} min={0} max={60} step={5} />
		</div>
		<div>
			<Label for="annuityReval" class="mb-1">Rivalutazione rendita vitalizia (%/anno)</Label>
			<Input id="annuityReval" type="number" bind:value={annuityRevaluationPct} min={0} max={5} step={0.1} />
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				0% = rendita fissa. 1-2% = gestione separata standard. Dipende dal fondo/compagnia (vedi sotto).
			</p>
		</div>
		<div class="flex items-end">
			<Toggle bind:checked={reversibile}>Rendita reversibile al coniuge</Toggle>
		</div>
	</div>

	<Alert color="yellow" class="mb-4">
		{#snippet icon()}
			<InfoCircleSolid class="w-5 h-5" />
		{/snippet}
		<span class="font-semibold">La rendita vitalizia e' una giungla.</span>
		Ogni fondo pensione ha convenzioni diverse con la compagnia assicurativa, e ogni prodotto ha
		caratteristiche proprie: tasso di rivalutazione, spread trattenuto (tipicamente 1-1,5%),
		eventuali garanzie di minimo, coefficienti di conversione. Le stime qui mostrate sono
		<strong>indicative</strong>: per avere numeri precisi chiedi al tuo fondo il
		<em>prospetto informativo</em> e la <em>nota informativa sulle prestazioni</em>, poi
		inserisci nel campo sopra il tasso di rivalutazione effettivo del tuo prodotto.
	</Alert>

	<Button color="primary" onclick={runSimulation} class="w-full md:w-auto">
		<ChartMixedDollarSolid class="w-4 h-4 me-2" />
		Confronta Tutte le Strategie
	</Button>
</div>

{#if computed && results.length > 0}
	<!-- Grafico di confronto -->
	<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			Confronto Strategie di Erogazione
		</h3>
		<EChart options={comparisonChartOptions()} height="350px" />
	</div>

	<!-- Card per ogni strategia -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
		{#each results as result}
			{@const isBest = bestStrategy()?.strategy === result.strategy}
			<Card
				class="cursor-pointer transition-all hover:shadow-lg {selectedStrategy === result.strategy ? 'ring-2 ring-primary-500' : ''} {isBest ? 'ring-2 ring-green-500' : ''}"
				onclick={() => { selectedStrategy = result.strategy; }}
			>
				<div class="flex items-center justify-between mb-3">
					<h4 class="font-semibold text-gray-900 dark:text-white">
						{result.strategyName}
					</h4>
					<div class="flex gap-1">
						{#if isBest}
							<Badge color="green">Migliore</Badge>
						{/if}
						<Badge color={strategyColor(result.strategy)}>{formatPercent(result.taxRate * 100)}</Badge>
					</div>
				</div>

				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Media mensile netta</span>
						<span class="font-semibold text-green-600 dark:text-green-400">{formatCurrency(result.monthlyNetAverage)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Totale netto ricevuto</span>
						<span class="font-semibold">{formatCurrency(result.totalNetReceived)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Tasse pagate</span>
						<span class="text-red-600 dark:text-red-400">{formatCurrency(result.totalTaxPaid)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Durata</span>
						<span>{result.duration} anni</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Capitale agli eredi</span>
						<span>{result.capitalToHeirs > 0 ? formatCurrency(result.capitalToHeirs) : 'Nessuno'}</span>
					</div>
				</div>

				<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
					<p class="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Vantaggi:</p>
					<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
						{#each result.pros.slice(0, 2) as pro}
							<li>+ {pro}</li>
						{/each}
					</ul>
					<p class="text-xs font-semibold text-red-600 dark:text-red-400 mt-1 mb-1">Svantaggi:</p>
					<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
						{#each result.cons.slice(0, 2) as con}
							<li>- {con}</li>
						{/each}
					</ul>
				</div>

				<Button size="xs" color="alternative" class="mt-3 w-full" onclick={() => { selectedStrategy = result.strategy; }}>
					Dettaglio anno per anno <ArrowRightOutline class="w-3 h-3 ms-1" />
				</Button>
			</Card>
		{/each}
	</div>

	<!-- Dettaglio strategia selezionata -->
	{#if selectedResult}
		<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
				Dettaglio: {selectedResult.strategyName}
			</h3>

			<EChart options={detailChartOptions()} height="350px" class="mb-4" />

			<div class="overflow-x-auto">
				<Table striped>
					<TableHead>
						<TableHeadCell>Anno</TableHeadCell>
						<TableHeadCell>Lordo</TableHeadCell>
						<TableHeadCell>Tasse</TableHeadCell>
						<TableHeadCell>Netto</TableHeadCell>
						<TableHeadCell>Netto/mese</TableHeadCell>
						<TableHeadCell>Capitale residuo</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each selectedResult.yearlyPayouts as payout}
							<TableBodyRow>
								<TableBodyCell>{payout.year}</TableBodyCell>
								<TableBodyCell>{formatCurrency(payout.gross)}</TableBodyCell>
								<TableBodyCell class="text-red-600 dark:text-red-400">{formatCurrency(payout.tax)}</TableBodyCell>
								<TableBodyCell class="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(payout.net)}</TableBodyCell>
								<TableBodyCell>{formatCurrency(Math.round(payout.net / 12))}</TableBodyCell>
								<TableBodyCell>{formatCurrency(payout.remainingCapital)}</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</div>

			<!-- Pro e Contro completi -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
				<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h4 class="font-semibold text-green-700 dark:text-green-400 mb-2">Vantaggi</h4>
					<ul class="text-sm text-green-600 dark:text-green-300 space-y-1">
						{#each selectedResult.pros as pro}
							<li>+ {pro}</li>
						{/each}
					</ul>
				</div>
				<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
					<h4 class="font-semibold text-red-700 dark:text-red-400 mb-2">Svantaggi</h4>
					<ul class="text-sm text-red-600 dark:text-red-300 space-y-1">
						{#each selectedResult.cons as con}
							<li>- {con}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}
{/if}
