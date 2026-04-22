<script lang="ts">
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Card,
		Label,
		Input,
		Badge,
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Alert
	} from 'flowbite-svelte';
	import {
		InfoCircleSolid,
		CheckCircleSolid,
		ChevronDownOutline,
		ChevronUpOutline
	} from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import { formatCurrency, formatCompact, formatPercent } from '$lib/utils/format';
	import {
		compareContainers,
		type ContainerInput,
		type ContainerResult,
		type ContainerId
	} from '$lib/engine/container-comparison';

	// --- Parametri (Svelte 5 runes) ---
	let monthlyContribution = $state(400);
	let years = $state(20);
	let expectedReturnPct = $state(5); // gestito come percentuale per il PercentInput
	let marginalIrpefPct = $state(35);
	let retirementAge = $state(67);
	let inflationPct = $state(2);

	// Stato UI: quale dettaglio e' aperto
	let openDetailId = $state<ContainerId | null>(null);

	// Parametri derivati in forma "motore" (decimali)
	let engineInput = $derived<ContainerInput>({
		monthlyContribution,
		years,
		expectedReturn: expectedReturnPct / 100,
		marginalIRPEF: marginalIrpefPct / 100,
		annualInflation: inflationPct / 100,
		retirementAge
	});

	// Risultati del confronto, ricalcolati quando cambia un parametro
	let results = $derived<ContainerResult[]>(compareContainers(engineInput));

	// Contenitore vincente (netto finale piu' alto)
	let winnerId = $derived<ContainerId | null>(
		results.length > 0
			? results.reduce((best, r) => (r.netFinal > best.netFinal ? r : best), results[0]).id
			: null
	);

	// Colori per i 4 contenitori
	const containerColors: Record<ContainerId, string> = {
		etf: '#3b82f6', // blue-500
		pensionFund: '#10b981', // emerald-500
		tfr: '#f59e0b', // amber-500
		btp: '#8b5cf6' // violet-500
	};

	// Opzioni ECharts per il bar chart dei netti finali
	let chartOptions = $derived({
		tooltip: {
			trigger: 'axis' as const,
			axisPointer: { type: 'shadow' as const },
			formatter: (params: Array<{ name: string; value: number; color: string }>) => {
				if (!params || params.length === 0) return '';
				const p = params[0];
				return `<strong>${p.name}</strong><br/>Netto finale: ${formatCurrency(p.value)}`;
			}
		},
		grid: { left: 60, right: 20, top: 30, bottom: 40, containLabel: true },
		xAxis: {
			type: 'category' as const,
			data: results.map((r) => r.label),
			axisLabel: { interval: 0, rotate: 0, fontSize: 11 }
		},
		yAxis: {
			type: 'value' as const,
			axisLabel: {
				formatter: (v: number) => formatCompact(v) + ' EUR'
			}
		},
		series: [
			{
				type: 'bar' as const,
				data: results.map((r) => ({
					value: Math.round(r.netFinal),
					itemStyle: {
						color: containerColors[r.id],
						borderRadius: [6, 6, 0, 0]
					}
				})),
				label: {
					show: true,
					position: 'top' as const,
					formatter: (p: { value: number }) => formatCompact(p.value) + ' EUR',
					fontSize: 12,
					fontWeight: 'bold' as const
				},
				barMaxWidth: 70
			}
		]
	});

	function toggleDetail(id: ContainerId) {
		openDetailId = openDetailId === id ? null : id;
	}

	// Totale tasse per contenitore (helper per tabella)
	function totalTaxes(r: ContainerResult): number {
		return r.taxesDuringAccumulation + r.taxesOnExit;
	}
</script>

<svelte:head>
	<title>Contenitori fiscali - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Contenitori fiscali</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Contenitori fiscali</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-6">
	Confronta ETF, fondo pensione, TFR e BTP a parita' di contributo mensile per vedere quale
	strumento rende di piu' dopo le tasse nel tuo profilo fiscale.
</p>

<!-- Parametri -->
<Card class="max-w-none mb-6">
	<Heading tag="h4" class="text-lg mb-4">Parametri</Heading>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
		<CurrencyInput
			bind:value={monthlyContribution}
			label="Contributo mensile"
			id="monthly"
			step={50}
			min={0}
			max={10000}
		/>
		<div>
			<Label for="years" class="mb-2">Anni di accumulo</Label>
			<Input
				id="years"
				type="number"
				bind:value={years}
				min={1}
				max={60}
				step={1}
			/>
		</div>
		<PercentInput
			bind:value={expectedReturnPct}
			label="Rendimento atteso annuo lordo"
			id="expReturn"
			min={0}
			max={20}
			step={0.5}
		/>
		<PercentInput
			bind:value={marginalIrpefPct}
			label="Aliquota IRPEF marginale"
			id="irpef"
			min={0}
			max={50}
			step={1}
		/>
		<div>
			<Label for="retAge" class="mb-2">Eta' al pensionamento</Label>
			<Input
				id="retAge"
				type="number"
				bind:value={retirementAge}
				min={50}
				max={80}
				step={1}
			/>
		</div>
		<PercentInput
			bind:value={inflationPct}
			label="Inflazione attesa"
			id="infl"
			min={0}
			max={10}
			step={0.5}
		/>
	</div>

	<Alert color="blue" class="mt-4">
		{#snippet icon()}
			<InfoCircleSolid class="w-4 h-4" />
		{/snippet}
		Contributo totale: <strong>{formatCurrency(monthlyContribution * 12 * years)}</strong>
		in {years} anni ({formatCurrency(monthlyContribution)}/mese).
		Il confronto usa le stesse cifre lorde per tutti i contenitori.
	</Alert>
</Card>

<!-- Risultati: tabella + grafico -->
<Card class="max-w-none mb-6">
	<Heading tag="h4" class="text-lg mb-4">Risultati</Heading>

	<div class="overflow-x-auto">
		<Table striped>
			<TableHead>
				<TableHeadCell>Contenitore</TableHeadCell>
				<TableHeadCell class="text-right">Contributi versati</TableHeadCell>
				<TableHeadCell class="text-right">Rendimenti lordi</TableHeadCell>
				<TableHeadCell class="text-right">Tasse totali</TableHeadCell>
				<TableHeadCell class="text-right">Beneficio deduzione</TableHeadCell>
				<TableHeadCell class="text-right">Netto finale</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each results as r (r.id)}
					<TableBodyRow>
						<TableBodyCell>
							<div class="flex items-center gap-2">
								<span
									class="inline-block w-3 h-3 rounded-full"
									style="background-color: {containerColors[r.id]}"
								></span>
								<span class="font-medium">{r.label}</span>
								{#if r.id === winnerId}
									<Badge color="green" class="ml-1">
										<CheckCircleSolid class="w-3 h-3 mr-1" />
										Vincente
									</Badge>
								{/if}
							</div>
						</TableBodyCell>
						<TableBodyCell class="text-right">{formatCurrency(r.contributionsTotal)}</TableBodyCell>
						<TableBodyCell class="text-right text-gray-600 dark:text-gray-300">
							{formatCurrency(r.grossReturns)}
						</TableBodyCell>
						<TableBodyCell class="text-right text-red-600 dark:text-red-400">
							{formatCurrency(totalTaxes(r))}
						</TableBodyCell>
						<TableBodyCell class="text-right text-emerald-600 dark:text-emerald-400">
							{r.taxBenefitDeduction > 0 ? formatCurrency(r.taxBenefitDeduction) : '—'}
						</TableBodyCell>
						<TableBodyCell
							class="text-right font-semibold {r.id === winnerId
								? 'text-emerald-700 dark:text-emerald-300'
								: 'text-gray-900 dark:text-white'}"
						>
							{formatCurrency(r.netFinal)}
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>

	<!-- Bar chart -->
	<div class="mt-6">
		<EChart options={chartOptions} height="340px" />
	</div>
</Card>

<!-- Dettaglio espandibile per ogni contenitore -->
<Card class="max-w-none mb-6">
	<Heading tag="h4" class="text-lg mb-4">Dettaglio per contenitore</Heading>
	<div class="space-y-3">
		{#each results as r (r.id)}
			{@const isOpen = openDetailId === r.id}
			<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
				<button
					type="button"
					class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					onclick={() => toggleDetail(r.id)}
					aria-expanded={isOpen}
				>
					<div class="flex items-center gap-3">
						<span
							class="inline-block w-4 h-4 rounded-full"
							style="background-color: {containerColors[r.id]}"
						></span>
						<span class="font-semibold text-gray-900 dark:text-white">{r.label}</span>
						{#if r.id === winnerId}
							<Badge color="green">Vincente</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm font-semibold text-gray-900 dark:text-white">
							{formatCurrency(r.netFinal)}
						</span>
						{#if isOpen}
							<ChevronUpOutline class="w-4 h-4 text-gray-500" />
						{:else}
							<ChevronDownOutline class="w-4 h-4 text-gray-500" />
						{/if}
					</div>
				</button>

				{#if isOpen}
					<div class="px-4 py-4 bg-white dark:bg-gray-900">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
							<div class="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1">
								<span class="text-gray-500 dark:text-gray-400">Contributi versati</span>
								<span class="font-medium">{formatCurrency(r.contributionsTotal)}</span>
							</div>
							<div class="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1">
								<span class="text-gray-500 dark:text-gray-400">Rendimenti lordi</span>
								<span class="font-medium">{formatCurrency(r.grossReturns)}</span>
							</div>
							<div class="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1">
								<span class="text-gray-500 dark:text-gray-400">Tasse durante accumulo</span>
								<span class="font-medium text-red-600 dark:text-red-400">
									{r.taxesDuringAccumulation > 0 ? formatCurrency(r.taxesDuringAccumulation) : '—'}
								</span>
							</div>
							<div class="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1">
								<span class="text-gray-500 dark:text-gray-400">Tasse all'uscita</span>
								<span class="font-medium text-red-600 dark:text-red-400">
									{r.taxesOnExit > 0 ? formatCurrency(r.taxesOnExit) : '—'}
								</span>
							</div>
							<div class="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1">
								<span class="text-gray-500 dark:text-gray-400">Beneficio deduzione</span>
								<span class="font-medium text-emerald-600 dark:text-emerald-400">
									{r.taxBenefitDeduction > 0 ? formatCurrency(r.taxBenefitDeduction) : '—'}
								</span>
							</div>
							<div class="flex justify-between py-1">
								<span class="text-gray-900 dark:text-white font-semibold">Netto finale</span>
								<span class="font-bold text-emerald-700 dark:text-emerald-300">
									{formatCurrency(r.netFinal)}
								</span>
							</div>
						</div>
						<Alert color="gray" class="mt-4">
							{#snippet icon()}
								<InfoCircleSolid class="w-4 h-4" />
							{/snippet}
							<span class="text-sm">{r.notes}</span>
						</Alert>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<Alert color="yellow" class="mt-4">
		{#snippet icon()}
			<InfoCircleSolid class="w-4 h-4" />
		{/snippet}
		<span class="text-sm">
			<strong>Note metodologiche:</strong> il beneficio della deduzione del fondo pensione
			(fino a 5.300€/anno × aliquota marginale) non e' sommato al netto finale perche'
			arriva in busta paga anno per anno e puo' essere reinvestito separatamente
			(attuale effettivo ~{formatPercent(marginalIrpefPct)} del versato).
			Il confronto assume stesso rendimento lordo atteso per ETF, Fondo Pensione e BTP;
			in pratica ETF/Fondo investono in azioni/obbligazioni miste mentre i BTP rendono meno.
		</span>
	</Alert>
</Card>
