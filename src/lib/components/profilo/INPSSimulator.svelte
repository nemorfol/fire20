<script lang="ts">
	import {
		Card, Heading, Label, Input, Select, Toggle, Button, Badge, Alert,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell
	} from 'flowbite-svelte';
	import { InfoCircleSolid, CheckCircleOutline, PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import {
		simulateINPSPension,
		calculateRiscattoLaureaCost,
		type INPSSimulatorParams,
		type INPSSimulatorResult
	} from '$lib/engine/inps-simulator';
	import { formatCurrency, formatPercent } from '$lib/utils/format';

	let {
		birthYear = 1990,
		retirementAge = 50,
		annualExpenses = 20000,
		onApply
	}: {
		birthYear?: number;
		retirementAge?: number;
		annualExpenses?: number;
		onApply?: (data: { contributionYears: number; estimatedMonthly: number; pensionAge: number }) => void;
	} = $props();

	// Form state
	let gender = $state<'M' | 'F'>('M');
	let firstEmploymentYear = $state(2015);
	let currentGrossSalary = $state(35000);
	let salaryGrowthRate = $state(2.0);
	let contractType = $state<'dipendente' | 'autonomo' | 'parasubordinato'>('dipendente');
	let partTime = $state(false);
	let partTimePercentage = $state(100);
	let existingContributionYears = $state(10);
	let existingMontante = $state(0);

	// Career gaps
	let careerGaps = $state<{ fromYear: number; toYear: number; reason: string }[]>([]);

	// Riscatto laurea
	let riscattoEnabled = $state(false);
	let riscattoYears = $state(3);

	// Computed
	let riscattoCost = $derived(calculateRiscattoLaureaCost(riscattoYears, contractType));

	let simulatorParams = $derived.by((): INPSSimulatorParams => ({
		birthYear,
		gender,
		firstEmploymentYear,
		currentGrossSalary,
		salaryGrowthRate,
		contractType,
		partTime,
		partTimePercentage,
		existingContributionYears,
		existingMontante,
		targetRetirementAge: retirementAge,
		careerGaps: careerGaps.length > 0 ? careerGaps : undefined,
		riscattoLaurea: riscattoEnabled ? { years: riscattoYears, cost: riscattoCost } : undefined,
	}));

	let result = $derived.by((): INPSSimulatorResult | null => {
		try {
			return simulateINPSPension(simulatorParams);
		} catch {
			return null;
		}
	});

	// Key ages for comparison table
	let comparisonAges = $derived.by(() => {
		if (!result) return [];
		return result.pensionAtAge.filter(p => [62, 64, 67, 70].includes(p.age));
	});

	// Career timeline
	let currentYear = $derived(new Date().getFullYear());
	let currentAge = $derived(currentYear - birthYear);
	let timelineStartYear = $derived(firstEmploymentYear);
	let timelineEndYear = $derived(birthYear + 71);
	let timelineTotalYears = $derived(timelineEndYear - timelineStartYear);
	let timelineCurrentPos = $derived(timelineTotalYears > 0 ? ((currentYear - timelineStartYear) / timelineTotalYears) * 100 : 0);
	let timelineRetirementPos = $derived.by(() => {
		if (!result || timelineTotalYears <= 0) return 0;
		return ((birthYear + result.earliestRetirementAge - timelineStartYear) / timelineTotalYears) * 100;
	});

	let applied = $state(false);

	let genderOptions = [
		{ value: 'M', name: 'Uomo' },
		{ value: 'F', name: 'Donna' },
	];

	let contractOptions = [
		{ value: 'dipendente', name: 'Dipendente (33%)' },
		{ value: 'autonomo', name: 'Autonomo (26,23%)' },
		{ value: 'parasubordinato', name: 'Parasubordinato (33,72%)' },
	];

	function addGap() {
		careerGaps = [...careerGaps, { fromYear: currentYear, toYear: currentYear + 1, reason: '' }];
	}

	function removeGap(index: number) {
		careerGaps = careerGaps.filter((_, i) => i !== index);
	}

	function handleApply() {
		if (!result || !onApply) return;
		const pensionAtOptimal = result.pensionAtAge.find(p => p.age === result!.earliestRetirementAge);
		onApply({
			contributionYears: result.totalContributionYears,
			estimatedMonthly: pensionAtOptimal?.monthlyGross ?? 0,
			pensionAge: result.earliestRetirementAge,
		});
		applied = true;
	}
</script>

<Card class="max-w-none mt-6">
	<Heading tag="h4" class="mb-4 text-lg">Simulatore Pensione INPS</Heading>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
		Simula la tua pensione INPS con il metodo contributivo. Inserisci i tuoi dati per una stima dettagliata.
	</p>

	<!-- Input Form -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
		<div>
			<Label for="sim-gender" class="mb-2 font-semibold">Genere</Label>
			<Select id="sim-gender" items={genderOptions} bind:value={gender} />
		</div>

		<div>
			<Label for="sim-firstEmployment" class="mb-2 font-semibold">Anno primo impiego</Label>
			<Input id="sim-firstEmployment" type="number" bind:value={firstEmploymentYear} min={1970} max={currentYear} class="w-full" />
		</div>

		<div>
			<CurrencyInput bind:value={currentGrossSalary} label="RAL attuale (lordo annuo)" id="sim-salary" step={500} />
		</div>

		<div>
			<PercentInput bind:value={salaryGrowthRate} label="Crescita stipendio annua" id="sim-salaryGrowth" min={0} max={10} step={0.5} />
		</div>

		<div>
			<Label for="sim-contract" class="mb-2 font-semibold">Tipo contratto</Label>
			<Select id="sim-contract" items={contractOptions} bind:value={contractType} />
		</div>

		<div>
			<Label for="sim-contribYears" class="mb-2 font-semibold">Anni contribuzione maturati</Label>
			<Input id="sim-contribYears" type="number" bind:value={existingContributionYears} min={0} max={50} class="w-full" />
		</div>

		<div>
			<CurrencyInput bind:value={existingMontante} label="Montante noto (da estratto INPS)" id="sim-montante" step={1000} />
			<p class="text-xs text-gray-400 mt-1">Se 0, viene stimato dallo stipendio.</p>
		</div>

		<div class="flex flex-col justify-end">
			<Toggle bind:checked={partTime}>Part-time</Toggle>
			{#if partTime}
				<div class="mt-2">
					<Input type="number" bind:value={partTimePercentage} min={50} max={100} class="w-24" />
					<span class="text-xs text-gray-400 ml-1">%</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Career Gaps -->
	<div class="mb-6">
		<div class="flex items-center justify-between mb-2">
			<Label class="font-semibold">Interruzioni di carriera</Label>
			<Button size="xs" color="alternative" onclick={addGap}>
				<PlusOutline class="w-3 h-3 me-1" />
				Aggiungi
			</Button>
		</div>
		{#if careerGaps.length > 0}
			<div class="space-y-2">
				{#each careerGaps as gap, i}
					<div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<Input type="number" bind:value={gap.fromYear} min={1970} max={2060} class="w-24" placeholder="Da" />
						<span class="text-gray-400">-</span>
						<Input type="number" bind:value={gap.toYear} min={gap.fromYear} max={2060} class="w-24" placeholder="A" />
						<Input type="text" bind:value={gap.reason} class="flex-1" placeholder="Motivo (es. maternita)" />
						<Button size="xs" color="red" outline onclick={() => removeGap(i)}>
							<TrashBinOutline class="w-3 h-3" />
						</Button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-xs text-gray-400">Nessuna interruzione di carriera. Aggiungi periodi senza contributi.</p>
		{/if}
	</div>

	<!-- Riscatto Laurea -->
	<div class="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
		<div class="flex items-center justify-between mb-2">
			<Heading tag="h5" class="text-base text-blue-800 dark:text-blue-300">Riscatto Laurea</Heading>
			<Toggle bind:checked={riscattoEnabled}>Calcola</Toggle>
		</div>
		{#if riscattoEnabled}
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
				<div>
					<Label for="sim-riscattoYears" class="mb-1 text-sm">Anni da riscattare</Label>
					<Input id="sim-riscattoYears" type="number" bind:value={riscattoYears} min={1} max={6} class="w-full" />
				</div>
				<div>
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Costo stimato (agevolato)</p>
					<p class="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(riscattoCost)}</p>
					<p class="text-xs text-gray-400">Art. 2 D.Lgs. 184/1997</p>
				</div>
				{#if result?.riscattoLaureaROI}
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Risparmio fiscale</p>
						<p class="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(result.riscattoLaureaROI.taxSaving)}</p>
						<p class="text-xs text-gray-400">Deducibile IRPEF</p>
					</div>
				{/if}
			</div>
			{#if result?.riscattoLaureaROI}
				<div class="mt-3 grid grid-cols-2 gap-4">
					<div class="bg-white dark:bg-gray-800 rounded-lg p-3">
						<p class="text-xs text-gray-500 mb-1">Pensione aggiuntiva mensile</p>
						<p class="text-lg font-bold text-green-600 dark:text-green-400">+{formatCurrency(result.riscattoLaureaROI.additionalPension)}</p>
					</div>
					<div class="bg-white dark:bg-gray-800 rounded-lg p-3">
						<p class="text-xs text-gray-500 mb-1">Break-even</p>
						<p class="text-lg font-bold text-gray-900 dark:text-white">{result.riscattoLaureaROI.breakEvenYears} anni</p>
						<p class="text-xs text-gray-400">di pensione per recuperare il costo</p>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Career Timeline -->
	<div class="mb-6">
		<Heading tag="h5" class="text-base mb-3">Timeline Carriera</Heading>
		<div class="relative h-10 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
			<!-- Working years (past) -->
			<div
				class="absolute top-0 h-full bg-green-500 dark:bg-green-600"
				style="left: 0%; width: {Math.min(timelineCurrentPos, 100)}%"
			></div>
			<!-- Future working years -->
			{#if result}
				<div
					class="absolute top-0 h-full bg-green-300 dark:bg-green-800"
					style="left: {timelineCurrentPos}%; width: {Math.max(0, timelineRetirementPos - timelineCurrentPos)}%"
				></div>
			{/if}
			<!-- Gaps -->
			{#each careerGaps as gap}
				{@const gapStart = timelineTotalYears > 0 ? ((gap.fromYear - timelineStartYear) / timelineTotalYears) * 100 : 0}
				{@const gapWidth = timelineTotalYears > 0 ? ((gap.toYear - gap.fromYear) / timelineTotalYears) * 100 : 0}
				<div
					class="absolute top-0 h-full bg-red-400 dark:bg-red-600"
					style="left: {gapStart}%; width: {gapWidth}%"
				></div>
			{/each}
			<!-- Current year marker -->
			<div
				class="absolute top-0 h-full w-0.5 bg-gray-900 dark:bg-white z-10"
				style="left: {timelineCurrentPos}%"
			></div>
		</div>
		<div class="flex justify-between text-xs text-gray-500 mt-1">
			<span>{timelineStartYear}</span>
			<span>Oggi ({currentYear})</span>
			{#if result}
				<span>Pensione ({birthYear + result.earliestRetirementAge})</span>
			{/if}
			<span>{timelineEndYear}</span>
		</div>
		<div class="flex gap-4 mt-2 text-xs">
			<span class="flex items-center gap-1"><span class="w-3 h-3 bg-green-500 rounded-sm inline-block"></span> Lavoro passato</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 bg-green-300 rounded-sm inline-block"></span> Lavoro futuro</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-400 rounded-sm inline-block"></span> Gap</span>
		</div>
	</div>

	<!-- Results -->
	{#if result}
		<!-- Key metrics -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			<Card class="max-w-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pensionamento anticipato</p>
				<p class="text-2xl font-bold text-blue-700 dark:text-blue-300">{result.earliestRetirementAge} anni</p>
				<p class="text-xs text-gray-400">Anno {birthYear + result.earliestRetirementAge}</p>
			</Card>

			<Card class="max-w-none bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Montante proiettato</p>
				<p class="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(result.projectedMontante)}</p>
				<p class="text-xs text-gray-400">{result.totalContributionYears} anni di contributi</p>
			</Card>

			<Card class="max-w-none bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Eta ottimale</p>
				<p class="text-2xl font-bold text-purple-700 dark:text-purple-300">{result.optimalRetirementAge} anni</p>
				<p class="text-xs text-gray-400">Miglior rapporto costi/benefici</p>
			</Card>

			<Card class="max-w-none bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Vecchiaia INPS</p>
				<p class="text-2xl font-bold text-amber-700 dark:text-amber-300">{result.oldAgePensionAge} anni</p>
				<p class="text-xs text-gray-400">Con almeno 20 anni di contributi</p>
			</Card>
		</div>

		<!-- Comparison table: 62 vs 64 vs 67 vs 70 -->
		{#if comparisonAges.length > 0}
			<div class="mb-6">
				<Heading tag="h5" class="text-base mb-3">Confronto Pensione per Eta</Heading>
				<div class="overflow-x-auto border rounded-lg dark:border-gray-700">
					<Table striped>
						<TableHead>
							<TableHeadCell>Eta</TableHeadCell>
							<TableHeadCell>Mensile Lordo</TableHeadCell>
							<TableHeadCell>Mensile Netto</TableHeadCell>
							<TableHeadCell>Tasso Sostituzione</TableHeadCell>
						</TableHead>
						<TableBody>
							{#each comparisonAges as p}
								<TableBodyRow>
									<TableBodyCell>
										<span class="font-semibold">{p.age} anni</span>
										{#if p.age === result.earliestRetirementAge}
											<Badge color="green" class="ml-2">Min.</Badge>
										{/if}
										{#if p.age === result.optimalRetirementAge}
											<Badge color="purple" class="ml-2">Ottimale</Badge>
										{/if}
									</TableBodyCell>
									<TableBodyCell>{formatCurrency(p.monthlyGross)}</TableBodyCell>
									<TableBodyCell class="font-semibold">{formatCurrency(p.monthlyNet)}</TableBodyCell>
									<TableBodyCell>{formatPercent(p.replacementRate * 100)}</TableBodyCell>
								</TableBodyRow>
							{/each}
						</TableBody>
					</Table>
				</div>
			</div>
		{/if}

		<!-- Full table -->
		<details class="mb-6">
			<summary class="cursor-pointer text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2">
				Mostra tutte le eta (57-71)
			</summary>
			<div class="max-h-64 overflow-y-auto border rounded-lg dark:border-gray-700">
				<Table striped>
					<TableHead>
						<TableHeadCell>Eta</TableHeadCell>
						<TableHeadCell>Mensile Lordo</TableHeadCell>
						<TableHeadCell>Mensile Netto</TableHeadCell>
						<TableHeadCell>Tasso Sost.</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each result.pensionAtAge as p}
							<TableBodyRow class={p.age === result.earliestRetirementAge ? 'bg-green-50 dark:bg-green-950/20' : ''}>
								<TableBodyCell>
									{p.age}
									{#if p.age === result.earliestRetirementAge}
										<Badge color="green" class="ml-1">Min</Badge>
									{/if}
								</TableBodyCell>
								<TableBodyCell>{formatCurrency(p.monthlyGross)}</TableBodyCell>
								<TableBodyCell>{formatCurrency(p.monthlyNet)}</TableBodyCell>
								<TableBodyCell>{formatPercent(p.replacementRate * 100)}</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</div>
		</details>

		<!-- FIRE Gap -->
		{#if result.fireGapYears > 0}
			<Alert color="yellow" class="mb-4">
				<div class="flex items-start gap-2">
					<InfoCircleSolid class="w-5 h-5 mt-0.5 flex-shrink-0" />
					<div>
						<p class="font-semibold mb-1">Gap FIRE</p>
						<p class="text-sm">
							Se vai in pensione FIRE a {retirementAge} anni, dovrai coprire
							<strong>{result.fireGapYears} anni</strong> prima di ricevere la pensione INPS.
							Costo stimato del gap: <strong>{formatCurrency(result.fireGapCost)}</strong>.
						</p>
					</div>
				</div>
			</Alert>
		{/if}

		<!-- RITA -->
		<Alert color="blue" class="mb-4">
			<div class="flex items-start gap-2">
				<InfoCircleSolid class="w-5 h-5 mt-0.5 flex-shrink-0" />
				<div>
					<p class="font-semibold mb-1">RITA (Rendita Integrativa Temporanea Anticipata)</p>
					<p class="text-sm">
						La RITA consente di anticipare il fondo pensione complementare fino a 10 anni prima
						della pensione di vecchiaia (eta minima: {result.ritaEarliestAge} anni).
						Richiede un fondo pensione complementare attivo con almeno 5 anni di iscrizione.
					</p>
					{#if result.ritaEligible}
						<Badge color="green" class="mt-2">Potenzialmente eleggibile</Badge>
					{:else}
						<Badge color="yellow" class="mt-2">Verifica requisiti</Badge>
					{/if}
				</div>
			</div>
		</Alert>

		<!-- Apply button -->
		{#if onApply}
			<div class="flex gap-3 mt-4">
				<Button color="green" onclick={handleApply} disabled={applied}>
					{#if applied}
						<CheckCircleOutline class="w-4 h-4 me-2" />
						Applicato al Profilo
					{:else}
						Applica al Profilo
					{/if}
				</Button>
			</div>
			{#if applied}
				<Alert color="green" class="mt-3">
					<CheckCircleOutline class="w-4 h-4 me-2 inline" />
					Dati applicati: {result.totalContributionYears} anni di contributi, pensione a {result.earliestRetirementAge} anni.
				</Alert>
			{/if}
		{/if}
	{/if}
</Card>
