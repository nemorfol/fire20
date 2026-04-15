<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Card,
		Button,
		Fileupload,
		Alert,
		Badge,
		Modal,
		Radio
	} from 'flowbite-svelte';
	import {
		ArrowDownToBracketOutline,
		TrashBinSolid,
		InfoCircleSolid,
		ExclamationCircleSolid,
		FilePdfSolid
	} from 'flowbite-svelte-icons';
	import Papa from 'papaparse';
	import { db } from '$lib/db/index';
	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import { generateFireReport } from '$lib/utils/pdf-export';
	import { getAllScenarios } from '$lib/db/scenarios';
	import { getAllResults } from '$lib/db/results';
	import { t } from '$lib/i18n/store.svelte';
	import { getLocale, setLocale } from '$lib/i18n/store.svelte';
	import { locales, type Locale } from '$lib/i18n/index';
	import { Toggle, Select, Input, Label } from 'flowbite-svelte';
	import { currencies, type Currency } from '$lib/utils/currency';
	import { getCurrency, setCurrency } from '$lib/utils/currency-store.svelte';
	import {
		getReminder,
		setReminder,
		calculateNextDate,
		type RebalanceReminder
	} from '$lib/utils/reminders';

	let selectedLocale = $state<Locale>(getLocale());

	// Rebalance reminder state
	let reminder = $state<RebalanceReminder>(getReminder());

	const frequencyOptions = [
		{ value: 1, name: 'Mensile' },
		{ value: 3, name: 'Trimestrale' },
		{ value: 6, name: 'Semestrale' },
		{ value: 12, name: 'Annuale' }
	];

	function updateReminder() {
		// Ricalcola la prossima data promemoria
		if (reminder.enabled && reminder.lastRebalanceDate) {
			reminder.nextReminderDate = calculateNextDate(
				new Date(reminder.lastRebalanceDate),
				reminder.frequencyMonths
			);
		} else if (reminder.enabled && !reminder.lastRebalanceDate) {
			// Se non c'e' data di ultimo ribilanciamento, imposta da oggi
			reminder.nextReminderDate = calculateNextDate(new Date(), reminder.frequencyMonths);
		} else {
			reminder.nextReminderDate = null;
		}
		setReminder(reminder);
	}
	let selectedCurrency = $state<Currency>(getCurrency());

	function handleLocaleChange(locale: Locale) {
		selectedLocale = locale;
		setLocale(locale);
	}

	function handleCurrencyChange(code: Currency) {
		selectedCurrency = code;
		setCurrency(code);
	}

	// State
	let profileCount = $state(0);
	let scenarioCount = $state(0);
	let resultCount = $state(0);

	let alertMessage = $state('');
	let alertType = $state<'success' | 'error' | 'warning'>('success');
	let showAlert = $state(false);

	let showDeleteModal = $state(false);
	let showImportModal = $state(false);
	let importPreview = $state('');
	let pendingImportData: any = $state(null);
	let pendingImportType = $state<'backup' | 'profile'>('backup');

	// Load counts
	async function loadCounts() {
		const [profiles, scenarios, results] = await Promise.all([
			getAllProfiles(),
			getAllScenarios(),
			getAllResults()
		]);
		profileCount = profiles.length;
		scenarioCount = scenarios.length;
		resultCount = results.length;
	}

	onMount(() => {
		loadCounts();
	});

	// === Utility ===

	function notify(message: string, type: 'success' | 'error' | 'warning' = 'success') {
		alertMessage = message;
		alertType = type;
		showAlert = true;
		setTimeout(() => { showAlert = false; }, 4000);
	}

	function downloadJSON(data: any, filename: string) {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadCSV(csvString: string, filename: string) {
		const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// === Exports ===

	async function exportPdfReport() {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length === 0) {
				notify('Nessun profilo disponibile per il report PDF.', 'warning');
				return;
			}
			generateFireReport(profiles[0]);
			notify('Report PDF generato con successo.');
		} catch (e) {
			notify('Errore durante la generazione del report PDF.', 'error');
		}
	}

	async function exportProfiles() {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length === 0) {
				notify('Nessun profilo da esportare.', 'warning');
				return;
			}
			downloadJSON(profiles, `fire-profili-${new Date().toISOString().slice(0, 10)}.json`);
			notify(`${profiles.length} profilo/i esportato/i con successo.`);
		} catch (e) {
			notify('Errore durante l\'esportazione dei profili.', 'error');
		}
	}

	async function exportScenarios() {
		try {
			const scenarios = await getAllScenarios();
			if (scenarios.length === 0) {
				notify('Nessuno scenario da esportare.', 'warning');
				return;
			}
			downloadJSON(scenarios, `fire-scenari-${new Date().toISOString().slice(0, 10)}.json`);
			notify(`${scenarios.length} scenario/i esportato/i con successo.`);
		} catch (e) {
			notify('Errore durante l\'esportazione degli scenari.', 'error');
		}
	}

	async function exportResultsCSV() {
		try {
			const results = await getAllResults();
			if (results.length === 0) {
				notify('Nessun risultato da esportare.', 'warning');
				return;
			}
			const flat = results.map(r => ({
				id: r.id,
				scenarioId: r.scenarioId,
				profileId: r.profileId,
				runAt: r.runAt instanceof Date ? r.runAt.toISOString() : r.runAt,
				iterations: r.iterations,
				years: r.years,
				successRate: r.successRate,
				medianFinalValue: r.medianFinalValue,
				p5: r.percentiles?.p5,
				p10: r.percentiles?.p10,
				p25: r.percentiles?.p25,
				p50: r.percentiles?.p50,
				p75: r.percentiles?.p75,
				p90: r.percentiles?.p90,
				p95: r.percentiles?.p95,
				withdrawalRate: r.params?.withdrawalRate,
				withdrawalStrategy: r.params?.withdrawalStrategy,
				stockAllocation: r.params?.stockAllocation,
				bondAllocation: r.params?.bondAllocation
			}));
			const csv = Papa.unparse(flat);
			downloadCSV(csv, `fire-risultati-${new Date().toISOString().slice(0, 10)}.csv`);
			notify(`${results.length} risultato/i esportato/i in CSV.`);
		} catch (e) {
			notify('Errore durante l\'esportazione dei risultati.', 'error');
		}
	}

	async function exportFullBackup() {
		try {
			const [profiles, scenarios, results] = await Promise.all([
				getAllProfiles(),
				getAllScenarios(),
				getAllResults()
			]);
			const backup = {
				version: '1.0',
				exportedAt: new Date().toISOString(),
				app: 'FIRE Planner',
				data: { profiles, scenarios, results }
			};
			downloadJSON(backup, `fire-backup-${new Date().toISOString().slice(0, 10)}.json`);
			notify('Backup completo esportato con successo.');
		} catch (e) {
			notify('Errore durante il backup.', 'error');
		}
	}

	// === Imports ===

	function handleFileImport(event: Event, type: 'backup' | 'profile') {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target?.result as string);
				pendingImportData = data;
				pendingImportType = type;

				if (type === 'backup') {
					const d = data.data || data;
					const pCount = d.profiles?.length ?? 0;
					const sCount = d.scenarios?.length ?? 0;
					const rCount = d.results?.length ?? 0;
					importPreview = `Il backup contiene:\n- ${pCount} profilo/i\n- ${sCount} scenario/i\n- ${rCount} risultato/i di simulazione\n\nI dati esistenti verranno sovrascritti.`;
				} else {
					if (Array.isArray(data)) {
						importPreview = `File contiene ${data.length} profilo/i da importare.`;
					} else if (data.name) {
						importPreview = `Profilo: "${data.name}"\nVerr\u00e0 aggiunto ai profili esistenti.`;
					} else {
						importPreview = 'Formato profilo non riconosciuto.';
						pendingImportData = null;
					}
				}

				showImportModal = true;
			} catch {
				notify('File non valido. Assicurati che sia un file JSON valido.', 'error');
			}
		};
		reader.readAsText(file);
		// Reset input
		input.value = '';
	}

	async function confirmImport() {
		showImportModal = false;
		if (!pendingImportData) return;

		try {
			if (pendingImportType === 'backup') {
				const d = pendingImportData.data || pendingImportData;
				await db.transaction('rw', [db.profiles, db.scenarios, db.simulation_results], async () => {
					// Clear existing data
					await db.profiles.clear();
					await db.scenarios.clear();
					await db.simulation_results.clear();
					// Import new data
					if (d.profiles?.length) {
						// Fix dates
						const profiles = d.profiles.map((p: any) => ({
							...p,
							createdAt: new Date(p.createdAt),
							updatedAt: new Date(p.updatedAt)
						}));
						await db.profiles.bulkAdd(profiles);
					}
					if (d.scenarios?.length) {
						const scenarios = d.scenarios.map((s: any) => ({
							...s,
							createdAt: new Date(s.createdAt)
						}));
						await db.scenarios.bulkAdd(scenarios);
					}
					if (d.results?.length) {
						const results = d.results.map((r: any) => ({
							...r,
							runAt: new Date(r.runAt)
						}));
						await db.simulation_results.bulkAdd(results);
					}
				});
				notify('Backup importato con successo!');
			} else {
				// Import profile(s)
				const profiles = Array.isArray(pendingImportData) ? pendingImportData : [pendingImportData];
				for (const p of profiles) {
					const { id, ...rest } = p;
					await db.profiles.add({
						...rest,
						createdAt: new Date(rest.createdAt || new Date()),
						updatedAt: new Date()
					} as Profile);
				}
				notify(`${profiles.length} profilo/i importato/i con successo!`);
			}
			await loadCounts();
		} catch (e) {
			notify('Errore durante l\'importazione. Verifica il formato del file.', 'error');
		}
		pendingImportData = null;
	}

	// === Delete All ===

	async function deleteAllData() {
		showDeleteModal = false;
		try {
			await db.transaction('rw', [db.profiles, db.scenarios, db.simulation_results, db.risk_events], async () => {
				await db.profiles.clear();
				await db.scenarios.clear();
				await db.simulation_results.clear();
				await db.risk_events.clear();
			});
			await loadCounts();
			notify('Tutti i dati sono stati cancellati.');
		} catch (e) {
			notify('Errore durante la cancellazione.', 'error');
		}
	}
</script>

<svelte:head>
	<title>Impostazioni - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Impostazioni</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-6">Impostazioni</Heading>

<p class="text-gray-600 dark:text-gray-400 mb-8">
	Gestisci i dati dell'applicazione: esporta, importa e cancella profili, scenari e risultati.
</p>

<!-- Alert -->
{#if showAlert}
	<div class="mb-4">
		<Alert color={alertType === 'success' ? 'green' : alertType === 'error' ? 'red' : 'yellow'} dismissable>
			{alertMessage}
		</Alert>
	</div>
{/if}

<!-- Language Selector -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-2">{t('settings.language')}</Heading>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.chooseLanguage')}</p>
	<div class="flex flex-wrap gap-4">
		{#each locales as locale}
			<button
				type="button"
				class="flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer {selectedLocale === locale.code ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
				onclick={() => handleLocaleChange(locale.code)}
			>
				<span class="text-2xl">{locale.flag}</span>
				<span class="font-medium text-gray-900 dark:text-white">{locale.label}</span>
				{#if selectedLocale === locale.code}
					<svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
					</svg>
				{/if}
			</button>
		{/each}
	</div>
</Card>

<!-- Currency Selector -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-2">Valuta</Heading>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Seleziona la valuta utilizzata per la visualizzazione degli importi.</p>
	<div class="flex flex-wrap gap-4">
		{#each currencies as curr}
			<button
				type="button"
				class="flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer {selectedCurrency === curr.code ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
				onclick={() => handleCurrencyChange(curr.code)}
			>
				<span class="text-2xl">{curr.flag}</span>
				<div class="text-left">
					<span class="font-medium text-gray-900 dark:text-white">{curr.name}</span>
					<span class="text-sm text-gray-500 dark:text-gray-400 ml-1">({curr.symbol})</span>
				</div>
				{#if selectedCurrency === curr.code}
					<svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
					</svg>
				{/if}
			</button>
		{/each}
	</div>
</Card>

<!-- Promemoria Ribilanciamento -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Promemoria Ribilanciamento</Heading>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Ricevi un promemoria periodico per ribilanciare il tuo portafoglio e mantenere l'allocazione target.
	</p>

	<div class="space-y-4">
		<!-- Toggle on/off -->
		<Toggle bind:checked={reminder.enabled} onchange={updateReminder}>
			{reminder.enabled ? 'Promemoria attivo' : 'Promemoria disattivato'}
		</Toggle>

		{#if reminder.enabled}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Frequenza -->
				<div>
					<Label for="rebal-freq" class="mb-2">Frequenza</Label>
					<Select
						id="rebal-freq"
						items={frequencyOptions}
						bind:value={reminder.frequencyMonths}
						onchange={updateReminder}
					/>
				</div>

				<!-- Soglia % -->
				<div>
					<Label for="rebal-threshold" class="mb-2">Soglia di deviazione (%)</Label>
					<Input
						id="rebal-threshold"
						type="number"
						min={1}
						max={50}
						step={1}
						bind:value={reminder.thresholdPercent}
						onchange={updateReminder}
					/>
					<p class="text-xs text-gray-400 mt-1">Allerta se l'allocazione devia oltre questa % dal target.</p>
				</div>

				<!-- Data ultimo ribilanciamento -->
				<div>
					<Label for="rebal-last" class="mb-2">Data ultimo ribilanciamento</Label>
					<input
						id="rebal-last"
						type="date"
						value={reminder.lastRebalanceDate ?? ''}
						onchange={(e: Event) => { reminder.lastRebalanceDate = (e.target as HTMLInputElement).value || null; updateReminder(); }}
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
					/>
				</div>

				<!-- Prossimo promemoria (readonly) -->
				<div>
					<Label for="rebal-next" class="mb-2">Prossimo promemoria</Label>
					<input
						id="rebal-next"
						type="date"
						value={reminder.nextReminderDate ?? ''}
						disabled
						class="block w-full rounded-lg border border-gray-300 bg-gray-100 p-2.5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed"
					/>
					<p class="text-xs text-gray-400 mt-1">Calcolato automaticamente.</p>
				</div>
			</div>
		{/if}
	</div>
</Card>

<!-- DB Stats -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Stato del Database</Heading>
	<div class="flex flex-wrap gap-6">
		<div class="text-center">
			<Badge large color="blue">{profileCount}</Badge>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Profili</p>
		</div>
		<div class="text-center">
			<Badge large color="indigo">{scenarioCount}</Badge>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Scenari</p>
		</div>
		<div class="text-center">
			<Badge large color="purple">{resultCount}</Badge>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Risultati</p>
		</div>
	</div>
</Card>

<!-- Export Section -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Esportazione Dati</Heading>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
		<Button color="blue" onclick={exportProfiles}>
			<ArrowDownToBracketOutline class="w-4 h-4 me-2" />
			Esporta Profili (JSON)
		</Button>
		<Button color="blue" onclick={exportScenarios}>
			<ArrowDownToBracketOutline class="w-4 h-4 me-2" />
			Esporta Scenari (JSON)
		</Button>
		<Button color="blue" onclick={exportResultsCSV}>
			<ArrowDownToBracketOutline class="w-4 h-4 me-2" />
			Esporta Risultati (CSV)
		</Button>
		<Button color="green" onclick={exportFullBackup}>
			<ArrowDownToBracketOutline class="w-4 h-4 me-2" />
			Backup Completo (JSON)
		</Button>
		<Button color="purple" onclick={exportPdfReport}>
			<FilePdfSolid class="w-4 h-4 me-2" />
			Esporta Report PDF
		</Button>
	</div>
</Card>

<!-- Import Section -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Importazione Dati</Heading>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<div>
			<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importa Backup Completo (JSON)</p>
			<Fileupload accept=".json" onchange={(e: Event) => handleFileImport(e, 'backup')} />
			<p class="text-xs text-gray-400 mt-1">Sovrascrive tutti i dati esistenti.</p>
		</div>
		<div>
			<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importa Profilo (JSON)</p>
			<Fileupload accept=".json" onchange={(e: Event) => handleFileImport(e, 'profile')} />
			<p class="text-xs text-gray-400 mt-1">Aggiunge ai profili esistenti.</p>
		</div>
	</div>
</Card>

<!-- Data Management -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Gestione Dati</Heading>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Elimina permanentemente tutti i dati salvati nell'applicazione. Questa azione non pu&ograve; essere annullata.
	</p>
	<Button color="red" onclick={() => showDeleteModal = true}>
		<TrashBinSolid class="w-4 h-4 me-2" />
		Cancella Tutti i Dati
	</Button>
</Card>

<!-- App Info -->
<Card class="max-w-none mb-6">
	<Heading tag="h3" class="mb-4">Informazioni sull'Applicazione</Heading>
	<div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
		<p><span class="font-semibold">Versione:</span> 2.0.0</p>
		<p><span class="font-semibold">Stack tecnologico:</span> SvelteKit 5, Svelte 5 (runes), Flowbite-Svelte, Tailwind CSS v4, ECharts, Dexie.js, TypeScript</p>
		<div>
			<p class="font-semibold mb-1">Fonti dati:</p>
			<ul class="list-disc list-inside space-y-1 ml-2">
				<li>
					S&P 500, Obbligazioni, T-Bills:
					<a href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html" target="_blank" rel="noopener" class="text-blue-600 hover:underline">
						NYU Stern (Damodaran)
					</a>
				</li>
				<li>
					CAPE Ratio:
					<a href="http://www.econ.yale.edu/~shiller/data.htm" target="_blank" rel="noopener" class="text-blue-600 hover:underline">
						Robert Shiller, Yale University
					</a>
				</li>
				<li>
					Inflazione Italia:
					<a href="https://www.istat.it/" target="_blank" rel="noopener" class="text-blue-600 hover:underline">
						ISTAT
					</a>
				</li>
				<li>Oro: World Gold Council</li>
				<li>Azioni Internazionali: MSCI World ex-USA</li>
				<li>Correlazioni: Morningstar / Vanguard</li>
			</ul>
		</div>
	</div>
</Card>

<!-- Delete Confirm Modal -->
<Modal title="Conferma Cancellazione" bind:open={showDeleteModal} size="sm">
	<div class="text-center">
		<ExclamationCircleSolid class="mx-auto mb-4 h-12 w-12 text-red-500" />
		<p class="mb-2 text-lg font-medium">Sei sicuro di voler cancellare tutti i dati?</p>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Verranno eliminati {profileCount} profili, {scenarioCount} scenari e {resultCount} risultati.
			Questa azione non pu&ograve; essere annullata.
		</p>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-3">
			<Button color="alternative" onclick={() => showDeleteModal = false}>Annulla</Button>
			<Button color="red" onclick={deleteAllData}>Cancella Tutto</Button>
		</div>
	{/snippet}
</Modal>

<!-- Import Confirm Modal -->
<Modal title="Conferma Importazione" bind:open={showImportModal} size="sm">
	<div>
		<InfoCircleSolid class="mx-auto mb-4 h-12 w-12 text-blue-500" />
		<p class="text-sm whitespace-pre-line text-gray-700 dark:text-gray-300">{importPreview}</p>
	</div>
	{#snippet footer()}
		<div class="flex justify-end gap-3">
			<Button color="alternative" onclick={() => { showImportModal = false; pendingImportData = null; }}>Annulla</Button>
			<Button color="blue" onclick={confirmImport}>Conferma Importazione</Button>
		</div>
	{/snippet}
</Modal>
