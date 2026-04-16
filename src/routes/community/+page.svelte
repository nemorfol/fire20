<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading, Breadcrumb, BreadcrumbItem, Card, Button, Input,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell,
		Badge, Alert, Select, Modal
	} from 'flowbite-svelte';
	import {
		ShareNodesSolid,
		ClipboardOutline,
		TrashBinOutline,
		PlusOutline
	} from 'flowbite-svelte-icons';
	import { page } from '$app/state';
	import { getAllProfiles } from '$lib/db/profiles';
	import type { Profile } from '$lib/db/index';
	import {
		anonymizeProfile,
		decodeScenario,
		generateShareURL,
		type SharedScenario
	} from '$lib/utils/scenario-share';
	import {
		getCommunityScenarios,
		addCommunityScenario,
		removeCommunityScenario,
		computeCommunityStats,
		type CommunityStats
	} from '$lib/utils/community-store';
	import { formatCompact } from '$lib/utils/format';

	// State
	let profile = $state<Profile | null>(null);
	let scenarios = $state<SharedScenario[]>([]);
	let stats = $state<CommunityStats | null>(null);
	let myScenario = $state<SharedScenario | null>(null);

	let showShareModal = $state(false);
	let shareURL = $state('');
	let selectedRegion = $state('Nord');
	let copied = $state(false);

	let importLink = $state('');
	let importError = $state('');
	let importSuccess = $state('');

	let filterFireType = $state('');
	let filterRegion = $state('');
	let filterAgeRange = $state('');

	const regionOptions = [
		{ value: 'Nord', name: 'Nord Italia' },
		{ value: 'Centro', name: 'Centro Italia' },
		{ value: 'Sud', name: 'Sud Italia' },
		{ value: 'Isole', name: 'Isole' }
	];

	const fireTypeFilterOptions = [
		{ value: '', name: 'Tutti i tipi' },
		{ value: 'LeanFIRE', name: 'LeanFIRE' },
		{ value: 'FIRE', name: 'FIRE' },
		{ value: 'FatFIRE', name: 'FatFIRE' },
		{ value: 'BaristaFIRE', name: 'BaristaFIRE' },
		{ value: 'CoastFIRE', name: 'CoastFIRE' }
	];

	const regionFilterOptions = [
		{ value: '', name: 'Tutte le regioni' },
		{ value: 'Nord', name: 'Nord' },
		{ value: 'Centro', name: 'Centro' },
		{ value: 'Sud', name: 'Sud' },
		{ value: 'Isole', name: 'Isole' }
	];

	let filteredScenarios = $derived(() => {
		let result = scenarios;
		if (filterFireType) result = result.filter(s => s.fireType === filterFireType);
		if (filterRegion) result = result.filter(s => s.region === filterRegion);
		if (filterAgeRange) result = result.filter(s => s.ageRange === filterAgeRange);
		return result;
	});

	let ageRangeFilterOptions = $derived(() => {
		const ages = [...new Set(scenarios.map(s => s.ageRange))].sort();
		return [{ value: '', name: 'Tutte le eta' }, ...ages.map(a => ({ value: a, name: a + ' anni' }))];
	});

	function fireTypeBadgeColor(type: string): 'green' | 'blue' | 'purple' | 'yellow' | 'indigo' {
		switch (type) {
			case 'LeanFIRE': return 'green';
			case 'FIRE': return 'blue';
			case 'FatFIRE': return 'purple';
			case 'BaristaFIRE': return 'yellow';
			case 'CoastFIRE': return 'indigo';
			default: return 'blue';
		}
	}

	function refreshData() {
		scenarios = getCommunityScenarios();
		stats = computeCommunityStats(scenarios);
	}

	function prepareShare() {
		if (!profile) return;
		myScenario = anonymizeProfile(profile, selectedRegion);
		shareURL = generateShareURL(myScenario);
		showShareModal = true;
		copied = false;
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shareURL);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {
			// Fallback
			const ta = document.createElement('textarea');
			ta.value = shareURL;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		}
	}

	function confirmShare() {
		if (!myScenario) return;
		// Add own scenario to community store too
		addCommunityScenario(myScenario);
		refreshData();
		showShareModal = false;
	}

	function handleImport() {
		importError = '';
		importSuccess = '';

		if (!importLink.trim()) {
			importError = 'Inserisci un link valido.';
			return;
		}

		// Extract data from URL hash
		let encoded = importLink.trim();
		const hashIdx = encoded.indexOf('#data=');
		if (hashIdx >= 0) {
			encoded = encoded.substring(hashIdx + 6);
		}
		// Also try just the base64 string directly
		const scenario = decodeScenario(encoded);
		if (!scenario) {
			importError = 'Link non valido. Verifica di aver copiato il link completo.';
			return;
		}

		const added = addCommunityScenario(scenario);
		if (!added) {
			importError = 'Questo scenario e gia presente nella community.';
			return;
		}

		importSuccess = `Scenario importato: ${scenario.fireType} (${scenario.ageRange} anni, ${scenario.region})`;
		importLink = '';
		refreshData();
	}

	function handleRemove(id: string) {
		removeCommunityScenario(id);
		refreshData();
	}

	onMount(async () => {
		// Load profile
		const profiles = await getAllProfiles();
		if (profiles.length > 0) {
			profile = profiles[0];
		}

		// Check URL hash for incoming shared scenario
		const hash = page.url.hash;
		if (hash.startsWith('#data=')) {
			const encoded = hash.substring(6);
			const scenario = decodeScenario(encoded);
			if (scenario) {
				const added = addCommunityScenario(scenario);
				if (added) {
					importSuccess = 'Scenario importato automaticamente dal link!';
				}
			}
		}

		refreshData();
	});
</script>

<svelte:head>
	<title>Community Benchmark - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Community</BreadcrumbItem>
</Breadcrumb>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
	<Heading tag="h1">Community Benchmark</Heading>
</div>

<p class="text-gray-600 dark:text-gray-400 mb-6">
	Confronta il tuo percorso FIRE con la community. Condividi il tuo scenario in modo anonimo e importa quelli degli altri per un benchmark collettivo.
</p>

{#if importSuccess}
	<Alert color="green" class="mb-4" dismissable>
		{importSuccess}
	</Alert>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
	<!-- Condividi -->
	<Card class="max-w-none">
		<Heading tag="h4" class="mb-3">Condividi il tuo scenario</Heading>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			I tuoi dati vengono anonimizzati automaticamente: nessun nome, nessuna info personale. Solo range di eta, reddito e dati aggregati.
		</p>
		<div class="mb-3">
			<label for="region-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
				La tua regione
			</label>
			<Select id="region-select" items={regionOptions} bind:value={selectedRegion} />
		</div>
		<Button color="blue" onclick={prepareShare} disabled={!profile}>
			<ShareNodesSolid class="w-4 h-4 me-2" />
			Condividi il tuo scenario
		</Button>
		{#if !profile}
			<p class="text-xs text-gray-400 mt-2">Crea prima un profilo finanziario.</p>
		{/if}
	</Card>

	<!-- Importa -->
	<Card class="max-w-none">
		<Heading tag="h4" class="mb-3">Importa scenario</Heading>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Incolla il link ricevuto da un altro utente per aggiungerlo al benchmark.
		</p>
		<div class="flex gap-2">
			<div class="flex-1">
				<Input
					type="text"
					placeholder="Incolla il link qui..."
					bind:value={importLink}
				/>
			</div>
			<Button color="green" onclick={handleImport}>
				<PlusOutline class="w-4 h-4" />
			</Button>
		</div>
		{#if importError}
			<p class="text-xs text-red-500 mt-2">{importError}</p>
		{/if}
	</Card>

	<!-- Statistiche rapide -->
	<Card class="max-w-none">
		<Heading tag="h4" class="mb-3">Statistiche Community</Heading>
		{#if stats && stats.count > 0}
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Scenari</span>
					<span class="font-semibold">{stats.count}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Tasso risparmio medio</span>
					<span class="font-semibold">{stats.avgSavingsRate}%</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">FIRE Number medio</span>
					<span class="font-semibold">{formatCompact(stats.avgFireNumber)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Anni al FIRE (media)</span>
					<span class="font-semibold">{stats.avgYearsToFire}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Portafoglio medio</span>
					<span class="font-semibold">{formatCompact(stats.avgPortfolioSize)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Allocazione azioni media</span>
					<span class="font-semibold">{stats.avgStockAllocation}%</span>
				</div>
			</div>
		{:else}
			<p class="text-sm text-gray-400">Nessuno scenario importato. Condividi il tuo o importa quelli di altri per vedere le statistiche.</p>
		{/if}
	</Card>
</div>

<!-- Confronto con la community -->
{#if profile && stats && stats.count > 0}
	<Card class="max-w-none mb-6">
		<Heading tag="h4" class="mb-4">Il tuo profilo vs la Community</Heading>
		{@const myIncome = profile.annualIncome + profile.otherIncome}
		{@const mySavingsRate = myIncome > 0 ? Math.round(((myIncome - profile.annualExpenses) / myIncome) * 100) : 0}
		{@const myPortfolio = Object.values(profile.portfolio).reduce((s, v) => s + (v || 0), 0)}
		{@const myWr = (profile.simulation?.withdrawalRate || 0.04)}
		{@const myFireNumber = profile.fireExpenses > 0 ? Math.round(profile.fireExpenses / myWr) : 0}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Tasso risparmio</p>
				<p class="text-lg font-bold text-gray-900 dark:text-white">{mySavingsRate}%</p>
				<p class="text-xs {mySavingsRate > stats.avgSavingsRate ? 'text-green-500' : 'text-red-500'}">
					Community: {stats.avgSavingsRate}%
				</p>
			</div>
			<div class="text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">FIRE Number</p>
				<p class="text-lg font-bold text-gray-900 dark:text-white">{formatCompact(myFireNumber)}</p>
				<p class="text-xs text-gray-500">Community: {formatCompact(stats.avgFireNumber)}</p>
			</div>
			<div class="text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Portafoglio</p>
				<p class="text-lg font-bold text-gray-900 dark:text-white">{formatCompact(myPortfolio)}</p>
				<p class="text-xs {myPortfolio > stats.avgPortfolioSize ? 'text-green-500' : 'text-red-500'}">
					Community: {formatCompact(stats.avgPortfolioSize)}
				</p>
			</div>
			<div class="text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Withdrawal Rate</p>
				<p class="text-lg font-bold text-gray-900 dark:text-white">{(myWr * 100).toFixed(1)}%</p>
				<p class="text-xs text-gray-500">Community: {stats.avgWithdrawalRate.toFixed(1)}%</p>
			</div>
		</div>
	</Card>
{/if}

<!-- Distribution bars -->
{#if stats && stats.count > 0}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
		<!-- FIRE Type Distribution -->
		<Card class="max-w-none">
			<Heading tag="h5" class="mb-3">Distribuzione tipo FIRE</Heading>
			<div class="space-y-2">
				{#each Object.entries(stats.fireTypeDistribution) as [type, count]}
					{@const pct = Math.round((count / stats.count) * 100)}
					<div class="flex items-center gap-2">
						<span class="text-xs w-24 text-right">{type}</span>
						<div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
							<div class="h-full bg-blue-500 rounded-full" style="width: {pct}%"></div>
						</div>
						<span class="text-xs w-16 text-gray-500">{count} ({pct}%)</span>
					</div>
				{/each}
			</div>
		</Card>

		<!-- Region Distribution -->
		<Card class="max-w-none">
			<Heading tag="h5" class="mb-3">Distribuzione regionale</Heading>
			<div class="space-y-2">
				{#each Object.entries(stats.regionDistribution) as [region, count]}
					{@const pct = Math.round((count / stats.count) * 100)}
					<div class="flex items-center gap-2">
						<span class="text-xs w-24 text-right">{region}</span>
						<div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
							<div class="h-full bg-green-500 rounded-full" style="width: {pct}%"></div>
						</div>
						<span class="text-xs w-16 text-gray-500">{count} ({pct}%)</span>
					</div>
				{/each}
			</div>
		</Card>
	</div>
{/if}

<!-- Tabella scenari -->
<Card class="max-w-none mb-6">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
		<Heading tag="h4">Scenari Community ({scenarios.length})</Heading>
		<div class="flex flex-wrap gap-2">
			<Select items={fireTypeFilterOptions} bind:value={filterFireType} class="w-36" />
			<Select items={regionFilterOptions} bind:value={filterRegion} class="w-36" />
			<Select items={ageRangeFilterOptions()} bind:value={filterAgeRange} class="w-36" />
		</div>
	</div>

	{#if filteredScenarios().length > 0}
		<div class="overflow-x-auto">
			<Table striped>
				<TableHead>
					<TableHeadCell>Tipo</TableHeadCell>
					<TableHeadCell>Eta</TableHeadCell>
					<TableHeadCell>Regione</TableHeadCell>
					<TableHeadCell>Reddito</TableHeadCell>
					<TableHeadCell>Risparmio</TableHeadCell>
					<TableHeadCell>FIRE Number</TableHeadCell>
					<TableHeadCell>Anni al FIRE</TableHeadCell>
					<TableHeadCell>Portafoglio</TableHeadCell>
					<TableHeadCell>Azioni %</TableHeadCell>
					<TableHeadCell>WR %</TableHeadCell>
					<TableHeadCell></TableHeadCell>
				</TableHead>
				<TableBody>
					{#each filteredScenarios() as s}
						<TableBodyRow>
							<TableBodyCell>
								<Badge color={fireTypeBadgeColor(s.fireType)}>{s.fireType}</Badge>
							</TableBodyCell>
							<TableBodyCell>{s.ageRange}</TableBodyCell>
							<TableBodyCell>{s.region}</TableBodyCell>
							<TableBodyCell>{s.incomeRange}</TableBodyCell>
							<TableBodyCell>{s.savingsRate}%</TableBodyCell>
							<TableBodyCell>{formatCompact(s.fireNumber)}</TableBodyCell>
							<TableBodyCell>{s.yearsToFire}</TableBodyCell>
							<TableBodyCell>{formatCompact(s.portfolioSize)}</TableBodyCell>
							<TableBodyCell>{s.stockAllocation}%</TableBodyCell>
							<TableBodyCell>{s.withdrawalRate}%</TableBodyCell>
							<TableBodyCell>
								<button
									class="text-red-500 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
									onclick={() => handleRemove(s.id)}
									title="Rimuovi"
								>
									<TrashBinOutline class="w-4 h-4" />
								</button>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{:else}
		<p class="text-sm text-gray-400 py-8 text-center">
			Nessuno scenario nella community. Condividi il tuo o importa quelli di altri!
		</p>
	{/if}
</Card>

<!-- Share Modal -->
<Modal title="Condividi il tuo scenario" bind:open={showShareModal} size="lg">
	{#if myScenario}
		<div class="space-y-4">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Ecco un'anteprima dei dati che verranno condivisi (anonimizzati):
			</p>

			<div class="grid grid-cols-2 gap-3 text-sm">
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Fascia eta</span>
					<span class="font-semibold">{myScenario.ageRange} anni</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Regione</span>
					<span class="font-semibold">{myScenario.region}</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Reddito</span>
					<span class="font-semibold">{myScenario.incomeRange}</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Risparmio</span>
					<span class="font-semibold">{myScenario.savingsRate}%</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">FIRE Number</span>
					<span class="font-semibold">{formatCompact(myScenario.fireNumber)}</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Anni al FIRE</span>
					<span class="font-semibold">{myScenario.yearsToFire}</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Portafoglio</span>
					<span class="font-semibold">{formatCompact(myScenario.portfolioSize)}</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Tipo FIRE</span>
					<Badge color={fireTypeBadgeColor(myScenario.fireType)}>{myScenario.fireType}</Badge>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Azioni / Bond / Altro</span>
					<span class="font-semibold">{myScenario.stockAllocation}% / {myScenario.bondAllocation}% / {myScenario.otherAllocation}%</span>
				</div>
				<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
					<span class="text-gray-500">Withdrawal Rate</span>
					<span class="font-semibold">{myScenario.withdrawalRate}%</span>
				</div>
			</div>

			<div>
				<p class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Link da condividere
				</p>
				<div class="flex gap-2">
					<Input type="text" value={shareURL} readonly class="flex-1 text-xs" />
					<Button size="sm" color={copied ? 'green' : 'blue'} onclick={copyToClipboard}>
						<ClipboardOutline class="w-4 h-4 me-1" />
						{copied ? 'Copiato!' : 'Copia'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
	{#snippet footer()}
		<div class="flex justify-end gap-3">
			<Button color="alternative" onclick={() => showShareModal = false}>Chiudi</Button>
			<Button color="blue" onclick={confirmShare}>Salva nella Community</Button>
		</div>
	{/snippet}
</Modal>
