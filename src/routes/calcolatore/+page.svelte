<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Alert,
		Spinner
	} from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';

	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import {
		calculateFireNumber,
		calculateYearsToFire,
		calculateSavingsRate,
		calculateNetWorth,
		projectPortfolio,
		calculateCoastFireNumber,
		type YearlyProjection
	} from '$lib/engine/fire-calculator';
	import { optimizeWithdrawalOrder, type WithdrawalPlan } from '$lib/engine/tax-italy';

	import FireHero from '$lib/components/calcolatore/FireHero.svelte';
	import MetricsGrid from '$lib/components/calcolatore/MetricsGrid.svelte';
	import WithdrawalStrategySelector from '$lib/components/calcolatore/WithdrawalStrategySelector.svelte';
	import ParameterControls from '$lib/components/calcolatore/ParameterControls.svelte';
	import ProjectionChart from '$lib/components/calcolatore/ProjectionChart.svelte';
	import ProjectionTable from '$lib/components/calcolatore/ProjectionTable.svelte';
	import TaxOptimization from '$lib/components/calcolatore/TaxOptimization.svelte';

	// === State ===
	let loading = $state(true);
	let profile = $state<Profile | undefined>(undefined);

	// Adjustable parameters
	let swr = $state(4);
	let expectedReturn = $state(7);
	let inflationRate = $state(2);
	let taxMode = $state<'stocks' | 'btp' | 'blended'>('blended');
	let withdrawalStrategy = $state<'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based'>('fixed');

	// === Derived values ===
	let taxRate = $derived(
		taxMode === 'stocks' ? 0.26 : taxMode === 'btp' ? 0.125 : 0.20
	);

	let annualExpenses = $derived(profile ? (profile.fireExpenses || profile.annualExpenses) : 0);
	let withdrawalRate = $derived(swr / 100);

	let fireNumber = $derived(calculateFireNumber(annualExpenses, withdrawalRate));

	let netWorth = $derived(profile ? calculateNetWorth(profile.portfolio as unknown as Record<string, number>) : 0);

	let monthlyContributionsTotal = $derived(
		profile
			? Object.values(profile.monthlyContributions).reduce((s, v) => s + (v || 0), 0) * 12
			: 0
	);

	// I contributi non possono superare il reddito disponibile (reddito - spese)
	let totalIncome = $derived(profile ? (profile.annualIncome || 0) + (profile.otherIncome || 0) : 0);
	let annualSavings = $derived(
		totalIncome > 0
			? Math.min(monthlyContributionsTotal, Math.max(0, totalIncome - (profile?.annualExpenses || 0)))
			: monthlyContributionsTotal
	);

	let yearsToFire = $derived(
		calculateYearsToFire(netWorth, annualSavings, expectedReturn / 100, fireNumber)
	);

	let savingsRate = $derived(
		profile ? calculateSavingsRate(profile.annualIncome, profile.annualExpenses) : 0
	);

	let currentAge = $derived(
		profile ? new Date().getFullYear() - profile.birthYear : 30
	);

	let coastFireNumber = $derived(
		profile
			? calculateCoastFireNumber(
					currentAge,
					profile.retirementAge,
					fireNumber,
					expectedReturn / 100
				)
			: 0
	);

	let gap = $derived(fireNumber - netWorth);

	let retirementAge = $derived(
		profile
			? yearsToFire >= 0 && yearsToFire < 100
				? currentAge + yearsToFire
				: profile.retirementAge
			: 65
	);

	let projections = $derived<YearlyProjection[]>(
		profile
			? projectPortfolio({
					initialPortfolio: netWorth,
					annualContribution: annualSavings,
					annualExpenses: annualExpenses,
					expectedReturn: expectedReturn / 100,
					inflationRate: inflationRate / 100,
					taxRate: taxRate,
					withdrawalRate: withdrawalRate,
					withdrawalStrategy: withdrawalStrategy,
					annualPension: (profile.pension?.estimatedMonthly || 0) * 13,
					pensionAge: profile.pension?.pensionAge || 67,
					currentAge: currentAge,
					retirementAge: retirementAge,
					lifeExpectancy: profile.lifeExpectancy,
					startYear: new Date().getFullYear()
				})
			: []
	);

	let withdrawalPlans = $derived<WithdrawalPlan[]>(
		profile
			? optimizeWithdrawalOrder([
					{ type: 'taxable', balance: (profile.portfolio.stocks || 0) + (profile.portfolio.bonds || 0) + (profile.portfolio.crypto || 0) + (profile.portfolio.gold || 0) },
					{ type: 'pension_fund', balance: profile.portfolio.pensionFund || 0 },
					{ type: 'government_bonds', balance: profile.portfolio.cash || 0 },
					{ type: 'tfr', balance: profile.portfolio.tfr || 0 }
				])
			: []
	);

	// === Load profile ===
	onMount(async () => {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length > 0) {
				profile = profiles[0];
				// Initialize params from profile
				if (profile.simulation) {
					swr = (profile.simulation.withdrawalRate || 0.04) * 100;
					expectedReturn = (profile.simulation.expectedReturn || 0.07) * 100;
					inflationRate = (profile.simulation.inflationRate || 0.02) * 100;
					const strat = profile.simulation.withdrawalStrategy;
					if (strat === 'fixed') withdrawalStrategy = 'fixed';
					else if (strat === 'vpw') withdrawalStrategy = 'vpw';
					else if (strat === 'guyton-klinger') withdrawalStrategy = 'guyton-klinger';
					else if (strat === 'cape-based') withdrawalStrategy = 'cape-based';
				}
			}
		} catch (err) {
			console.error('Errore caricamento profilo:', err);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Calcolatore FIRE - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Calcolatore FIRE</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Calcolatore FIRE</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-8">
	Calcola il tuo numero FIRE, il tasso di risparmio e gli anni necessari per raggiungere
	l'indipendenza finanziaria in base ai tuoi dati.
</p>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<Spinner size="12" />
		<span class="ml-3 text-gray-500 dark:text-gray-400">Caricamento profilo...</span>
	</div>
{:else if !profile}
	<Alert color="yellow" class="max-w-2xl">
		{#snippet icon()}
			<InfoCircleSolid class="w-5 h-5" />
		{/snippet}
		<span class="font-medium">Nessun profilo trovato.</span>
		Per utilizzare il calcolatore FIRE devi prima compilare il tuo profilo finanziario.
		<a
			href="/profilo/"
			class="inline-flex items-center ml-2 font-semibold text-yellow-800 dark:text-yellow-300 underline hover:no-underline"
		>
			Vai al Profilo
		</a>
	</Alert>
{:else}
	<!-- FIRE Number Hero -->
	<div class="mb-8">
		<FireHero {fireNumber} {annualExpenses} {withdrawalRate} />
	</div>

	<!-- Key Metrics -->
	<div class="mb-8">
		<MetricsGrid
			{fireNumber}
			{yearsToFire}
			{savingsRate}
			{netWorth}
			{coastFireNumber}
			{gap}
		/>
	</div>

	<!-- Controls Row: Strategy + Parameters -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<WithdrawalStrategySelector bind:selected={withdrawalStrategy} />
		<ParameterControls bind:swr bind:expectedReturn bind:inflationRate bind:taxMode />
	</div>

	<!-- Projection Chart -->
	<div class="mb-8">
		<ProjectionChart
			{projections}
			{fireNumber}
			{retirementAge}
			{currentAge}
		/>
	</div>

	<!-- Projection Table -->
	<div class="mb-8">
		<ProjectionTable
			{projections}
			{retirementAge}
			pensionAge={profile.pension?.pensionAge ?? 67}
		/>
	</div>

	<!-- Tax Optimization -->
	<div class="mb-8">
		<TaxOptimization plans={withdrawalPlans} />
	</div>
{/if}
