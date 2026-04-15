<script lang="ts">
	import { Card, Heading, Label, Input, Select, Badge, Alert } from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import {
		calculateContributivePension,
		estimatePensionAge,
		getPensionRequirements,
		calculatePensionGap,
		type ContributivePensionResult
	} from '$lib/engine/pension-italy';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import { t } from '$lib/i18n/store.svelte';

	let {
		birthYear = 1990,
		retirementAge = 50,
		annualExpenses = 20000
	}: {
		birthYear?: number;
		retirementAge?: number;
		annualExpenses?: number;
	} = $props();

	// Input state
	let contributionStartYear = $state(2015);
	let currentSalary = $state(35000);
	let salaryGrowthRate = $state(2.0);
	let gender = $state<'M' | 'F'>('M');
	let contributionYears = $state(10);
	let workerType = $state<'dipendente' | 'autonomo'>('dipendente');

	// Derived calculations
	let currentAge = $derived(new Date().getFullYear() - birthYear);
	let contributionStartAge = $derived(contributionStartYear - birthYear);
	let contributionRate = $derived(workerType === 'dipendente' ? 0.33 : 0.2623);

	let pensionResult = $derived.by((): ContributivePensionResult => {
		const requirements = getPensionRequirements();
		const pensionAge = estimatePensionAge(birthYear, contributionStartAge, gender);

		return calculateContributivePension({
			currentSalary,
			salaryGrowthRate: salaryGrowthRate / 100,
			currentContributionYears: contributionYears,
			currentAge,
			retirementAge: pensionAge,
			inflationRate: 0.02,
			montanteRevaluationRate: 0.015
		});
	});

	// Adjust montante for self-employed (different contribution rate)
	let adjustedResult = $derived.by((): ContributivePensionResult => {
		if (workerType === 'dipendente') return pensionResult;

		// Recalculate with self-employed contribution rate
		// The engine uses 33%, so we scale the result
		const scale = 0.2623 / 0.33;
		return {
			...pensionResult,
			totalMontante: Math.round(pensionResult.totalMontante * scale * 100) / 100,
			annualPension: Math.round(pensionResult.annualPension * scale * 100) / 100,
			monthlyPension: Math.round(pensionResult.monthlyPension * scale * 100) / 100,
			replacementRate: Math.round(pensionResult.replacementRate * scale * 10000) / 10000
		};
	});

	// Net pension estimate (rough: apply IRPEF-like brackets)
	let netMonthlyPension = $derived.by(() => {
		const grossAnnual = adjustedResult.annualPension;
		let tax = 0;
		if (grossAnnual <= 15000) {
			tax = grossAnnual * 0.23;
		} else if (grossAnnual <= 28000) {
			tax = 15000 * 0.23 + (grossAnnual - 15000) * 0.25;
		} else if (grossAnnual <= 50000) {
			tax = 15000 * 0.23 + 13000 * 0.25 + (grossAnnual - 28000) * 0.35;
		} else {
			tax = 15000 * 0.23 + 13000 * 0.25 + 22000 * 0.35 + (grossAnnual - 50000) * 0.43;
		}
		// Regional/municipal addizionali ~2%
		tax += grossAnnual * 0.02;
		const netAnnual = grossAnnual - tax;
		return Math.round((netAnnual / 13) * 100) / 100;
	});

	let earlyRetirementAge = $derived(estimatePensionAge(birthYear, contributionStartAge, gender));
	let oldAgeRetirementAge = $derived(67);

	// FIRE gap calculation
	let fireGapYears = $derived(Math.max(0, earlyRetirementAge - retirementAge));
	let fireGapCost = $derived(calculatePensionGap(retirementAge, earlyRetirementAge, annualExpenses));

	// RITA eligibility: within 5 years of old-age pension (10 if unemployed)
	let ritaEligible = $derived(retirementAge >= oldAgeRetirementAge - 10);

	let genderOptions = $derived([
		{ value: 'M', name: t('pension.male') },
		{ value: 'F', name: t('pension.female') }
	]);

	let workerTypeOptions = $derived([
		{ value: 'dipendente', name: t('pension.employee') },
		{ value: 'autonomo', name: t('pension.selfEmployed') }
	]);
</script>

<div class="space-y-6">
	<Heading tag="h4" class="text-lg">{t('pension.title')}</Heading>

	<!-- Input fields -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<Label for="contributionStartYear" class="mb-2 font-semibold">{t('pension.contributionStartYear')}</Label>
			<Input
				id="contributionStartYear"
				type="number"
				bind:value={contributionStartYear}
				min={1970}
				max={2025}
				class="w-full"
			/>
		</div>

		<div>
			<CurrencyInput
				bind:value={currentSalary}
				label={t('pension.currentSalary')}
				id="pensionSalary"
				step={500}
			/>
		</div>

		<div>
			<PercentInput
				bind:value={salaryGrowthRate}
				label={t('pension.salaryGrowth')}
				id="pensionSalaryGrowth"
				min={0}
				max={10}
				step={0.5}
			/>
		</div>

		<div>
			<Label for="pensionGender" class="mb-2 font-semibold">{t('pension.gender')}</Label>
			<Select
				id="pensionGender"
				items={genderOptions}
				bind:value={gender}
			/>
		</div>

		<div>
			<Label for="pensionContribYears" class="mb-2 font-semibold">{t('pension.contributionYears')}</Label>
			<Input
				id="pensionContribYears"
				type="number"
				bind:value={contributionYears}
				min={0}
				max={50}
				class="w-full"
			/>
		</div>

		<div>
			<Label for="pensionWorkerType" class="mb-2 font-semibold">{t('pension.workerType')}</Label>
			<Select
				id="pensionWorkerType"
				items={workerTypeOptions}
				bind:value={workerType}
			/>
			{#if workerType === 'autonomo'}
				<p class="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('pension.selfEmployedRate')}</p>
			{/if}
		</div>
	</div>

	<!-- Results Card -->
	{#if adjustedResult.monthlyPension > 0}
		<Card class="max-w-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
			<Heading tag="h4" class="mb-4 text-blue-800 dark:text-blue-300">{t('pension.results')}</Heading>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<!-- Montante -->
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.montante')}</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(adjustedResult.totalMontante)}</p>
				</div>

				<!-- Coefficient -->
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.coefficient')}</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{(adjustedResult.transformationCoefficient * 100).toFixed(3)}%</p>
				</div>

				<!-- Replacement Rate -->
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.replacementRate')}</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{formatPercent(adjustedResult.replacementRate * 100)}</p>
				</div>

				<!-- Gross Monthly -->
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.grossMonthly')}</p>
					<p class="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(adjustedResult.monthlyPension)}</p>
				</div>

				<!-- Net Monthly -->
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.netMonthly')}</p>
					<p class="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(netMonthlyPension)}</p>
				</div>

				<!-- Gross Annual -->
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.grossAnnual')}</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(adjustedResult.annualPension)}</p>
				</div>
			</div>

			<!-- Pension Ages -->
			<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.earlyRetirementAge')}</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{earlyRetirementAge} {t('common.years')}</p>
					<p class="text-xs text-gray-400">
						{#if gender === 'M'}
							42 {t('common.years')} 10 {t('common.months')} di contributi
						{:else}
							41 {t('common.years')} 10 {t('common.months')} di contributi
						{/if}
					</p>
				</div>

				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pension.oldAgeRetirementAge')}</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{oldAgeRetirementAge} {t('common.years')}</p>
					<p class="text-xs text-gray-400">20 {t('common.years')} di contributi minimi</p>
				</div>
			</div>

			<!-- FIRE Gap -->
			{#if fireGapYears > 0}
				<div class="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
					<p class="font-semibold text-amber-800 dark:text-amber-300 mb-2">{t('pension.fireGap')}</p>
					<div class="flex flex-wrap gap-6">
						<div>
							<p class="text-2xl font-bold text-amber-700 dark:text-amber-400">{fireGapYears}</p>
							<p class="text-xs text-amber-600 dark:text-amber-500">{t('pension.fireGapYears')}</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(fireGapCost)}</p>
							<p class="text-xs text-amber-600 dark:text-amber-500">{t('pension.fireGapCost')}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- RITA -->
			<div class="mt-4">
				<Alert color="blue">
					<div class="flex items-start gap-2">
						<InfoCircleSolid class="w-5 h-5 mt-0.5 flex-shrink-0" />
						<div>
							<p class="font-semibold mb-1">{t('pension.rita')}</p>
							<p class="text-sm">{t('pension.ritaInfo')}</p>
							{#if ritaEligible}
								<Badge color="green" class="mt-2">{t('pension.ritaEligible')}</Badge>
							{:else}
								<Badge color="yellow" class="mt-2">{t('pension.ritaNotEligible')}</Badge>
							{/if}
						</div>
					</div>
				</Alert>
			</div>
		</Card>
	{/if}
</div>
