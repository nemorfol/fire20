<script lang="ts">
	import { Card, Badge, Button, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';
	import type { Profile, Scenario, SimulationResult } from '$lib/db/index';
	import { calculateFireNumber, calculateYearsToFire, calculateNetWorth } from '$lib/engine/fire-calculator';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import EChart from '$lib/components/simulazione/EChart.svelte';

	let {
		scenarios = [] as Scenario[],
		profiles = [] as Profile[],
		results = [] as SimulationResult[],
		onClose
	}: {
		scenarios: Scenario[];
		profiles: Profile[];
		results: SimulationResult[];
		onClose: () => void;
	} = $props();

	const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
	const TYPE_LABELS: Record<string, string> = {
		optimistic: 'Ottimistico',
		pessimistic: 'Pessimistico',
		custom: 'Personalizzato',
		historical: 'Storico'
	};

	function getProfile(profileId: number): Profile | undefined {
		return profiles.find((p) => p.id === profileId);
	}

	function getResult(scenarioId: number): SimulationResult | undefined {
		return results.find((r) => r.scenarioId === scenarioId);
	}

	/** Resolve an effective value from scenario overrides or base profile. */
	function getEffective(scenario: Scenario, profile: Profile) {
		const o = scenario.overrides ?? {};
		const simO = (o as any).simulation ?? {};
		return {
			withdrawalRate: simO.withdrawalRate != null ? simO.withdrawalRate / 100 : profile.simulation.withdrawalRate,
			stockAllocation: simO.stockAllocation != null ? simO.stockAllocation / 100 : profile.simulation.stockAllocation,
			inflationRate: simO.inflationRate != null ? simO.inflationRate / 100 : profile.simulation.inflationRate,
			expectedReturn: simO.expectedReturn != null ? simO.expectedReturn / 100 : profile.simulation.expectedReturn,
			annualExpenses: o.annualExpenses ?? profile.annualExpenses,
			fireExpenses: o.fireExpenses ?? profile.fireExpenses,
			retirementAge: o.retirementAge ?? profile.retirementAge
		};
	}

	// Build comparison data
	let comparisonData = $derived(
		scenarios.map((sc, idx) => {
			const profile = getProfile(sc.profileId);
			const result = getResult(sc.id);
			if (!profile) return null;
			const eff = getEffective(sc, profile);
			const fireNumber = calculateFireNumber(eff.fireExpenses, eff.withdrawalRate);
			const netWorth = calculateNetWorth(profile.portfolio as unknown as Record<string, number>);
			const annualSavings = profile.annualIncome - eff.annualExpenses;
			const yearsToFire = calculateYearsToFire(netWorth, annualSavings, eff.expectedReturn, fireNumber);
			return {
				scenario: sc,
				profile,
				result,
				eff,
				fireNumber,
				yearsToFire,
				successRate: result?.successRate ?? null,
				color: COLORS[idx % COLORS.length]
			};
		}).filter(Boolean) as NonNullable<ReturnType<typeof getEffective> & {
			scenario: Scenario;
			profile: Profile;
			result: SimulationResult | undefined;
			eff: ReturnType<typeof getEffective>;
			fireNumber: number;
			yearsToFire: number;
			successRate: number | null;
			color: string;
		}>[]
	);

	// Parameter comparison rows
	const PARAM_ROWS = [
		{ key: 'withdrawalRate', label: 'Tasso di prelievo (%)', fmt: (v: number) => formatPercent(v) },
		{ key: 'stockAllocation', label: 'Allocazione azioni (%)', fmt: (v: number) => formatPercent(v) },
		{ key: 'inflationRate', label: 'Inflazione (%)', fmt: (v: number) => formatPercent(v) },
		{ key: 'expectedReturn', label: 'Rendimento atteso (%)', fmt: (v: number) => formatPercent(v) },
		{ key: 'annualExpenses', label: 'Spese annuali', fmt: (v: number) => formatCurrency(v) },
		{ key: 'fireExpenses', label: 'Spese FIRE', fmt: (v: number) => formatCurrency(v) },
		{ key: 'retirementAge', label: 'Eta pensionamento', fmt: (v: number) => String(v) }
	];

	function isHighlighted(key: string): boolean {
		if (comparisonData.length < 2) return false;
		const values = comparisonData.map((d) => (d.eff as any)[key]);
		return !values.every((v) => v === values[0]);
	}

	// Chart: overlay projection from simulation results (yearlyData medians)
	let chartOptions = $derived.by(() => {
		const scenariosWithResults = comparisonData.filter((d) => d.result && d.result.yearlyData.length > 0);
		if (scenariosWithResults.length === 0) return null;

		const maxYears = Math.max(...scenariosWithResults.map((d) => d.result!.yearlyData.length));
		const xData = Array.from({ length: maxYears }, (_, i) => `Anno ${i + 1}`);

		const series = scenariosWithResults.map((d) => ({
			name: d.scenario.name,
			type: 'line' as const,
			smooth: true,
			symbol: 'none',
			lineStyle: { width: 2.5 },
			data: d.result!.yearlyData.map((y) => y.median),
			itemStyle: { color: d.color }
		}));

		return {
			tooltip: {
				trigger: 'axis',
				valueFormatter: (v: number) => formatCurrency(v)
			},
			legend: {
				data: scenariosWithResults.map((d) => d.scenario.name),
				bottom: 0
			},
			grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
			xAxis: { type: 'category', data: xData, boundaryGap: false },
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: (v: number) => {
						if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
						if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
						return String(v);
					}
				}
			},
			series
		};
	});
</script>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button color="alternative" size="sm" onclick={onClose}>
			<ArrowLeftOutline class="w-4 h-4 me-1" />
			Torna alla lista
		</Button>
		<h2 class="text-xl font-bold text-gray-900 dark:text-white">
			Confronto Scenari ({comparisonData.length})
		</h2>
	</div>

	<!-- Summary comparison table -->
	<Card class="max-w-none">
		<h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Riepilogo</h3>
		<Table striped>
			<TableHead>
				<TableHeadCell>Metrica</TableHeadCell>
				{#each comparisonData as d}
					<TableHeadCell>
						<span style="color: {d.color}; font-weight: 700;">{d.scenario.name}</span>
					</TableHeadCell>
				{/each}
			</TableHead>
			<TableBody>
				<TableBodyRow>
					<TableBodyCell>Tipo</TableBodyCell>
					{#each comparisonData as d}
						<TableBodyCell>
							<Badge color={d.scenario.type === 'optimistic' ? 'green' : d.scenario.type === 'pessimistic' ? 'red' : d.scenario.type === 'historical' ? 'blue' : 'yellow'}>
								{TYPE_LABELS[d.scenario.type]}
							</Badge>
						</TableBodyCell>
					{/each}
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell>Numero FIRE</TableBodyCell>
					{#each comparisonData as d}
						<TableBodyCell>{formatCurrency(d.fireNumber)}</TableBodyCell>
					{/each}
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell>Anni al FIRE</TableBodyCell>
					{#each comparisonData as d}
						<TableBodyCell>{d.yearsToFire === -1 ? 'N/A' : d.yearsToFire}</TableBodyCell>
					{/each}
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell>Tasso di successo</TableBodyCell>
					{#each comparisonData as d}
						<TableBodyCell>
							{#if d.successRate !== null}
								<span class={d.successRate >= 0.9 ? 'text-green-600 font-semibold' : d.successRate >= 0.7 ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>
									{formatPercent(d.successRate * 100)}
								</span>
							{:else}
								<span class="text-gray-400">Nessuna simulazione</span>
							{/if}
						</TableBodyCell>
					{/each}
				</TableBodyRow>
			</TableBody>
		</Table>
	</Card>

	<!-- Parameter comparison table with differences highlighted -->
	<Card class="max-w-none">
		<h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Confronto Parametri</h3>
		<Table striped>
			<TableHead>
				<TableHeadCell>Parametro</TableHeadCell>
				{#each comparisonData as d}
					<TableHeadCell>
						<span style="color: {d.color};">{d.scenario.name}</span>
					</TableHeadCell>
				{/each}
			</TableHead>
			<TableBody>
				{#each PARAM_ROWS as row}
					{@const highlighted = isHighlighted(row.key)}
					<TableBodyRow>
						<TableBodyCell>{row.label}</TableBodyCell>
						{#each comparisonData as d}
							<TableBodyCell>
								<span class={highlighted ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>
									{row.fmt((d.eff as any)[row.key])}
								</span>
							</TableBodyCell>
						{/each}
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</Card>

	<!-- Overlay projection chart -->
	{#if chartOptions}
		<Card class="max-w-none">
			<h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Proiezione Portafoglio (Mediana)</h3>
			<EChart options={chartOptions} height="420px" />
		</Card>
	{:else}
		<Card class="max-w-none">
			<p class="text-gray-500 dark:text-gray-400 text-center py-6">
				Nessuno degli scenari selezionati ha risultati di simulazione. Esegui almeno una simulazione per visualizzare il grafico comparativo.
			</p>
		</Card>
	{/if}
</div>
