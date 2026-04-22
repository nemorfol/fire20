<script lang="ts">
	import {
		Heading, Breadcrumb, BreadcrumbItem, Card, Button, Select,
		Tabs, TabItem, Badge, Alert, Spinner
	} from 'flowbite-svelte';
	import {
		PlusOutline, TrashBinOutline, CheckCircleOutline,
		WalletOutline, ChartOutline,
		BriefcaseOutline, CreditCardOutline
	} from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import type { Profile, PortfolioAllocation, MonthlyContributions, Debt, PensionInfo, Child, Mortgage, LifeEvent } from '$lib/db/index';
	import { getAllProfiles, createProfile, updateProfile, deleteProfile, getProfileById } from '$lib/db/profiles';
	import { calculateSavingsRate, calculateNetWorth } from '$lib/engine/fire-calculator';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';

	import TabDatiPersonali from '$lib/components/profilo/TabDatiPersonali.svelte';
	import TabReddito from '$lib/components/profilo/TabReddito.svelte';
	import TabSpese from '$lib/components/profilo/TabSpese.svelte';
	import TabPatrimonio from '$lib/components/profilo/TabPatrimonio.svelte';
	import TabDebiti from '$lib/components/profilo/TabDebiti.svelte';
	import TabPensione from '$lib/components/profilo/TabPensione.svelte';
	import TabFamiglia from '$lib/components/profilo/TabFamiglia.svelte';
	import TabEventiVita from '$lib/components/profilo/TabEventiVita.svelte';
	import BankImport from '$lib/components/profilo/BankImport.svelte';

	// === State ===
	let profiles = $state<Profile[]>([]);
	let currentProfileId = $state<number | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let showDeleteDialog = $state(false);
	let statusMessage = $state('');
	let statusTimer: ReturnType<typeof setTimeout> | null = null;

	// === Profile fields (bound to form) ===
	let name = $state('Profilo principale');
	let birthYear = $state(1990);
	let retirementAge = $state(67);
	let lifeExpectancy = $state(85);
	let annualIncome = $state(30000);
	let incomeGrowthRate = $state(2.0);
	let otherIncome = $state(0);
	let otherIncomeEndAge = $state(85);
	let annualExpenses = $state(20000);
	let fireExpenses = $state(18000);
	let expenseInflation = $state(2.0);
	let portfolio = $state<PortfolioAllocation>({
		stocks: 0, bonds: 0, cash: 10000, realEstate: 0,
		gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
	});
	let monthlyContributions = $state<MonthlyContributions>({
		stocks: 300, bonds: 100, cash: 0, realEstate: 0,
		gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
	});
	let debts = $state<Debt[]>([]);
	let pension = $state<PensionInfo>({
		contributionYears: 5,
		estimatedMonthly: 1200,
		pensionAge: 67
	});
	let children = $state<Child[]>([]);
	let mortgage = $state<Mortgage | undefined>(undefined);
	let lifeEvents = $state<LifeEvent[]>([]);

	// === Computed metrics ===
	let totalIncome = $derived(annualIncome + otherIncome);
	let savingsRate = $derived(calculateSavingsRate(totalIncome, annualExpenses));
	let netWorth = $derived(calculateNetWorth(portfolio as unknown as Record<string, number>));
	let totalMonthlyContributions = $derived(
		Object.values(monthlyContributions).reduce((s, v) => s + (v || 0), 0)
	);
	let totalDebt = $derived(
		debts.reduce((s, d) => s + (d.balance || 0), 0)
	);

	// === Profile selector options ===
	let profileOptions = $derived(
		profiles.map(p => ({ value: String(p.id), name: p.name }))
	);

	// === Helpers ===
	function getDefaultProfileData() {
		return {
			name: 'Nuovo profilo',
			birthYear: 1990,
			retirementAge: 67,
			lifeExpectancy: 85,
			annualIncome: 30000,
			incomeGrowthRate: 2.0,
			otherIncome: 0,
			otherIncomeEndAge: 85,
			annualExpenses: 20000,
			fireExpenses: 18000,
			expenseInflation: 2.0,
			portfolio: {
				stocks: 0, bonds: 0, cash: 10000, realEstate: 0,
				gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
			} as PortfolioAllocation,
			monthlyContributions: {
				stocks: 300, bonds: 100, cash: 0, realEstate: 0,
				gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
			} as MonthlyContributions,
			debts: [] as Debt[],
			children: [] as Child[],
			mortgage: undefined as Mortgage | undefined,
			lifeEvents: [] as LifeEvent[],
			pension: {
				contributionYears: 5,
				estimatedMonthly: 1200,
				pensionAge: 67
			} as PensionInfo,
			simulation: {
				withdrawalRate: 0.04,
				withdrawalStrategy: 'fixed' as const,
				stockAllocation: 0.6,
				bondAllocation: 0.4,
				glidePathEnabled: false,
				inflationRate: 0.02,
				expectedReturn: 0.07,
				iterations: 1000
			}
		};
	}

	function loadProfileIntoState(p: Profile) {
		name = p.name;
		birthYear = p.birthYear;
		retirementAge = p.retirementAge;
		lifeExpectancy = p.lifeExpectancy;
		annualIncome = p.annualIncome;
		incomeGrowthRate = p.incomeGrowthRate;
		otherIncome = p.otherIncome;
		otherIncomeEndAge = p.otherIncomeEndAge ?? p.lifeExpectancy;
		annualExpenses = p.annualExpenses;
		fireExpenses = p.fireExpenses;
		expenseInflation = p.expenseInflation;
		portfolio = { ...p.portfolio };
		monthlyContributions = { ...p.monthlyContributions };
		debts = p.debts.map(d => ({ ...d }));
		pension = { ...p.pension };
		children = (p.children ?? []).map((c: Child) => ({ ...c }));
		mortgage = p.mortgage ? { ...p.mortgage } : undefined;
		lifeEvents = (p.lifeEvents ?? []).map((e: LifeEvent) => ({ ...e }));
	}

	function getStateAsProfileData() {
		return {
			name,
			birthYear,
			retirementAge,
			lifeExpectancy,
			annualIncome,
			incomeGrowthRate,
			otherIncome,
			otherIncomeEndAge,
			annualExpenses,
			fireExpenses,
			expenseInflation,
			portfolio: { ...portfolio },
			monthlyContributions: { ...monthlyContributions },
			debts: debts.map(d => ({ ...d })),
			pension: { ...pension },
			children: children.map((c: Child) => ({ ...c })),
			mortgage: mortgage ? { ...mortgage } : undefined,
			lifeEvents: lifeEvents.map((e: LifeEvent) => ({ ...e }))
		};
	}

	function showStatus(msg: string) {
		statusMessage = msg;
		if (statusTimer) clearTimeout(statusTimer);
		statusTimer = setTimeout(() => { statusMessage = ''; }, 3000);
	}

	// === Auto-save (debounced) ===
	function scheduleSave() {
		if (!currentProfileId) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			if (!currentProfileId) return;
			saving = true;
			try {
				await updateProfile(currentProfileId, getStateAsProfileData());
				// Refresh profile list to update names
				profiles = await getAllProfiles();
				showStatus('Salvato');
			} catch (e) {
				console.error('Errore nel salvataggio:', e);
				showStatus('Errore nel salvataggio');
			} finally {
				saving = false;
			}
		}, 800);
	}

	// Watch all profile fields for changes and auto-save
	$effect(() => {
		// Read all reactive state to track them
		// Read all reactive state to track dependencies
		void name; void birthYear; void retirementAge; void lifeExpectancy;
		void annualIncome; void incomeGrowthRate; void otherIncome;
		void annualExpenses; void fireExpenses; void expenseInflation;
		void JSON.stringify(portfolio);
		void JSON.stringify(monthlyContributions);
		void JSON.stringify(debts);
		void JSON.stringify(pension);
		void JSON.stringify(children);
		void JSON.stringify(mortgage);
		void JSON.stringify(lifeEvents);
		if (!loading && currentProfileId) {
			scheduleSave();
		}
	});

	// === Profile management ===
	async function handleProfileChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const id = Number(target.value);
		if (!id) return;
		const p = await getProfileById(id);
		if (p) {
			currentProfileId = id;
			loadProfileIntoState(p);
		}
	}

	async function createNewProfile() {
		const data = getDefaultProfileData();
		data.name = `Profilo ${profiles.length + 1}`;
		const id = await createProfile(data);
		profiles = await getAllProfiles();
		currentProfileId = id;
		loadProfileIntoState({
			id,
			createdAt: new Date(),
			updatedAt: new Date(),
			...data
		} as Profile);
		showStatus('Nuovo profilo creato');
	}

	async function confirmDeleteProfile() {
		if (!currentProfileId) return;
		await deleteProfile(currentProfileId);
		profiles = await getAllProfiles();
		if (profiles.length > 0) {
			currentProfileId = profiles[0].id;
			loadProfileIntoState(profiles[0]);
		} else {
			await createNewProfile();
		}
		showDeleteDialog = false;
		showStatus('Profilo eliminato');
	}

	// === Init ===
	onMount(async () => {
		try {
			profiles = await getAllProfiles();
			if (profiles.length === 0) {
				const data = getDefaultProfileData();
				data.name = 'Profilo principale';
				const id = await createProfile(data);
				profiles = await getAllProfiles();
				currentProfileId = id;
				loadProfileIntoState({
					id,
					createdAt: new Date(),
					updatedAt: new Date(),
					...data
				} as Profile);
			} else {
				currentProfileId = profiles[0].id;
				loadProfileIntoState(profiles[0]);
			}
		} catch (e) {
			console.error('Errore caricamento profili:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Profilo Finanziario - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Profilo Finanziario</BreadcrumbItem>
</Breadcrumb>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
	<Heading tag="h1">Profilo Finanziario</Heading>
	<div class="flex items-center gap-2">
		{#if statusMessage}
			<Badge color="green" class="flex items-center gap-1">
				<CheckCircleOutline class="w-3 h-3" />
				{statusMessage}
			</Badge>
		{/if}
		{#if saving}
			<Spinner size="4" />
		{/if}
	</div>
</div>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<Spinner size="8" />
		<span class="ml-3 text-gray-500 dark:text-gray-400">Caricamento profilo...</span>
	</div>
{:else}
	<!-- Profile selector -->
	<Card class="max-w-none mb-6">
		<div class="flex flex-col sm:flex-row items-start sm:items-end gap-4">
			<div class="flex-1 w-full sm:w-auto">
				<Select
					items={profileOptions}
					value={String(currentProfileId)}
					onchange={handleProfileChange}
					placeholder="Seleziona profilo"
				/>
			</div>
			<div class="flex gap-2">
				<Button color="primary" size="sm" onclick={createNewProfile}>
					<PlusOutline class="w-4 h-4 me-1" />
					Nuovo Profilo
				</Button>
				{#if profiles.length > 1}
					<Button color="red" outline size="sm" onclick={() => showDeleteDialog = true}>
						<TrashBinOutline class="w-4 h-4 me-1" />
						Elimina
					</Button>
				{/if}
			</div>
		</div>
	</Card>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Main form area -->
		<div class="lg:col-span-2">
			<Card class="max-w-none">
				<Tabs tabStyle="underline" class="mb-2">
					<TabItem open title="Dati Personali">
						<div class="pt-4">
							<TabDatiPersonali
								bind:birthYear
								bind:retirementAge
								bind:lifeExpectancy
							/>
						</div>
					</TabItem>
					<TabItem title="Reddito">
						<div class="pt-4">
							<TabReddito
								bind:annualIncome
								bind:incomeGrowthRate
								bind:otherIncome
								bind:otherIncomeEndAge
								{lifeExpectancy}
								currentAge={new Date().getFullYear() - birthYear}
							/>
						</div>
					</TabItem>
					<TabItem title="Spese">
						<div class="pt-4">
							<TabSpese
								bind:annualExpenses
								bind:fireExpenses
								bind:expenseInflation
							/>
						</div>
					</TabItem>
					<TabItem title="Famiglia">
						<div class="pt-4">
							<TabFamiglia bind:children bind:mortgage />
						</div>
					</TabItem>
					<TabItem title="Eventi di vita">
						<div class="pt-4">
							<TabEventiVita bind:lifeEvents />
						</div>
					</TabItem>
					<TabItem title="Patrimonio">
						<div class="pt-4">
							<TabPatrimonio
								bind:portfolio
								bind:monthlyContributions
							/>
						</div>
					</TabItem>
					<TabItem title="Debiti">
						<div class="pt-4">
							<TabDebiti bind:debts />
						</div>
					</TabItem>
					<TabItem title="Pensione">
						<div class="pt-4">
							<TabPensione bind:pension {birthYear} {retirementAge} annualExpenses={fireExpenses} />
						</div>
					</TabItem>
					<TabItem title="Import Banca">
						<div class="pt-4">
							<BankImport onApply={(result) => {
								annualIncome = result.annualIncome;
								annualExpenses = result.annualExpenses;
							}} />
						</div>
					</TabItem>
				</Tabs>
			</Card>
		</div>

		<!-- Sidebar summary -->
		<div class="space-y-4">
			<Card class="max-w-none">
				<Heading tag="h4" class="mb-4">Riepilogo</Heading>

				<div class="space-y-4">
					<div class="flex items-start gap-3">
						<div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
							<ChartOutline class="w-5 h-5" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">Tasso di risparmio</p>
							<p class="text-xl font-bold text-gray-900 dark:text-white">
								{formatPercent(savingsRate * 100)}
							</p>
							{#if savingsRate >= 0.5}
								<Badge color="green" class="mt-1">Eccellente</Badge>
							{:else if savingsRate >= 0.3}
								<Badge color="yellow" class="mt-1">Buono</Badge>
							{:else if savingsRate > 0}
								<Badge color="red" class="mt-1">Da migliorare</Badge>
							{/if}
						</div>
					</div>

					<hr class="border-gray-200 dark:border-gray-700" />

					<div class="flex items-start gap-3">
						<div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
							<WalletOutline class="w-5 h-5" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">Patrimonio netto</p>
							<p class="text-xl font-bold text-gray-900 dark:text-white">
								{formatCurrency(netWorth)}
							</p>
						</div>
					</div>

					<hr class="border-gray-200 dark:border-gray-700" />

					<div class="flex items-start gap-3">
						<div class="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
							<BriefcaseOutline class="w-5 h-5" />
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-gray-400">Contributi mensili totali</p>
							<p class="text-xl font-bold text-gray-900 dark:text-white">
								{formatCurrency(totalMonthlyContributions)}
							</p>
							<p class="text-xs text-gray-400 dark:text-gray-500">
								{formatCurrency(totalMonthlyContributions * 12)} / anno
							</p>
						</div>
					</div>

					{#if totalDebt > 0}
						<hr class="border-gray-200 dark:border-gray-700" />

						<div class="flex items-start gap-3">
							<div class="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
								<CreditCardOutline class="w-5 h-5" />
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-gray-400">Debito totale</p>
								<p class="text-xl font-bold text-red-600 dark:text-red-400">
									{formatCurrency(totalDebt)}
								</p>
								<p class="text-xs text-gray-400 dark:text-gray-500">
									{debts.length} {debts.length === 1 ? 'debito' : 'debiti'} attivi
								</p>
							</div>
						</div>
					{/if}
				</div>
			</Card>

			<Card class="max-w-none">
				<Heading tag="h4" class="mb-3">Dati rapidi</Heading>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Reddito totale</span>
						<span class="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalIncome)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Spese attuali</span>
						<span class="font-semibold text-gray-900 dark:text-white">{formatCurrency(annualExpenses)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Spese in FIRE</span>
						<span class="font-semibold text-gray-900 dark:text-white">{formatCurrency(fireExpenses)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Risparmio annuo</span>
						<span class="font-semibold text-green-600 dark:text-green-400">
							{formatCurrency(Math.max(0, totalIncome - annualExpenses))}
						</span>
					</div>
					<hr class="border-gray-200 dark:border-gray-700" />
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Pensione INPS</span>
						<span class="font-semibold text-gray-900 dark:text-white">
							{formatCurrency(pension.estimatedMonthly)}/mese
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500 dark:text-gray-400">Eta pensione INPS</span>
						<span class="font-semibold text-gray-900 dark:text-white">{pension.pensionAge} anni</span>
					</div>
				</div>
			</Card>

			<Alert color="blue">
				<span class="font-medium">Salvataggio automatico</span> - Le modifiche vengono salvate automaticamente dopo ogni modifica.
			</Alert>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="Elimina profilo"
	message="Sei sicuro di voler eliminare questo profilo? Tutti i dati, gli scenari e le simulazioni collegate verranno eliminati permanentemente."
	onConfirm={confirmDeleteProfile}
/>
