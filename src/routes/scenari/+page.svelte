<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading, Breadcrumb, BreadcrumbItem, Card, Button,
		Badge, Checkbox, Alert, Spinner, Toast
	} from 'flowbite-svelte';
	import {
		PlusOutline, TrashBinOutline, EditOutline,
		CheckCircleSolid, CloseCircleSolid,
		FileCopySolid, PlaySolid, ChartOutline
	} from 'flowbite-svelte-icons';
	import type { Profile, Scenario, SimulationResult } from '$lib/db/index';
	import {
		getAllScenarios, createScenario, updateScenario, deleteScenario
	} from '$lib/db/scenarios';
	import { getAllProfiles } from '$lib/db/profiles';
	import { getAllResults, createResult } from '$lib/db/results';
	import { calculateNetWorth } from '$lib/engine/fire-calculator';
	import type { MonteCarloParams, MonteCarloResult } from '$lib/engine/monte-carlo';
	import { sp500Returns } from '$lib/data/sp500';
	import { bondReturns } from '$lib/data/bonds';
	import { inflationUSReturns } from '$lib/data/inflation-us';
	import { formatCurrency, formatPercent, formatDate } from '$lib/utils/format';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import ScenarioForm from '$lib/components/scenari/ScenarioForm.svelte';
	import ScenarioComparison from '$lib/components/scenari/ScenarioComparison.svelte';

	// === State ===
	let loading = $state(true);
	let scenarios = $state<Scenario[]>([]);
	let profiles = $state<Profile[]>([]);
	let results = $state<SimulationResult[]>([]);

	// Form
	let showForm = $state(false);
	let editingScenario = $state<Scenario | null>(null);

	// Delete confirmation
	let showDeleteDialog = $state(false);
	let deletingId = $state<number | null>(null);

	// Selection for comparison
	let selectedIds = $state<Set<number>>(new Set());
	let showComparison = $state(false);

	// Toast
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');
	let showToast = $state(false);

	// Running simulation
	let runningScenarioId = $state<number | null>(null);
	let runProgress = $state(0);
	let worker: Worker | null = null;

	// Historical returns for simulations
	const historicalStockReturns = sp500Returns.map((r) => r.value / 100);
	const historicalBondReturns = bondReturns.map((r) => r.value / 100);
	const historicalInflation = inflationUSReturns.map((r) => r.value / 100);

	const TYPE_LABELS: Record<string, string> = {
		optimistic: 'Ottimistico',
		pessimistic: 'Pessimistico',
		custom: 'Personalizzato',
		historical: 'Storico'
	};

	const TYPE_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'blue'> = {
		optimistic: 'green',
		pessimistic: 'red',
		custom: 'yellow',
		historical: 'blue'
	};

	onMount(() => {
		loadData();
		return () => {
			worker?.terminate();
		};
	});

	async function loadData() {
		loading = true;
		try {
			[scenarios, profiles, results] = await Promise.all([
				getAllScenarios(),
				getAllProfiles(),
				getAllResults()
			]);
		} catch {
			notify('Errore nel caricamento dei dati', 'error');
		}
		loading = false;
	}

	function notify(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => { showToast = false; }, 4000);
	}

	function getProfileName(profileId: number): string {
		return profiles.find((p) => p.id === profileId)?.name ?? 'Profilo sconosciuto';
	}

	function getResult(scenarioId: number): SimulationResult | undefined {
		return results.find((r) => r.scenarioId === scenarioId);
	}

	// === CRUD Handlers ===

	async function handleSave(data: {
		name: string;
		description: string;
		type: Scenario['type'];
		profileId: number;
		overrides: Partial<Profile>;
	}) {
		try {
			if (editingScenario) {
				await updateScenario(editingScenario.id, {
					name: data.name,
					description: data.description,
					type: data.type,
					profileId: data.profileId,
					overrides: data.overrides
				});
				notify('Scenario aggiornato con successo');
			} else {
				await createScenario({
					name: data.name,
					description: data.description,
					type: data.type,
					profileId: data.profileId,
					overrides: data.overrides
				});
				notify('Scenario creato con successo');
			}
			editingScenario = null;
			await loadData();
		} catch {
			notify('Errore nel salvataggio', 'error');
		}
	}

	function handleEdit(scenario: Scenario) {
		editingScenario = scenario;
		showForm = true;
	}

	function handleNew() {
		editingScenario = null;
		showForm = true;
	}

	function confirmDelete(id: number) {
		deletingId = id;
		showDeleteDialog = true;
	}

	async function handleDelete() {
		if (deletingId === null) return;
		try {
			await deleteScenario(deletingId);
			selectedIds.delete(deletingId);
			selectedIds = new Set(selectedIds);
			notify('Scenario eliminato');
			await loadData();
		} catch {
			notify('Errore nella cancellazione', 'error');
		}
		deletingId = null;
	}

	async function handleDuplicate(scenario: Scenario) {
		try {
			await createScenario({
				name: scenario.name + ' (copia)',
				description: scenario.description,
				type: scenario.type,
				profileId: scenario.profileId,
				overrides: { ...scenario.overrides }
			});
			notify('Scenario duplicato');
			await loadData();
		} catch {
			notify('Errore nella duplicazione', 'error');
		}
	}

	// === Selection ===

	function toggleSelection(id: number) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			if (selectedIds.size >= 4) {
				notify('Puoi selezionare al massimo 4 scenari', 'error');
				return;
			}
			selectedIds.add(id);
		}
		selectedIds = new Set(selectedIds);
	}

	function openComparison() {
		showComparison = true;
	}

	let selectedScenarios = $derived(
		scenarios.filter((s) => selectedIds.has(s.id))
	);

	// === Run Simulation ===

	function handleRunSimulation(scenario: Scenario) {
		const profile = profiles.find((p) => p.id === scenario.profileId);
		if (!profile) {
			notify('Profilo non trovato', 'error');
			return;
		}
		if (runningScenarioId !== null) {
			notify('Una simulazione e\' gia in corso', 'error');
			return;
		}

		const o = scenario.overrides ?? {};
		const simO = (o as any).simulation ?? {};

		const withdrawalRate = simO.withdrawalRate != null ? simO.withdrawalRate / 100 : profile.simulation.withdrawalRate;
		const stockAllocation = simO.stockAllocation != null ? simO.stockAllocation / 100 : profile.simulation.stockAllocation;
		const bondAllocation = 1 - stockAllocation;
		const inflationRate = simO.inflationRate != null ? simO.inflationRate / 100 : profile.simulation.inflationRate;
		const expectedReturn = simO.expectedReturn != null ? simO.expectedReturn / 100 : profile.simulation.expectedReturn;
		const annualExpenses = o.fireExpenses ?? profile.fireExpenses;
		const retirementAge = o.retirementAge ?? profile.retirementAge;
		const currentYear = new Date().getFullYear();
		const currentAge = currentYear - profile.birthYear;
		const yearsToFire = Math.max(0, retirementAge - currentAge);
		const yearsInRetirement = profile.lifeExpectancy - retirementAge;
		const netWorth = calculateNetWorth(profile.portfolio as unknown as Record<string, number>);
		const annualContribution = Object.values(profile.monthlyContributions).reduce((s, v) => s + (v || 0), 0) * 12;
		const iterations = profile.simulation.iterations || 10000;

		runningScenarioId = scenario.id;
		runProgress = 0;

		worker?.terminate();

		try {
			worker = new Worker(
				new URL('$lib/workers/monte-carlo.worker.ts', import.meta.url),
				{ type: 'module' }
			);

			worker.onmessage = async (e: MessageEvent) => {
				const data = e.data;
				if (data.type === 'progress') {
					runProgress = data.percent;
				} else if (data.type === 'result') {
					const mcResult = data.data as MonteCarloResult;
					const totalYears = yearsToFire + yearsInRetirement;
					const finalYear = mcResult.percentiles.p5.length - 1;
					try {
						await createResult({
							scenarioId: scenario.id,
							profileId: scenario.profileId,
							iterations,
							years: totalYears,
							successRate: mcResult.successRate,
							medianFinalValue: mcResult.medianFinalValue,
							percentiles: {
								p5: mcResult.percentiles.p5[finalYear] ?? 0,
								p10: mcResult.percentiles.p10[finalYear] ?? 0,
								p25: mcResult.percentiles.p25[finalYear] ?? 0,
								p50: mcResult.percentiles.p50[finalYear] ?? 0,
								p75: mcResult.percentiles.p75[finalYear] ?? 0,
								p90: mcResult.percentiles.p90[finalYear] ?? 0,
								p95: mcResult.percentiles.p95[finalYear] ?? 0
							},
							yearlyData: mcResult.yearlyStats.map((s) => ({
								year: s.year,
								median: s.median,
								p5: s.p5,
								p25: mcResult.percentiles.p25[s.year - 1] ?? 0,
								p75: mcResult.percentiles.p75[s.year - 1] ?? 0,
								p95: s.p95,
								successRate: s.successRate
							})),
							params: {
								withdrawalRate: withdrawalRate * 100,
								withdrawalStrategy: profile.simulation.withdrawalStrategy,
								stockAllocation: stockAllocation * 100,
								bondAllocation: bondAllocation * 100,
								glidePathEnabled: profile.simulation.glidePathEnabled,
								inflationRate: inflationRate * 100,
								expectedReturn: expectedReturn * 100,
								iterations
							}
						});
						await loadData();
						notify('Simulazione completata e salvata!');
					} catch {
						notify('Simulazione completata ma errore nel salvataggio', 'error');
					}
					runningScenarioId = null;
				} else if (data.type === 'error') {
					notify(`Errore simulazione: ${data.message}`, 'error');
					runningScenarioId = null;
				}
			};

			worker.onerror = () => {
				notify('Errore nel worker della simulazione', 'error');
				runningScenarioId = null;
			};

			worker.postMessage({
				type: 'run',
				params: {
					initialPortfolio: netWorth,
					annualContribution,
					annualExpenses,
					withdrawalRate,
					withdrawalStrategy: profile.simulation.withdrawalStrategy,
					stockAllocation,
					bondAllocation,
					yearsToFire,
					yearsInRetirement,
					inflationRate,
					simulationMode: 'historical',
					iterations,
					historicalStockReturns,
					historicalBondReturns,
					historicalInflation
				} satisfies MonteCarloParams
			});
		} catch {
			notify('Impossibile avviare la simulazione', 'error');
			runningScenarioId = null;
		}
	}
</script>

<svelte:head>
	<title>Scenari Salvati - FIRE Planner</title>
</svelte:head>

<!-- Toast notification -->
{#if showToast}
	<div class="fixed top-4 right-4 z-50">
		<Toast color={toastType === 'success' ? 'green' : 'red'} dismissable toastStatus={showToast}>
			{#snippet icon()}
				{#if toastType === 'success'}
					<CheckCircleSolid class="w-5 h-5" />
				{:else}
					<CloseCircleSolid class="w-5 h-5" />
				{/if}
			{/snippet}
			{toastMessage}
		</Toast>
	</div>
{/if}

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Scenari Salvati</BreadcrumbItem>
</Breadcrumb>

{#if showComparison && selectedScenarios.length >= 2}
	<!-- Comparison view -->
	<ScenarioComparison
		scenarios={selectedScenarios}
		{profiles}
		{results}
		onClose={() => { showComparison = false; }}
	/>
{:else}
	<!-- Main list view -->
	<div class="flex items-start justify-between mb-6 flex-wrap gap-4">
		<div>
			<Heading tag="h1" class="mb-2">Scenari Salvati</Heading>
			<p class="text-gray-600 dark:text-gray-400">
				Gestisci e confronta i tuoi scenari FIRE. Seleziona fino a 4 scenari per confrontarli.
			</p>
		</div>
		<div class="flex gap-3 flex-wrap">
			{#if selectedIds.size >= 2}
				<Button color="blue" onclick={openComparison}>
					<ChartOutline class="w-4 h-4 me-2" />
					Confronta Selezionati ({selectedIds.size})
				</Button>
			{/if}
			<Button color="primary" onclick={handleNew}>
				<PlusOutline class="w-4 h-4 me-2" />
				Nuovo Scenario
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<Spinner size="10" />
		</div>
	{:else if profiles.length === 0}
		<Alert color="yellow" class="mb-6">
			<span class="font-medium">Nessun profilo trovato.</span>
			Crea prima un profilo nella sezione
			<a href="/profilo" class="underline font-semibold">Profilo</a>
			per poter creare scenari.
		</Alert>
	{:else if scenarios.length === 0}
		<Card class="max-w-none">
			<div class="text-center py-8">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					Nessuno scenario salvato. Crea il tuo primo scenario per iniziare a pianificare.
				</p>
				<Button color="primary" onclick={handleNew}>
					<PlusOutline class="w-4 h-4 me-2" />
					Crea Primo Scenario
				</Button>
			</div>
		</Card>
	{:else}
		<!-- Scenario Cards Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each scenarios as scenario (scenario.id)}
				{@const result = getResult(scenario.id)}
				{@const isSelected = selectedIds.has(scenario.id)}
				{@const isRunning = runningScenarioId === scenario.id}
				<Card class="max-w-none relative {isSelected ? 'ring-2 ring-blue-500' : ''}">
					<!-- Selection checkbox -->
					<div class="absolute top-4 right-4">
						<Checkbox
							checked={isSelected}
							onchange={() => toggleSelection(scenario.id)}
						/>
					</div>

					<!-- Header -->
					<div class="mb-3 pr-8">
						<div class="flex items-center gap-2 mb-1">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
								{scenario.name}
							</h3>
						</div>
						<div class="flex items-center gap-2 flex-wrap">
							<Badge color={TYPE_COLORS[scenario.type]}>
								{TYPE_LABELS[scenario.type]}
							</Badge>
							<span class="text-xs text-gray-500 dark:text-gray-400">
								{getProfileName(scenario.profileId)}
							</span>
						</div>
					</div>

					<!-- Description -->
					{#if scenario.description}
						<p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
							{scenario.description}
						</p>
					{/if}

					<!-- Result summary -->
					<div class="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
						{#if result}
							<div class="grid grid-cols-2 gap-2 text-sm">
								<div>
									<span class="text-gray-500 dark:text-gray-400">Successo:</span>
									<span class={result.successRate >= 0.9 ? 'text-green-600 font-bold' : result.successRate >= 0.7 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>
										{formatPercent(result.successRate * 100)}
									</span>
								</div>
								<div>
									<span class="text-gray-500 dark:text-gray-400">Mediana:</span>
									<span class="font-semibold">{formatCurrency(result.medianFinalValue)}</span>
								</div>
								<div class="col-span-2">
									<span class="text-gray-500 dark:text-gray-400">Iterazioni:</span>
									<span>{result.iterations.toLocaleString('it-IT')}</span>
								</div>
							</div>
						{:else if isRunning}
							<div class="flex items-center gap-2">
								<Spinner size="4" />
								<span class="text-sm text-blue-600">Simulazione in corso... {Math.round(runProgress)}%</span>
							</div>
						{:else}
							<p class="text-sm text-gray-400 italic">Nessuna simulazione eseguita</p>
						{/if}
					</div>

					<!-- Footer with date and actions -->
					<div class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
						<span class="text-xs text-gray-400">
							{formatDate(scenario.createdAt instanceof Date ? scenario.createdAt : new Date(scenario.createdAt))}
						</span>
						<div class="flex gap-1">
							<Button size="xs" color="alternative" onclick={() => handleRunSimulation(scenario)} disabled={isRunning} title="Esegui simulazione">
								<PlaySolid class="w-3.5 h-3.5" />
							</Button>
							<Button size="xs" color="alternative" onclick={() => handleEdit(scenario)} title="Modifica">
								<EditOutline class="w-3.5 h-3.5" />
							</Button>
							<Button size="xs" color="alternative" onclick={() => handleDuplicate(scenario)} title="Duplica">
								<FileCopySolid class="w-3.5 h-3.5" />
							</Button>
							<Button size="xs" color="red" outline onclick={() => confirmDelete(scenario.id)} title="Elimina">
								<TrashBinOutline class="w-3.5 h-3.5" />
							</Button>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
{/if}

<!-- Modals -->
<ScenarioForm
	bind:open={showForm}
	{profiles}
	scenario={editingScenario}
	onSave={handleSave}
/>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="Elimina Scenario"
	message="Sei sicuro di voler eliminare questo scenario? Verranno eliminati anche tutti i risultati delle simulazioni associate."
	onConfirm={handleDelete}
/>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
