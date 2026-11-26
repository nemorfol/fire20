<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Card,
		Button,
		Progressbar,
		Badge
	} from 'flowbite-svelte';
	import {
		HomeSolid,
		ChartMixedDollarSolid,
		UserSolid,
		FireSolid,
		WalletSolid,
		CalendarMonthSolid,
		ArrowRightOutline,
		ChartPieSolid,
		ClockSolid
	} from 'flowbite-svelte-icons';
	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import {
		calculateFireNumber,
		calculateYearsToFire,
		calculateSavingsRate,
		calculateNetWorth,
		calculateLiquidNetWorth,
		liquidMonthlyContributions,
		projectPortfolio,
		type ProjectionParams,
		type YearlyProjection
	} from '$lib/engine/fire-calculator';
	import { pensionFundPlanFromProfile } from '$lib/engine/rita';
	import { blendedCapitalGainsRate } from '$lib/engine/tax-italy';
	import { getPreset } from '$lib/engine/assumptions';
	import { formatCurrency, formatPercent, formatCompact, formatDate } from '$lib/utils/format';
	import StatCard from '$lib/components/shared/StatCard.svelte';
	import EChart from '$lib/components/shared/EChart.svelte';
	import type { CallbackDataParams } from 'echarts/types/dist/shared';
	import MarketTicker from '$lib/components/dashboard/MarketTicker.svelte';
	import RebalanceAlert from '$lib/components/dashboard/RebalanceAlert.svelte';
	import BenchmarkComparison from '$lib/components/dashboard/BenchmarkComparison.svelte';

	let profile = $state<Profile | undefined>(undefined);
	let loading = $state(true);
	let projections = $state<YearlyProjection[]>([]);

	function getNetWorth(p: Profile): number {
		const port = p.portfolio as unknown as Record<string, number>;
		return calculateNetWorth(port);
	}

	// Computed values
	let netWorth = $derived(profile ? getNetWorth(profile) : 0);
	let fireNumber = $derived(
		profile ? calculateFireNumber(profile.fireExpenses, profile.simulation.withdrawalRate) : 0
	);
	let fireProgress = $derived(fireNumber > 0 ? Math.min(100, (netWorth / fireNumber) * 100) : 0);
	let annualSavings = $derived(
		profile ? profile.annualIncome + profile.otherIncome - profile.annualExpenses : 0
	);
	let yearsToFire = $derived(
		profile
			? calculateYearsToFire(netWorth, annualSavings, profile.simulation.expectedReturn, fireNumber)
			: -1
	);
	let savingsRate = $derived(
		profile
			? calculateSavingsRate(profile.annualIncome + profile.otherIncome, profile.annualExpenses)
			: 0
	);
	let monthlyFireIncome = $derived(
		fireNumber > 0 && profile ? (fireNumber * profile.simulation.withdrawalRate) / 12 : 0
	);
	let currentAge = $derived(profile ? new Date().getFullYear() - profile.birthYear : 0);

	// Chart options
	let projectionChartOptions = $derived.by(() => {
		if (projections.length === 0) return {};
		const retirementYear = profile
			? new Date().getFullYear() + (profile.retirementAge - currentAge)
			: 0;
		return {
			tooltip: {
				trigger: 'axis',
				formatter: (params: CallbackDataParams[]) => {
					const p = params[0];
					return `<strong>${p.name}</strong><br/>Portafoglio: ${formatCurrency(p.value as number)}`;
				}
			},
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: {
				type: 'category',
				data: projections.map((p) => p.year.toString()),
				axisLabel: { interval: 'auto' }
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: (v: number) => formatCompact(v)
				}
			},
			series: [
				{
					name: 'Portafoglio',
					type: 'line',
					data: projections.map((p) => Math.round(p.portfolio)),
					smooth: true,
					areaStyle: {
						opacity: 0.15
					},
					lineStyle: { width: 2.5 },
					itemStyle: { color: '#3b82f6' },
					markLine: retirementYear
						? {
								silent: true,
								data: [{ xAxis: retirementYear.toString(), label: { formatter: 'FIRE' } }],
								lineStyle: { color: '#ef4444', type: 'dashed' }
							}
						: undefined
				}
			]
		};
	});

	let allocationChartOptions = $derived.by(() => {
		if (!profile) return {};
		const labels: Record<string, string> = {
			stocks: 'Azioni',
			bonds: 'Obbligazioni',
			cash: "Liquidita'",
			realEstate: 'Immobiliare',
			gold: 'Oro',
			crypto: 'Crypto',
			pensionFund: 'Fondo Pensione',
			tfr: 'TFR',
			other: 'Altro'
		};
		const colors = [
			'#3b82f6',
			'#10b981',
			'#f59e0b',
			'#8b5cf6',
			'#f97316',
			'#06b6d4',
			'#ec4899',
			'#6366f1',
			'#94a3b8'
		];
		const data = Object.entries(profile.portfolio)
			.filter(([, v]) => v > 0)
			.map(([k, v]) => ({ name: labels[k] || k, value: v }));

		return {
			tooltip: {
				trigger: 'item',
				formatter: (p: CallbackDataParams) =>
					`${p.name}: ${formatCurrency(p.value as number)} (${p.percent!.toFixed(1)}%)`
			},
			legend: {
				orient: 'vertical',
				right: '5%',
				top: 'center',
				textStyle: { fontSize: 12 }
			},
			series: [
				{
					type: 'pie',
					radius: ['40%', '70%'],
					center: ['35%', '50%'],
					avoidLabelOverlap: true,
					itemStyle: {
						borderRadius: 6,
						borderColor: '#fff',
						borderWidth: 2
					},
					label: { show: false },
					emphasis: {
						label: { show: true, fontSize: 14, fontWeight: 'bold' }
					},
					data,
					color: colors
				}
			]
		};
	});

	onMount(async () => {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length > 0) {
				profile = profiles[0];
				// Generate projections
				// Proiezione sul solo patrimonio LIQUIDO (immobili, TFR e fondo
				// pensione non sono prelevabili al 4%); il fondo pensione entra come
				// reddito futuro (RITA / prestazione), come nel Calcolatore (#41).
				const totalContributions = liquidMonthlyContributions(
					profile.monthlyContributions as unknown as Record<string, number>
				);
				const currentAge = new Date().getFullYear() - profile.birthYear;
				const params: ProjectionParams = {
					initialPortfolio: calculateLiquidNetWorth(
						profile.portfolio as unknown as Record<string, number>
					),
					annualPension: (profile.pension?.estimatedMonthly || 0) * 13,
					pensionAge: profile.pension?.pensionAge,
					pensionFundPlan: pensionFundPlanFromProfile(profile, {
						currentAge,
						retirementAge: profile.retirementAge,
						pensionAge: profile.pension?.pensionAge ?? 67,
						lifeExpectancy: profile.lifeExpectancy,
						nominalReturn: profile.simulation.expectedReturn,
						inflationRate: profile.simulation.inflationRate,
						assumptions: getPreset(profile.assumptionsId)
					}),
					annualContribution: totalContributions * 12,
					annualExpenses: profile.fireExpenses,
					expectedReturn: profile.simulation.expectedReturn,
					inflationRate: profile.simulation.inflationRate,
					taxRate: blendedCapitalGainsRate(
						profile.portfolio as unknown as Record<string, number>,
						getPreset(profile.assumptionsId).capital
					),
					withdrawalRate: profile.simulation.withdrawalRate,
					currentAge,
					retirementAge: profile.retirementAge,
					lifeExpectancy: profile.lifeExpectancy,
					startYear: new Date().getFullYear()
				};
				projections = projectPortfolio(params);
			}
		} catch (e) {
			console.error('Errore caricamento profilo:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Dashboard - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
</Breadcrumb>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<div class="text-lg text-gray-500 dark:text-gray-400">Caricamento...</div>
	</div>
{:else if !profile}
	<!-- No profile: Getting Started -->
	<div class="mx-auto max-w-2xl py-12 text-center">
		<div class="mb-6">
			<FireSolid class="text-primary-500 mx-auto mb-4 h-16 w-16" />
			<Heading tag="h1" class="mb-4">Benvenuto nel FIRE Planner</Heading>
			<p class="mb-8 text-lg text-gray-600 dark:text-gray-400">
				Per iniziare, crea il tuo profilo finanziario. Inserisci le tue entrate, spese e patrimonio
				per calcolare il tuo percorso verso l'indipendenza finanziaria.
			</p>
		</div>

		<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card>
				<div class="text-center">
					<div
						class="bg-primary-100 dark:bg-primary-900/30 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
					>
						<UserSolid class="text-primary-500 h-6 w-6" />
					</div>
					<h5 class="mb-1 font-semibold text-gray-900 dark:text-white">1. Profilo</h5>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Configura dati personali e finanziari
					</p>
				</div>
			</Card>
			<Card>
				<div class="text-center">
					<div
						class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
					>
						<ChartMixedDollarSolid class="h-6 w-6 text-green-500" />
					</div>
					<h5 class="mb-1 font-semibold text-gray-900 dark:text-white">2. Calcola</h5>
					<p class="text-sm text-gray-500 dark:text-gray-400">Scopri il tuo numero FIRE</p>
				</div>
			</Card>
			<Card>
				<div class="text-center">
					<div
						class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
					>
						<FireSolid class="h-6 w-6 text-red-500" />
					</div>
					<h5 class="mb-1 font-semibold text-gray-900 dark:text-white">3. Simula</h5>
					<p class="text-sm text-gray-500 dark:text-gray-400">Testa la robustezza del piano</p>
				</div>
			</Card>
		</div>

		<Button href="/profilo/" size="lg" class="gap-2">
			<UserSolid class="h-5 w-5" />
			Crea il tuo Profilo
			<ArrowRightOutline class="ml-1 h-4 w-4" />
		</Button>
	</div>
{:else}
	<!-- Dashboard con profilo -->

	<!-- Welcome Section -->
	<div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
		<div>
			<Heading tag="h1" class="mb-1">Ciao, {profile.name}!</Heading>
			<p class="text-gray-500 dark:text-gray-400">
				{formatDate(new Date())} &mdash; Il tuo riepilogo FIRE
			</p>
		</div>
		<Badge color="blue" large class="mt-2 sm:mt-0">
			{currentAge} anni
		</Badge>
	</div>

	<!-- Market Ticker -->
	<MarketTicker />

	<!-- Rebalance Reminder Alert -->
	<RebalanceAlert />

	<!-- Summary Cards Grid -->
	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<StatCard
			title="Patrimonio Netto"
			value={formatCurrency(netWorth)}
			subtitle="Totale investimenti"
			icon={WalletSolid}
			color="blue"
		/>
		<StatCard
			title="FIRE Number"
			value={formatCurrency(fireNumber)}
			subtitle="{formatPercent(profile.simulation.withdrawalRate * 100)} tasso di prelievo"
			icon={FireSolid}
			color="red"
		/>
		<StatCard
			title="Progresso FIRE"
			value="{fireProgress.toFixed(1)}%"
			subtitle="{formatCurrency(fireNumber - netWorth)} rimanenti"
			icon={ChartPieSolid}
			color={fireProgress >= 75 ? 'green' : fireProgress >= 50 ? 'yellow' : 'primary'}
			trend={fireProgress >= 50 ? 'up' : 'neutral'}
		/>
		<StatCard
			title="Anni al FIRE"
			value={yearsToFire === -1 ? 'N/D' : yearsToFire === 0 ? 'Raggiunto!' : `${yearsToFire} anni`}
			subtitle={yearsToFire > 0 ? `Previsto nel ${new Date().getFullYear() + yearsToFire}` : ''}
			icon={CalendarMonthSolid}
			color={yearsToFire === 0 ? 'green' : yearsToFire <= 10 ? 'yellow' : 'primary'}
		/>
		<StatCard
			title="Tasso di Risparmio"
			value={formatPercent(savingsRate * 100)}
			subtitle="{formatCurrency(annualSavings)}/anno risparmiati"
			icon={ChartMixedDollarSolid}
			color={savingsRate >= 0.5 ? 'green' : savingsRate >= 0.3 ? 'yellow' : 'red'}
			trend={savingsRate >= 0.3 ? 'up' : 'down'}
		/>
		<StatCard
			title="Reddito Mensile FIRE"
			value={formatCurrency(monthlyFireIncome)}
			subtitle="Stima in base al SWR"
			icon={HomeSolid}
			color="green"
		/>
	</div>

	<!-- FIRE Progress Bar -->
	<Card class="mb-8 max-w-none">
		<div class="mb-3 flex items-center justify-between">
			<h5 class="text-lg font-semibold text-gray-900 dark:text-white">Progresso verso il FIRE</h5>
			<span class="text-primary-600 dark:text-primary-400 text-2xl font-bold"
				>{fireProgress.toFixed(1)}%</span
			>
		</div>
		<div class="mb-2">
			<Progressbar
				progress={fireProgress}
				size="h-5"
				labelOutside=""
				color={fireProgress >= 75 ? 'green' : fireProgress >= 50 ? 'yellow' : 'blue'}
			/>
		</div>
		<div class="flex justify-between text-sm text-gray-500 dark:text-gray-400">
			<span>Attuale: {formatCurrency(netWorth)}</span>
			<span>Obiettivo: {formatCurrency(fireNumber)}</span>
		</div>
	</Card>

	<!-- Charts Row -->
	<div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Portfolio Projection Chart -->
		<Card class="max-w-none">
			<h5 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				Proiezione del Portafoglio
			</h5>
			{#if projections.length > 0}
				<EChart options={projectionChartOptions} height="350px" />
			{:else}
				<p class="py-8 text-center text-gray-500 dark:text-gray-400">
					Dati insufficienti per la proiezione
				</p>
			{/if}
		</Card>

		<!-- Asset Allocation Pie Chart -->
		<Card class="max-w-none">
			<h5 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				Allocazione del Patrimonio
			</h5>
			{#if netWorth > 0}
				<EChart options={allocationChartOptions} height="350px" />
			{:else}
				<p class="py-8 text-center text-gray-500 dark:text-gray-400">Nessun patrimonio inserito</p>
			{/if}
		</Card>
	</div>

	<!-- FIRE Benchmark Comparison -->
	<div class="mb-8">
		<BenchmarkComparison
			userSavingsRate={savingsRate}
			userFireNumber={fireNumber}
			userYearsToFire={yearsToFire}
		/>
	</div>

	<!-- Quick Actions -->
	<Heading tag="h2" class="mb-4 text-xl">Azioni Rapide</Heading>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card class="max-w-none">
			<div class="mb-3 flex items-center gap-3">
				<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
					<ChartMixedDollarSolid class="h-5 w-5 text-blue-500" />
				</div>
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white">Nuova Simulazione</h5>
			</div>
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				Esegui una simulazione Monte Carlo per testare il tuo piano FIRE.
			</p>
			<Button href="/simulazione/" outline size="sm" class="gap-1">
				Vai alla Simulazione
				<ArrowRightOutline class="h-3.5 w-3.5" />
			</Button>
		</Card>

		<Card class="max-w-none">
			<div class="mb-3 flex items-center gap-3">
				<div class="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
					<UserSolid class="h-5 w-5 text-green-500" />
				</div>
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white">Modifica Profilo</h5>
			</div>
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				Aggiorna i dati finanziari del tuo profilo per risultati piu' accurati.
			</p>
			<Button href="/profilo/" outline color="green" size="sm" class="gap-1">
				Vai al Profilo
				<ArrowRightOutline class="h-3.5 w-3.5" />
			</Button>
		</Card>

		<Card class="max-w-none">
			<div class="mb-3 flex items-center gap-3">
				<div class="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
					<ClockSolid class="h-5 w-5 text-purple-500" />
				</div>
				<h5 class="text-lg font-semibold text-gray-900 dark:text-white">Guida Rapida</h5>
			</div>
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				Scopri come utilizzare al meglio il FIRE Planner e le sue funzionalita'.
			</p>
			<Button href="/guida/" outline color="purple" size="sm" class="gap-1">
				Vai alla Guida
				<ArrowRightOutline class="h-3.5 w-3.5" />
			</Button>
		</Card>
	</div>
{/if}
