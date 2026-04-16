<script lang="ts">
	import {
		Card, Button, Textarea, Fileupload,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell,
		Badge, Alert, Heading
	} from 'flowbite-svelte';
	import { InfoCircleSolid, CheckCircleOutline, ExclamationCircleSolid } from 'flowbite-svelte-icons';
	import {
		parseINPSAuto,
		type INPSExtract
	} from '$lib/utils/inps-parser';
	import { formatCurrency } from '$lib/utils/format';

	let {
		onApply
	}: {
		onApply?: (data: { contributionYears: number; estimatedMonthly: number; montante: number }) => void;
	} = $props();

	let pastedText = $state('');
	let extract = $state<INPSExtract | null>(null);
	let parseError = $state('');
	let applied = $state(false);

	function handleParse() {
		parseError = '';
		applied = false;
		if (!pastedText.trim()) {
			parseError = 'Incolla il testo dell\'estratto conto contributivo INPS.';
			return;
		}

		// Auto-detect formato (XML, CSV, testo)
		const result = parseINPSAuto(pastedText);

		if (!result || result.contributions.length === 0) {
			parseError = 'Impossibile analizzare i dati. Verifica il formato: ogni riga deve contenere almeno anno, retribuzione e contributi, separati da tabulazione, punto e virgola o virgola.';
			return;
		}

		extract = result;
	}

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (text) {
				pastedText = text;
				handleParse();
			}
		};
		reader.readAsText(file);
		input.value = '';
	}

	function handleApply() {
		if (!extract || !onApply) return;

		// Estimate monthly pension from montante using transformation coefficient
		// For age 67: coefficient ~5.723% (2024 INPS tables)
		const TRANSFORMATION_COEFFICIENT = 0.05723;
		const annualPension = extract.estimatedMontante * TRANSFORMATION_COEFFICIENT;
		const monthlyPension = Math.round(annualPension / 13);

		onApply({
			contributionYears: extract.totalYears,
			estimatedMonthly: monthlyPension,
			montante: extract.estimatedMontante,
		});

		applied = true;
	}

	function handleReset() {
		pastedText = '';
		extract = null;
		parseError = '';
		applied = false;
	}
</script>

<Card class="max-w-none mt-6">
	<Heading tag="h4" class="mb-4 text-lg">Importa Estratto Conto Contributivo INPS</Heading>

	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Incolla i dati copiati dal sito INPS oppure carica un file CSV/TXT per calcolare automaticamente il montante contributivo e la pensione stimata.
	</p>

	<!-- Input area -->
	{#if !extract}
		<div class="space-y-4">
			<div>
				<Textarea
					bind:value={pastedText}
					placeholder={"Incolla qui il testo dell'estratto conto...\n\nFormati supportati:\nAnno\tSettimane\tRetribuzione\tContributi\n2015\t52\t28000\t9240\n2016\t52\t29000\t9570\n...\n\nOppure CSV:\nAnno;Settimane;Retribuzione;Contributi\n2015;52;28000;9240"}
					rows={8}
					class="font-mono text-sm"
				/>
			</div>

			<div class="flex flex-col sm:flex-row gap-3 items-start">
				<Button color="blue" onclick={handleParse} disabled={!pastedText.trim()}>
					Analizza Dati
				</Button>

				<div class="flex-1">
					<Fileupload accept=".csv,.txt,.tsv,.xml" onchange={handleFileUpload} />
					<p class="text-xs text-gray-400 mt-1">Oppure carica un file CSV o TXT</p>
				</div>
			</div>

			{#if parseError}
				<Alert color="red">
					<ExclamationCircleSolid class="w-4 h-4 me-2 inline" />
					{parseError}
				</Alert>
			{/if}
		</div>
	{:else}
		<!-- Results -->
		<div class="space-y-4">
			<!-- Summary badges -->
			<div class="flex flex-wrap gap-3">
				<Badge large color="blue">{extract.totalYears} anni</Badge>
				<Badge large color="indigo">{extract.totalWeeks} settimane</Badge>
				<Badge large color="purple">Media: {formatCurrency(extract.averageSalary)}/anno</Badge>
				<Badge large color="green">Contributi: {formatCurrency(extract.totalContributions)}</Badge>
			</div>

			<!-- Montante result -->
			<Card class="max-w-none bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Montante Contributivo Stimato</p>
						<p class="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(extract.estimatedMontante)}</p>
					</div>
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pensione Annua Stimata (a 67 anni)</p>
						<p class="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(Math.round(extract.estimatedMontante * 0.05723))}</p>
					</div>
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pensione Mensile Stimata (13 mensilita)</p>
						<p class="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(Math.round(extract.estimatedMontante * 0.05723 / 13))}</p>
					</div>
				</div>
			</Card>

			<!-- Data table -->
			<div class="max-h-64 overflow-y-auto border rounded-lg dark:border-gray-700">
				<Table striped>
					<TableHead>
						<TableHeadCell>Anno</TableHeadCell>
						<TableHeadCell>Settimane</TableHeadCell>
						<TableHeadCell>Retribuzione</TableHeadCell>
						<TableHeadCell>Contributi</TableHeadCell>
						{#if extract.contributions.some(c => c.employer)}
							<TableHeadCell>Datore</TableHeadCell>
						{/if}
					</TableHead>
					<TableBody>
						{#each extract.contributions as c}
							<TableBodyRow>
								<TableBodyCell>{c.year}</TableBodyCell>
								<TableBodyCell>{c.weeks}</TableBodyCell>
								<TableBodyCell>{formatCurrency(c.grossSalary)}</TableBodyCell>
								<TableBodyCell>{formatCurrency(c.contributions)}</TableBodyCell>
								{#if extract.contributions.some(cc => cc.employer)}
									<TableBodyCell>{c.employer || '-'}</TableBodyCell>
								{/if}
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</div>

			<!-- Actions -->
			<div class="flex flex-wrap gap-3">
				{#if onApply}
					<Button color="green" onclick={handleApply} disabled={applied}>
						{#if applied}
							<CheckCircleOutline class="w-4 h-4 me-2" />
							Applicato al Profilo
						{:else}
							Applica al Profilo
						{/if}
					</Button>
				{/if}
				<Button color="alternative" onclick={handleReset}>
					Nuova Importazione
				</Button>
			</div>

			{#if applied}
				<Alert color="green">
					<CheckCircleOutline class="w-4 h-4 me-2 inline" />
					Dati applicati al profilo. Gli anni di contribuzione e la pensione mensile stimata sono stati aggiornati.
				</Alert>
			{/if}

			<Alert color="blue">
				<InfoCircleSolid class="w-4 h-4 me-2 inline" />
				Il montante e rivalutato con un tasso medio dell'1,5% (crescita PIL). La pensione e calcolata con il coefficiente di trasformazione a 67 anni (5,723%). Si tratta di una stima indicativa.
			</Alert>
		</div>
	{/if}
</Card>
