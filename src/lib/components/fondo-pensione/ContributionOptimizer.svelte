<script lang="ts">
	import {
		Card, Label, Input, Button, Badge, Alert, Toggle,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell
	} from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import {
		optimizeContributions,
		type ContributionOptimizationParams,
		type ContributionOptimizationResult
	} from '$lib/engine/pension-fund';

	let annualSalary = $state(35000);
	let currentContribution = $state(2000);
	let employerContribution = $state(1000);
	let tfrToFund = $state(true);
	let firstEmploymentYear = $state(2010);
	let fundJoinYear = $state(2012);
	let currentYear = $state(2026);
	let avgFirst5Contributions = $state(2000);
	let currentAge = $state(35);
	let retirementAge = $state(67);
	let expectedReturnRate = $state(4);

	let result = $state<ContributionOptimizationResult | null>(null);
	let computed = $state(false);

	function calculate() {
		const params: ContributionOptimizationParams = {
			annualSalary,
			currentContribution,
			employerContribution,
			tfrToFund,
			firstEmploymentYear,
			fundJoinYear,
			currentYear,
			avgFirst5Contributions,
			currentAge,
			retirementAge,
			expectedReturnRate: expectedReturnRate / 100
		};
		result = optimizeContributions(params);
		computed = true;
	}

	let projectionChartOptions = $derived(() => {
		if (!result) return {};
		return {
			tooltip: { trigger: 'axis' as const },
			legend: { data: result.levels.map(l => l.label) },
			xAxis: {
				type: 'category' as const,
				data: Array.from({ length: retirementAge - currentAge }, (_, i) => `${currentAge + i + 1}`)
			},
			yAxis: {
				type: 'value' as const,
				name: 'Montante (EUR)',
				axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` }
			},
			series: result.levels.map((level, idx) => {
				const colors = ['#94a3b8', '#3b82f6', '#10b981', '#8b5cf6'];
				const years = retirementAge - currentAge;
				const totalAnnual = level.annualContribution + employerContribution + (tfrToFund ? annualSalary / 13.5 : 0);
				const data: number[] = [];
				let mont = 0;
				for (let y = 0; y < years; y++) {
					mont = (mont + totalAnnual) * (1 + expectedReturnRate / 100);
					data.push(Math.round(mont));
				}
				return {
					name: level.label,
					type: 'line' as const,
					data,
					itemStyle: { color: colors[idx % colors.length] },
					smooth: true
				};
			})
		};
	});
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Ottimizzatore Contributi
	</h3>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Calcola il livello ottimale di contribuzione al fondo pensione per massimizzare
		il risparmio fiscale e il montante alla pensione.
	</p>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
		<div>
			<Label for="co-salary" class="mb-1">Stipendio annuo lordo (EUR)</Label>
			<Input id="co-salary" type="number" bind:value={annualSalary} min={10000} step={1000} />
		</div>
		<div>
			<Label for="co-current" class="mb-1">Tuo contributo annuo attuale (EUR)</Label>
			<Input id="co-current" type="number" bind:value={currentContribution} min={0} step={100} />
		</div>
		<div>
			<Label for="co-employer" class="mb-1">Contributo datore di lavoro (EUR)</Label>
			<Input id="co-employer" type="number" bind:value={employerContribution} min={0} step={100} />
		</div>
		<div>
			<Label for="co-first" class="mb-1">Anno primo impiego</Label>
			<Input id="co-first" type="number" bind:value={firstEmploymentYear} min={1990} max={2026} />
		</div>
		<div>
			<Label for="co-join" class="mb-1">Anno iscrizione al fondo</Label>
			<Input id="co-join" type="number" bind:value={fundJoinYear} min={1990} max={2026} />
		</div>
		<div>
			<Label for="co-avg5" class="mb-1">Media contributi primi 5 anni</Label>
			<Input id="co-avg5" type="number" bind:value={avgFirst5Contributions} min={0} step={100} />
		</div>
		<div>
			<Label for="co-age" class="mb-1">Eta' attuale</Label>
			<Input id="co-age" type="number" bind:value={currentAge} min={20} max={65} />
		</div>
		<div>
			<Label for="co-retire" class="mb-1">Eta' pensionamento</Label>
			<Input id="co-retire" type="number" bind:value={retirementAge} min={57} max={71} />
		</div>
		<div>
			<Label for="co-return" class="mb-1">Rendimento atteso (%)</Label>
			<Input id="co-return" type="number" bind:value={expectedReturnRate} min={0} max={10} step={0.5} />
		</div>
		<div class="flex items-end">
			<Toggle bind:checked={tfrToFund}>TFR destinato al fondo</Toggle>
		</div>
	</div>

	<Button color="primary" onclick={calculate}>
		Calcola Ottimizzazione
	</Button>
</div>

{#if computed && result}
	<!-- Riepilogo deducibilita' -->
	<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			Deducibilita' Fiscale
		</h3>

		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
			<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400">Deduzione ordinaria</p>
				<p class="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.ordinaryDeduction)}</p>
			</div>
			<div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400">Extra deducibilita'</p>
				<p class="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(result.extraDeduction)}</p>
			</div>
			<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400">Max deducibile totale</p>
				<p class="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(result.totalMaxDeduction)}</p>
			</div>
			<div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400">IRPEF risparmiata/anno</p>
				<p class="text-xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(result.irpefSaved)}</p>
			</div>
		</div>

		{#if result.extraDeduction > 0}
			<Alert color="green" class="mb-4">
				{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
				Hai diritto all'<strong>extradeducibilita'</strong> per nuovi lavoratori post-2007.
				Puoi dedurre fino a {formatCurrency(result.extraDeduction)} in piu' rispetto al limite ordinario.
			</Alert>
		{/if}

		{#if tfrToFund}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				TFR annuo destinato al fondo: <strong>{formatCurrency(result.tfrAmount)}</strong>
				(stipendio / 13,5)
			</p>
		{/if}
	</div>

	<!-- Livelli di contribuzione -->
	<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			Confronto Livelli di Contribuzione
		</h3>

		<Table striped>
			<TableHead>
				<TableHeadCell>Livello</TableHeadCell>
				<TableHeadCell>Contributo/anno</TableHeadCell>
				<TableHeadCell>IRPEF risparmiata</TableHeadCell>
				<TableHeadCell>Costo netto</TableHeadCell>
				<TableHeadCell>Montante a {retirementAge} anni</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each result.levels as level}
					{@const isOptimal = level.annualContribution <= result.totalMaxDeduction && level.annualContribution >= result.totalMaxDeduction - 500}
					<TableBodyRow class={isOptimal ? 'bg-green-50 dark:bg-green-900/20' : ''}>
						<TableBodyCell>
							{level.label}
							{#if isOptimal}
								<Badge color="green" class="ms-2">Ottimale</Badge>
							{/if}
						</TableBodyCell>
						<TableBodyCell>{formatCurrency(level.annualContribution)}</TableBodyCell>
						<TableBodyCell class="text-green-600 dark:text-green-400">-{formatCurrency(level.taxSaving)}</TableBodyCell>
						<TableBodyCell class="font-semibold">{formatCurrency(level.netCost)}</TableBodyCell>
						<TableBodyCell class="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(level.montanteAt67)}</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>

		<Alert color="blue" class="mt-4">
			{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
			<strong>Contributo ottimale consigliato: {formatCurrency(result.optimalContribution)}/anno</strong>
			(al netto di contributo datore e TFR). Questo massimizza la deduzione fiscale senza superare il tetto.
		</Alert>
	</div>

	<!-- Proiezione montante -->
	<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			Proiezione del Montante ai Diversi Livelli
		</h3>
		<EChart options={projectionChartOptions()} height="400px" />

		<div class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Con il contributo attuale ({formatCurrency(currentContribution)}/anno + {formatCurrency(employerContribution)} datore
				{#if tfrToFund}+ {formatCurrency(result.tfrAmount)} TFR{/if}),
				il montante stimato a {retirementAge} anni sara' circa <strong>{formatCurrency(result.projectedMontante)}</strong>,
				equivalente a una rendita di circa <strong>{formatCurrency(result.projectedMonthlyPension)}/mese</strong>.
			</p>
		</div>
	</div>
{/if}
