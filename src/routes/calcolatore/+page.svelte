<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Alert,
		Spinner,
		Tabs,
		TabItem
	} from 'flowbite-svelte';
	import {
		InfoCircleSolid,
		ChartPieOutline,
		ChartMixedDollarSolid,
		TableColumnSolid,
		CashSolid
	} from 'flowbite-svelte-icons';
	import { formatCurrency } from '$lib/utils/format';

	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import {
		calculateFireNumber,
		calculateFireNumberWithPension,
		calculateYearsToFire,
		calculateSavingsRate,
		calculateNetWorth,
		calculateLiquidNetWorth,
		calculateIlliquidNetWorth,
		projectPortfolio,
		calculateCoastFireNumber,
		type YearlyProjection
	} from '$lib/engine/fire-calculator';
	import { optimizeWithdrawalOrder, type WithdrawalPlan } from '$lib/engine/tax-italy';
	import { DEFAULT_2026, getPreset, type AssumptionSet } from '$lib/engine/assumptions';

	import FireHero from '$lib/components/calcolatore/FireHero.svelte';
	import AssumptionsPanel from '$lib/components/shared/AssumptionsPanel.svelte';
	import SensitivityTornado from '$lib/components/calcolatore/SensitivityTornado.svelte';
	import MetricsGrid from '$lib/components/calcolatore/MetricsGrid.svelte';
	import WithdrawalStrategySelector from '$lib/components/calcolatore/WithdrawalStrategySelector.svelte';
	import ParameterControls from '$lib/components/calcolatore/ParameterControls.svelte';
	import WhatIfPanel from '$lib/components/calcolatore/WhatIfPanel.svelte';
	import ProjectionChart from '$lib/components/calcolatore/ProjectionChart.svelte';
	import ProjectionTable from '$lib/components/calcolatore/ProjectionTable.svelte';
	import TaxOptimization from '$lib/components/calcolatore/TaxOptimization.svelte';
	import PresetSelector from '$lib/components/calcolatore/PresetSelector.svelte';

	// === State ===
	let loading = $state(true);
	let profile = $state<Profile | undefined>(undefined);

	// Adjustable parameters
	let swr = $state(4);
	let expectedReturn = $state(7);
	let inflationRate = $state(2);
	let taxMode = $state<'stocks' | 'btp' | 'blended'>('blended');
	let withdrawalStrategy = $state<'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based'>('fixed');

	// === What-If overrides (initialized from profile in onMount) ===
	let wiAnnualExpenses = $state(20000);
	let wiInitialPortfolio = $state(0);
	let wiAnnualContribution = $state(0);
	let wiRetirementAge = $state(65);
	let wiPensionAmount = $state(0);
	let wiPensionAge = $state(67);
	let wiLifeExpectancy = $state(90);
	let wiOtherIncome = $state(0);
	let wiOtherIncomeEndAge = $state(90);

	// Set ipotesi fiscali attivo (default 2026, il profilo puo' suggerire altro via assumptionsId)
	let assumptions = $state<AssumptionSet>(DEFAULT_2026);

	// Profile defaults for reset & change detection
	let wiDefaults = $state({
		annualExpenses: 20000,
		initialPortfolio: 0,
		annualContribution: 0,
		retirementAge: 65,
		pensionAmount: 0,
		pensionAge: 67,
		lifeExpectancy: 90,
		otherIncome: 0,
		otherIncomeEndAge: 90
	});

	function resetWhatIf() {
		wiAnnualExpenses = wiDefaults.annualExpenses;
		wiInitialPortfolio = wiDefaults.initialPortfolio;
		wiAnnualContribution = wiDefaults.annualContribution;
		wiRetirementAge = wiDefaults.retirementAge;
		wiPensionAmount = wiDefaults.pensionAmount;
		wiPensionAge = wiDefaults.pensionAge;
		wiLifeExpectancy = wiDefaults.lifeExpectancy;
		wiOtherIncome = wiDefaults.otherIncome;
		wiOtherIncomeEndAge = wiDefaults.otherIncomeEndAge;
	}

	// === Derived values ===
	let taxRate = $derived(
		taxMode === 'stocks' ? 0.26 : taxMode === 'btp' ? 0.125 : 0.20
	);

	let annualExpenses = $derived(wiAnnualExpenses);
	let withdrawalRate = $derived(swr / 100);

	// FIRE number tiene conto della pensione INPS, del "ponte" prima di riceverla
	// e di eventuali altri redditi perpetui (affitti, dividendi, rendite)
	let annualPensionIncome = $derived(wiPensionAmount * 13);
	let realReturn = $derived((1 + expectedReturn / 100) / (1 + inflationRate / 100) - 1);
	let fireNumberClassic = $derived(calculateFireNumber(annualExpenses, withdrawalRate));
	let fireNumber = $derived(
		calculateFireNumberWithPension({
			annualExpenses,
			withdrawalRate,
			annualPension: annualPensionIncome,
			retirementAge: wiRetirementAge,
			pensionAge: wiPensionAge,
			lifeExpectancy: wiLifeExpectancy,
			realReturn,
			otherIncome: wiOtherIncome,
			otherIncomeEndAge: wiOtherIncomeEndAge,
			children: profile?.children,
			mortgage: profile?.mortgage,
			baseYear: new Date().getFullYear(),
			currentAge: profile ? new Date().getFullYear() - profile.birthYear : 30
		})
	);
	let bridgeYears = $derived(Math.max(0, wiPensionAge - wiRetirementAge));
	let hasPensionBridge = $derived(annualPensionIncome > 0 && bridgeYears > 0);

	// Patrimonio totale (info), liquido (usato per FIRE) e illiquido (immobili/TFR)
	let netWorth = $derived(profile ? calculateNetWorth(profile.portfolio as unknown as Record<string, number>) : 0);
	let liquidNetWorth = $derived(profile ? calculateLiquidNetWorth(profile.portfolio as unknown as Record<string, number>) : 0);
	let illiquidNetWorth = $derived(profile ? calculateIlliquidNetWorth(profile.portfolio as unknown as Record<string, number>) : 0);

	let annualSavings = $derived(wiAnnualContribution);

	let yearsToFire = $derived(
		calculateYearsToFire(wiInitialPortfolio, annualSavings, expectedReturn / 100, fireNumber, inflationRate / 100)
	);

	let savingsRate = $derived(
		profile
			? calculateSavingsRate(
					(profile.annualIncome || 0) + (profile.otherIncome || 0),
					profile.annualExpenses
				)
			: 0
	);

	let currentAge = $derived(
		profile ? new Date().getFullYear() - profile.birthYear : 30
	);

	let coastFireNumber = $derived(
		profile
			? calculateCoastFireNumber(
					currentAge,
					wiRetirementAge,
					fireNumber,
					expectedReturn / 100,
					inflationRate / 100
				)
			: 0
	);

	let gap = $derived(fireNumber - wiInitialPortfolio);

	// Trasparenza: il FIRE puo' risultare "troppo presto" per ipotesi ottimistiche
	// (fondo pensione contato come liquido, pensione/altri redditi che abbattono
	// il target). Mostriamo un avviso che spiega i driver quando capita.
	let pensionFundAmount = $derived(profile?.portfolio?.pensionFund ?? 0);
	let fireReductionVsClassic = $derived(Math.max(0, fireNumberClassic - fireNumber));
	let fireLooksEarly = $derived(yearsToFire >= 0 && yearsToFire <= 1);

	let retirementAge = $derived(wiRetirementAge);

	let projections = $derived<YearlyProjection[]>(
		profile
			? projectPortfolio({
					initialPortfolio: wiInitialPortfolio,
					annualContribution: annualSavings,
					annualExpenses: annualExpenses,
					expectedReturn: expectedReturn / 100,
					inflationRate: inflationRate / 100,
					taxRate: taxRate,
					withdrawalRate: withdrawalRate,
					withdrawalStrategy: withdrawalStrategy,
					annualPension: annualPensionIncome,
					pensionAge: wiPensionAge,
					otherIncome: wiOtherIncome,
					otherIncomeEndAge: wiOtherIncomeEndAge,
					currentAge: currentAge,
					retirementAge: retirementAge,
					lifeExpectancy: wiLifeExpectancy,
					startYear: new Date().getFullYear(),
					children: profile.children,
					mortgage: profile.mortgage,
					lifeEvents: profile.lifeEvents,
					spouse: profile.spouse,
					assumptions: assumptions,
					foreignBrokerShare: profile.foreignBrokerShare ?? 0,
					glidePathEnabled: profile.glidePathEnabled ?? false,
					glidePathStartEquity: profile.glidePathStartEquity,
					glidePathEndEquity: profile.glidePathEndEquity
				})
			: []
	);

	// Parametri baseline per il sensitivity tornado
	let sensitivityParams = $derived(
		profile
			? {
					initialPortfolio: wiInitialPortfolio,
					annualContribution: annualSavings,
					annualExpenses: annualExpenses,
					expectedReturn: expectedReturn / 100,
					inflationRate: inflationRate / 100,
					taxRate: taxRate,
					withdrawalRate: withdrawalRate,
					withdrawalStrategy: withdrawalStrategy,
					annualPension: annualPensionIncome,
					pensionAge: wiPensionAge,
					otherIncome: wiOtherIncome,
					otherIncomeEndAge: wiOtherIncomeEndAge,
					currentAge: currentAge,
					retirementAge: retirementAge,
					lifeExpectancy: wiLifeExpectancy,
					startYear: new Date().getFullYear(),
					children: profile.children,
					mortgage: profile.mortgage,
					lifeEvents: profile.lifeEvents,
					spouse: profile.spouse,
					assumptions: assumptions,
					foreignBrokerShare: profile.foreignBrokerShare ?? 0,
					glidePathEnabled: profile.glidePathEnabled ?? false
				}
			: null
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

	// === Helper: initialize What-If state from profile ===
	function initWhatIfFromProfile(p: Profile) {
		// Usiamo il patrimonio LIQUIDO come base per il FIRE (immobili e TFR
		// non sono prelevabili al 4%).
		const liquidNw = calculateLiquidNetWorth(p.portfolio as unknown as Record<string, number>);
		const monthlyTotal = Object.values(p.monthlyContributions).reduce((s, v) => s + (v || 0), 0) * 12;
		const income = (p.annualIncome || 0) + (p.otherIncome || 0);
		// I contributi non possono superare il reddito disponibile
		const contribution = income > 0
			? Math.min(monthlyTotal, Math.max(0, income - (p.annualExpenses || 0)))
			: 0;

		const lifeExp = p.lifeExpectancy || 90;
		const defaults = {
			annualExpenses: p.fireExpenses || p.annualExpenses || 20000,
			initialPortfolio: liquidNw,
			annualContribution: contribution,
			retirementAge: p.retirementAge || 65,
			pensionAmount: p.pension?.estimatedMonthly || 0,
			pensionAge: p.pension?.pensionAge || 67,
			lifeExpectancy: lifeExp,
			otherIncome: p.otherIncome || 0,
			otherIncomeEndAge: p.otherIncomeEndAge ?? lifeExp
		};

		wiDefaults = { ...defaults };
		wiAnnualExpenses = defaults.annualExpenses;
		wiInitialPortfolio = defaults.initialPortfolio;
		wiAnnualContribution = defaults.annualContribution;
		wiRetirementAge = defaults.retirementAge;
		wiPensionAmount = defaults.pensionAmount;
		wiPensionAge = defaults.pensionAge;
		wiLifeExpectancy = defaults.lifeExpectancy;
		wiOtherIncome = defaults.otherIncome;
		wiOtherIncomeEndAge = defaults.otherIncomeEndAge;
	}

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
				initWhatIfFromProfile(profile);
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
	<!-- Pannello "Ipotesi attive" sempre visibile sopra ai tab: rende il calcolo verificabile -->
	<AssumptionsPanel bind:assumptions />

	<Tabs tabStyle="underline" contentClass="p-0 mt-6">
		<TabItem open>
			{#snippet titleSlot()}
				<div class="flex items-center gap-2">
					<ChartPieOutline class="w-4 h-4" />
					Panoramica
				</div>
			{/snippet}

			<!-- FIRE Number Hero -->
			<div class="mb-6">
				<FireHero
					{fireNumber}
					{annualExpenses}
					{withdrawalRate}
					annualPension={annualPensionIncome}
					{fireNumberClassic}
					{hasPensionBridge}
					{bridgeYears}
					pensionAge={wiPensionAge}
					retirementAge={wiRetirementAge}
					otherIncome={wiOtherIncome}
					otherIncomeEndAge={wiOtherIncomeEndAge}
				/>
			</div>

			<!-- Key Metrics -->
			<MetricsGrid
				{fireNumber}
				{yearsToFire}
				{savingsRate}
				{netWorth}
				{liquidNetWorth}
				{illiquidNetWorth}
				{coastFireNumber}
				{gap}
			/>

			{#if fireLooksEarly}
				<Alert color="yellow" class="mt-6">
					{#snippet icon()}
						<InfoCircleSolid class="w-5 h-5" />
					{/snippet}
					<span class="font-medium">FIRE molto vicino: controlla le ipotesi.</span>
					<p class="mt-2 text-sm">
						Il risultato indica che sei (quasi) gia' FIRE. Spesso dipende da ipotesi
						ottimistiche che vale la pena verificare:
					</p>
					<ul class="mt-2 ml-4 list-disc text-sm space-y-1">
						{#if pensionFundAmount > 0}
							<li>
								Il patrimonio di partenza usato per il calcolo ({formatCurrency(wiInitialPortfolio)})
								comprende, nel dato di profilo, il <strong>fondo pensione</strong>
								({formatCurrency(pensionFundAmount)}), prelevabile
								pero' solo via <strong>RITA</strong> in prossimita' della pensione: oggi non e'
								davvero disponibile per vivere di rendita.
							</li>
						{/if}
						{#if annualPensionIncome > 0}
							<li>
								Il FIRE number e' ridotto dal valore attuale della <strong>pensione INPS</strong>
								(~{formatCurrency(annualPensionIncome)}/anno dai {wiPensionAge} anni).
							</li>
						{/if}
						{#if wiOtherIncome > 0}
							<li>
								Sono conteggiati <strong>altri redditi</strong> ({formatCurrency(wiOtherIncome)}/anno)
								come rendita che abbassa il capitale necessario.
							</li>
						{/if}
						{#if fireReductionVsClassic > 0}
							<li>
								Senza questi aiuti il FIRE number "classico" (spese / SWR) sarebbe
								<strong>{formatCurrency(fireNumberClassic)}</strong>, non {formatCurrency(fireNumber)}.
							</li>
						{/if}
					</ul>
					<p class="mt-2 text-sm">
						Apri la <strong>Simulazione Monte Carlo</strong> per testare la robustezza del piano
						contro i ribassi di mercato.
					</p>
				</Alert>
			{/if}
		</TabItem>

		<TabItem>
			{#snippet titleSlot()}
				<div class="flex items-center gap-2">
					<ChartMixedDollarSolid class="w-4 h-4" />
					Simulazione
				</div>
			{/snippet}

			<!-- Preset Modes -->
			<div class="mb-6">
				<PresetSelector bind:swr bind:expectedReturn bind:inflationRate />
			</div>

			<!-- Controls Row: Strategy + Parameters -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<WithdrawalStrategySelector bind:selected={withdrawalStrategy} />
				<ParameterControls bind:swr bind:expectedReturn bind:inflationRate bind:taxMode />
			</div>

			<!-- What-If Panel -->
			<div class="mb-6">
				<WhatIfPanel
					bind:annualExpenses={wiAnnualExpenses}
					bind:initialPortfolio={wiInitialPortfolio}
					bind:annualContribution={wiAnnualContribution}
					bind:retirementAge={wiRetirementAge}
					bind:pensionAmount={wiPensionAmount}
					bind:pensionAge={wiPensionAge}
					bind:lifeExpectancy={wiLifeExpectancy}
					bind:otherIncome={wiOtherIncome}
					bind:otherIncomeEndAge={wiOtherIncomeEndAge}
					defaults={wiDefaults}
					onreset={resetWhatIf}
				/>
			</div>

			<!-- Sensitivity Analysis: tornado chart sulle leve principali -->
			{#if sensitivityParams}
				<div class="mb-6">
					<SensitivityTornado baseParams={sensitivityParams} shock={0.1} metric="finalPortfolio" />
				</div>
			{/if}

			<!-- Projection Chart -->
			<ProjectionChart
				{projections}
				{fireNumber}
				{retirementAge}
				{currentAge}
				inflationRate={inflationRate / 100}
			/>
		</TabItem>

		<TabItem>
			{#snippet titleSlot()}
				<div class="flex items-center gap-2">
					<TableColumnSolid class="w-4 h-4" />
					Cash flow
				</div>
			{/snippet}

			<ProjectionTable
				{projections}
				{retirementAge}
				pensionAge={wiPensionAge}
			/>
		</TabItem>

		<TabItem>
			{#snippet titleSlot()}
				<div class="flex items-center gap-2">
					<CashSolid class="w-4 h-4" />
					Prelievi
				</div>
			{/snippet}

			<TaxOptimization plans={withdrawalPlans} />
		</TabItem>
	</Tabs>
{/if}
