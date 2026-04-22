<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading, Breadcrumb, BreadcrumbItem, Alert, Spinner, Card, Label, Select, Toggle
	} from 'flowbite-svelte';
	import {
		ExclamationCircleOutline, ArrowRightOutline, InfoCircleSolid
	} from 'flowbite-svelte-icons';
	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import {
		simulateINPSPension, type INPSSimulatorParams, type INPSSimulatorResult
	} from '$lib/engine/inps-simulator';
	import PensionByAgeChart from '$lib/components/pensione/PensionByAgeChart.svelte';
	import ScenarioComparisonPanel from '$lib/components/pensione/ScenarioComparisonPanel.svelte';
	import FireGapAnalysis from '$lib/components/pensione/FireGapAnalysis.svelte';

	let profile = $state<Profile | undefined>(undefined);
	let loading = $state(true);

	// Parametri simulazione INPS (precompilati dal profilo)
	let gender = $state<'M' | 'F'>('M');
	let firstEmploymentYear = $state(2015);
	let currentGrossSalary = $state(35000);
	let salaryGrowthRate = $state(2.0);
	let contractType = $state<'dipendente' | 'autonomo' | 'parasubordinato'>('dipendente');
	let partTime = $state(false);
	let partTimePercentage = $state(100);
	let existingContributionYears = $state(10);
	let existingMontante = $state(0);

	let currentYear = new Date().getFullYear();

	let birthYear = $derived(profile?.birthYear ?? 1990);
	let targetRetirementAge = $derived(profile?.pension.pensionAge ?? 67);
	let lifeExpectancy = $derived(profile?.lifeExpectancy ?? 85);

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
		targetRetirementAge
	}));

	let result = $derived.by((): INPSSimulatorResult | null => {
		try {
			return simulateINPSPension(simulatorParams);
		} catch {
			return null;
		}
	});

	let monthlyPensionNet = $derived.by(() => {
		if (!result) return 0;
		const point = result.pensionAtAge.find((p) => p.age === targetRetirementAge)
			?? result.pensionAtAge.find((p) => p.age === result!.earliestRetirementAge);
		return point?.monthlyNet ?? 0;
	});

	let annualFireExpenses = $derived(profile?.fireExpenses ?? 0);
	let fireMonthlyExpenses = $derived(annualFireExpenses / 12);
	let yearsToPension = $derived(Math.max(0, targetRetirementAge - (currentYear - birthYear)));
	let yearsInRetirement = $derived(Math.max(0, lifeExpectancy - targetRetirementAge));

	let contractOptions = [
		{ value: 'dipendente', name: 'Dipendente (33%)' },
		{ value: 'autonomo', name: 'Autonomo (26,23%)' },
		{ value: 'parasubordinato', name: 'Parasubordinato (33,72%)' }
	];

	let genderOptions = [
		{ value: 'M', name: 'Uomo' },
		{ value: 'F', name: 'Donna' }
	];

	function initFromProfile(p: Profile) {
		// Valori sensati di default basati sul profilo disponibile
		currentGrossSalary = p.annualIncome > 0 ? Math.round(p.annualIncome * 1.3) : 35000;
		existingContributionYears = p.pension.contributionYears ?? 10;
		firstEmploymentYear = currentYear - existingContributionYears;
		salaryGrowthRate = (p.incomeGrowthRate ?? 0.02) * (p.incomeGrowthRate > 1 ? 1 : 100);
	}

	onMount(async () => {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length > 0) {
				profile = profiles[0];
				initFromProfile(profile);
			}
		} catch (e) {
			console.error('Errore caricamento profilo:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Pensione INPS - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Pensione INPS</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Pensione INPS</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-6">
	Simula la tua pensione INPS con il metodo contributivo, confronta scenari alternativi
	(riscatto laurea, uscita posticipata, crescita salariale) e quantifica il gap rispetto
	alle spese FIRE da coprire con fondo pensione o portafoglio privato.
</p>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<Spinner size="8" />
		<span class="ml-3 text-gray-500 dark:text-gray-400">Caricamento profilo...</span>
	</div>
{:else if !profile}
	<Alert color="yellow">
		{#snippet icon()}
			<ExclamationCircleOutline class="w-5 h-5" />
		{/snippet}
		<span class="font-medium">Profilo non trovato.</span>
		Per simulare la pensione devi prima creare un profilo.
		<a href="/profilo/" class="ml-2 inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-300 underline font-medium">
			Crea Profilo <ArrowRightOutline class="w-3 h-3" />
		</a>
	</Alert>
{:else}
	<!-- Parametri -->
	<Card class="max-w-none mb-6">
		<Heading tag="h4" class="text-lg mb-4">Parametri simulazione</Heading>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<div>
				<Label for="gender" class="mb-1">Genere</Label>
				<Select id="gender" items={genderOptions} bind:value={gender} />
			</div>
			<div>
				<Label for="contract" class="mb-1">Tipo contratto</Label>
				<Select id="contract" items={contractOptions} bind:value={contractType} />
			</div>
			<div>
				<Label for="firstEmp" class="mb-1">Anno primo impiego</Label>
				<input
					id="firstEmp"
					type="number"
					class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5"
					bind:value={firstEmploymentYear}
					min={1970}
					max={currentYear}
				/>
			</div>
			<CurrencyInput
				bind:value={currentGrossSalary}
				label="Stipendio lordo attuale"
				id="salary"
				step={1000}
			/>
			<PercentInput
				bind:value={salaryGrowthRate}
				label="Crescita salariale annua"
				id="growth"
				min={0}
				max={10}
				step={0.5}
			/>
			<div>
				<Label for="years" class="mb-1">Anni di contributi gia versati</Label>
				<input
					id="years"
					type="number"
					class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5"
					bind:value={existingContributionYears}
					min={0}
					max={50}
				/>
			</div>
			<CurrencyInput
				bind:value={existingMontante}
				label="Montante gia accumulato (se noto)"
				id="montante"
				step={1000}
			/>
			<div class="flex items-center pt-6">
				<Toggle bind:checked={partTime}>
					<span class="font-medium text-gray-900 dark:text-white">Part-time</span>
				</Toggle>
			</div>
			{#if partTime}
				<PercentInput
					bind:value={partTimePercentage}
					label="Percentuale part-time"
					id="ptPct"
					min={10}
					max={99}
					step={5}
				/>
			{/if}
		</div>

		<Alert color="blue" class="mt-4">
			{#snippet icon()}
				<InfoCircleSolid class="w-4 h-4" />
			{/snippet}
			Eta target di pensione: <strong>{targetRetirementAge}</strong> anni
			(da profilo). Anni mancanti: {yearsToPension}. Vita stimata post-pensione:
			{yearsInRetirement} anni.
		</Alert>
	</Card>

	{#if result}
		<!-- Chart eta -->
		<div class="mb-6">
			<PensionByAgeChart
				pensionAtAge={result.pensionAtAge}
				{fireMonthlyExpenses}
			/>
		</div>

		<!-- Scenari -->
		<div class="mb-6">
			<ScenarioComparisonPanel baseParams={simulatorParams} />
		</div>

		<!-- Gap FIRE -->
		<div class="mb-6">
			<FireGapAnalysis
				{annualFireExpenses}
				{monthlyPensionNet}
				{yearsToPension}
				{yearsInRetirement}
				realReturn={0.02}
			/>
		</div>
	{:else}
		<Alert color="red">
			<span class="font-medium">Impossibile calcolare la simulazione.</span>
			Verifica che tutti i parametri siano validi.
		</Alert>
	{/if}
{/if}
