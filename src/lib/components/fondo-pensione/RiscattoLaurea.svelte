<script lang="ts">
	import {
		Card, Label, Input, Select, Button, Badge, Alert,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell
	} from 'flowbite-svelte';
	import { InfoCircleSolid, CheckCircleSolid, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { formatCurrency } from '$lib/utils/format';
	import { calculateRiscattoLaurea, type RiscattoLaureaParams, type RiscattoLaureaResult } from '$lib/engine/pension-fund';

	let yearsToRedeem = $state(4);
	let annualSalary = $state(35000);
	let riscattoType = $state<'standard' | 'agevolato'>('agevolato');
	let currentAge = $state(35);
	let currentContributionYears = $state(10);
	let retirementAge = $state(67);
	let expectedMonthlyPension = $state(1500);

	let resultStandard = $state<RiscattoLaureaResult | null>(null);
	let resultAgevolato = $state<RiscattoLaureaResult | null>(null);
	let computed = $state(false);

	function calculate() {
		const base = {
			yearsToRedeem,
			annualSalary,
			currentAge,
			currentContributionYears,
			retirementAge,
			expectedMonthlyPension
		};
		resultStandard = calculateRiscattoLaurea({ ...base, type: 'standard' });
		resultAgevolato = calculateRiscattoLaurea({ ...base, type: 'agevolato' });
		computed = true;
	}

	const typeOptions = [
		{ value: 'agevolato', name: 'Agevolato (5.776 EUR/anno)' },
		{ value: 'standard', name: 'Standard (33% dello stipendio)' }
	];

	let selectedResult = $derived(
		riscattoType === 'agevolato' ? resultAgevolato : resultStandard
	);
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Riscatto Laurea
	</h3>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
		Il riscatto della laurea permette di "comprare" anni di contributi previdenziali
		corrispondenti alla durata del corso di studi. Con la Legge di Bilancio 2024/2026,
		la deduzione fiscale e' del 50% del costo.
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
		<div>
			<Label for="rl-years" class="mb-1.5">Anni da riscattare (1-5)</Label>
			<Input id="rl-years" type="number" bind:value={yearsToRedeem} min={1} max={5} />
		</div>
		<div>
			<Label for="rl-salary" class="mb-1.5">Stipendio annuo lordo (EUR)</Label>
			<Input id="rl-salary" type="number" bind:value={annualSalary} min={10000} step={1000} />
		</div>
		<div>
			<Label for="rl-type" class="mb-1.5">Tipo di riscatto</Label>
			<Select id="rl-type" items={typeOptions} bind:value={riscattoType} />
		</div>
		<div>
			<Label for="rl-age" class="mb-1.5">Eta' attuale</Label>
			<Input id="rl-age" type="number" bind:value={currentAge} min={25} max={60} />
		</div>
		<div>
			<Label for="rl-contr" class="mb-1.5">Anni di contributi attuali</Label>
			<Input id="rl-contr" type="number" bind:value={currentContributionYears} min={0} max={40} />
		</div>
		<div>
			<Label for="rl-retire" class="mb-1.5">Eta' pensionamento prevista</Label>
			<Input id="rl-retire" type="number" bind:value={retirementAge} min={57} max={71} />
		</div>
	</div>

	<Button color="primary" size="lg" onclick={calculate}>
		Calcola Costo e Convenienza
	</Button>
</div>

{#if computed && resultStandard && resultAgevolato}
	<!-- Confronto Standard vs Agevolato -->
	<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			Confronto: Riscatto Standard vs Agevolato
		</h3>

		<Table striped>
			<TableHead>
				<TableHeadCell></TableHeadCell>
				<TableHeadCell>Standard</TableHeadCell>
				<TableHeadCell>Agevolato</TableHeadCell>
			</TableHead>
			<TableBody>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Costo totale</TableBodyCell>
					<TableBodyCell>{formatCurrency(resultStandard.totalCost)}</TableBodyCell>
					<TableBodyCell class="text-green-600 dark:text-green-400">{formatCurrency(resultAgevolato.totalCost)}</TableBodyCell>
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Costo annuo</TableBodyCell>
					<TableBodyCell>{formatCurrency(resultStandard.annualCost)}</TableBodyCell>
					<TableBodyCell>{formatCurrency(resultAgevolato.annualCost)}</TableBodyCell>
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Deduzione fiscale (50%)</TableBodyCell>
					<TableBodyCell class="text-blue-600 dark:text-blue-400">{formatCurrency(resultStandard.taxDeduction)}</TableBodyCell>
					<TableBodyCell class="text-blue-600 dark:text-blue-400">{formatCurrency(resultAgevolato.taxDeduction)}</TableBodyCell>
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Costo netto effettivo</TableBodyCell>
					<TableBodyCell>{formatCurrency(resultStandard.netCost)}</TableBodyCell>
					<TableBodyCell class="text-green-600 dark:text-green-400 font-bold">{formatCurrency(resultAgevolato.netCost)}</TableBodyCell>
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Pensione aggiuntiva/mese</TableBodyCell>
					<TableBodyCell>{formatCurrency(resultStandard.additionalMonthlyPension)}</TableBodyCell>
					<TableBodyCell>{formatCurrency(resultAgevolato.additionalMonthlyPension)}</TableBodyCell>
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Anticipo pensione</TableBodyCell>
					<TableBodyCell>{resultStandard.earlierRetirementMonths} mesi</TableBodyCell>
					<TableBodyCell>{resultAgevolato.earlierRetirementMonths} mesi</TableBodyCell>
				</TableBodyRow>
				<TableBodyRow>
					<TableBodyCell class="font-semibold">Break-even</TableBodyCell>
					<TableBodyCell>{resultStandard.breakEvenYears < 99 ? `${resultStandard.breakEvenYears} anni` : 'Non raggiungibile'}</TableBodyCell>
					<TableBodyCell class="font-bold {resultAgevolato.breakEvenYears < 15 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">
						{resultAgevolato.breakEvenYears < 99 ? `${resultAgevolato.breakEvenYears} anni` : 'Non raggiungibile'}
					</TableBodyCell>
				</TableBodyRow>
			</TableBody>
		</Table>
	</div>

	<!-- Verdetto -->
	{@const best = resultAgevolato.netCost < resultStandard.netCost ? resultAgevolato : resultStandard}
	{@const bestType = resultAgevolato.netCost < resultStandard.netCost ? 'agevolato' : 'standard'}
	<Alert color={best.recommended ? 'green' : 'yellow'} class="mb-6">
		{#snippet icon()}
			{#if best.recommended}
				<CheckCircleSolid class="w-5 h-5" />
			{:else}
				<ExclamationCircleOutline class="w-5 h-5" />
			{/if}
		{/snippet}
		<span class="font-semibold text-lg">
			{best.recommended ? 'Conviene!' : 'Valutazione necessaria'}
		</span>
		<p class="mt-2">{best.explanation}</p>
		{#if bestType === 'agevolato'}
			<p class="mt-2 text-sm">
				Il <strong>riscatto agevolato</strong> costa {formatCurrency(resultAgevolato.netCost)} netti
				(vs {formatCurrency(resultStandard.netCost)} del riscatto standard) ed e' generalmente la scelta migliore.
			</p>
		{/if}
	</Alert>

	<!-- Info per FIRE -->
	<Alert color="blue" class="mb-6">
		{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
		<span class="font-semibold">Nota per FIRE:</span>
		Il riscatto laurea anticipa l'accesso alla pensione di <strong>{yearsToRedeem} anni</strong>,
		riducendo il periodo in cui devi vivere solo del portafoglio. Con {yearsToRedeem} anni
		in meno di gap FIRE-pensione, puoi raggiungere il FIRE Number con un patrimonio inferiore.
	</Alert>
{/if}
