<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Alert
	} from 'flowbite-svelte';
	import {
		ExclamationCircleOutline,
		ArrowRightOutline
	} from 'flowbite-svelte-icons';
	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import {
		calculateNetWorth,
		projectPortfolio,
		type ProjectionParams,
		type YearlyProjection
	} from '$lib/engine/fire-calculator';
	import { PREDEFINED_RISK_EVENTS, applyRiskEvent, type RiskEvent } from '$lib/engine/risk-scenarios';
	import RiskScenarioCard from '$lib/components/rischi/RiskScenarioCard.svelte';
	import CustomScenarioForm from '$lib/components/rischi/CustomScenarioForm.svelte';
	import StressTestResults from '$lib/components/rischi/StressTestResults.svelte';
	import ScenarioComparison from '$lib/components/rischi/ScenarioComparison.svelte';

	let profile = $state<Profile | undefined>(undefined);
	let loading = $state(true);
	let baseline = $state<YearlyProjection[]>([]);

	// Stress test state
	let activeEvent = $state<RiskEvent | undefined>(undefined);
	let stressedData = $state<YearlyProjection[]>([]);

	// Comparison state
	let selectedEventIds = $state<Set<string>>(new Set());
	let comparisonScenarios = $state<{ event: RiskEvent; data: YearlyProjection[] }[]>([]);

	let hasProfile = $derived(!!profile);
	let hasResults = $derived(activeEvent !== undefined && stressedData.length > 0);
	let hasComparison = $derived(comparisonScenarios.length > 0);

	function getNetWorth(p: Profile): number {
		const port = p.portfolio as unknown as Record<string, number>;
		return calculateNetWorth(port);
	}

	function buildProjectionParams(p: Profile): ProjectionParams {
		const totalContributions = Object.values(p.monthlyContributions).reduce(
			(s, v) => s + (v || 0),
			0
		);
		return {
			initialPortfolio: getNetWorth(p),
			annualContribution: totalContributions * 12,
			annualExpenses: p.fireExpenses,
			expectedReturn: p.simulation.expectedReturn,
			inflationRate: p.simulation.inflationRate,
			taxRate: 0.26,
			withdrawalRate: p.simulation.withdrawalRate,
			currentAge: new Date().getFullYear() - p.birthYear,
			retirementAge: p.retirementAge,
			lifeExpectancy: p.lifeExpectancy,
			startYear: new Date().getFullYear()
		};
	}

	function applyStressTest(event: RiskEvent) {
		if (!profile || baseline.length === 0) return;
		activeEvent = event;
		stressedData = applyRiskEvent(baseline, event);

		// Scroll to results
		setTimeout(() => {
			document.getElementById('stress-results')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	function toggleSelect(event: RiskEvent) {
		const newSet = new Set(selectedEventIds);
		if (newSet.has(event.id)) {
			newSet.delete(event.id);
		} else {
			newSet.add(event.id);
		}
		selectedEventIds = newSet;
		updateComparison();
	}

	function updateComparison() {
		if (!profile || baseline.length === 0) return;

		const allEvents = [...PREDEFINED_RISK_EVENTS];
		comparisonScenarios = allEvents
			.filter((e) => selectedEventIds.has(e.id))
			.map((event) => ({
				event,
				data: applyRiskEvent(baseline, event)
			}));
	}

	function handleCustomScenario(event: RiskEvent) {
		applyStressTest(event);
	}

	onMount(async () => {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length > 0) {
				profile = profiles[0];
				const params = buildProjectionParams(profile);
				baseline = projectPortfolio(params);
			}
		} catch (e) {
			console.error('Errore caricamento profilo:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Scenari di Rischio - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Scenari di Rischio</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Scenari di Rischio</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-8">
	Analizza come eventi avversi potrebbero impattare il tuo piano FIRE:
	crolli di mercato, inflazione elevata, spese impreviste e altro.
</p>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<div class="text-gray-500 dark:text-gray-400 text-lg">Caricamento...</div>
	</div>
{:else if !hasProfile}
	<Alert color="yellow" class="mb-6">
		{#snippet icon()}
			<ExclamationCircleOutline class="w-5 h-5" />
		{/snippet}
		<span class="font-medium">Profilo non trovato.</span> Per eseguire gli stress test devi prima creare un profilo finanziario.
		<a href="/profilo/" class="ml-2 inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-300 underline font-medium">
			Crea Profilo <ArrowRightOutline class="w-3 h-3" />
		</a>
	</Alert>
{:else}
	<!-- Predefined Scenarios Grid -->
	<Heading tag="h2" class="text-xl mb-4">Scenari Predefiniti</Heading>
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
		{#each PREDEFINED_RISK_EVENTS as event (event.id)}
			<RiskScenarioCard
				{event}
				selected={selectedEventIds.has(event.id)}
				onApply={applyStressTest}
				onToggleSelect={toggleSelect}
			/>
		{/each}
	</div>

	<!-- Scenario Comparison -->
	{#if hasComparison}
		<div class="mb-10">
			<Heading tag="h2" class="text-xl mb-4">Confronto Scenari</Heading>
			<ScenarioComparison {baseline} scenarios={comparisonScenarios} />
		</div>
	{/if}

	<!-- Stress Test Results -->
	{#if hasResults && activeEvent}
		<div id="stress-results" class="mb-10">
			<Heading tag="h2" class="text-xl mb-4">Risultati Stress Test</Heading>
			<StressTestResults {baseline} stressed={stressedData} event={activeEvent} />
		</div>
	{/if}

	<!-- Custom Scenario Creator -->
	<div class="mb-10">
		<Heading tag="h2" class="text-xl mb-4">Scenario Personalizzato</Heading>
		<CustomScenarioForm onSubmit={handleCustomScenario} />
	</div>
{/if}
