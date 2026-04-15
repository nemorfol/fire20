<script lang="ts">
	import { Button, Select, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Badge, Textarea, Alert } from 'flowbite-svelte';
	import { ArrowDownToBracketOutline, UploadSolid } from 'flowbite-svelte-icons';
	import { brokerTemplates, parseBrokerCSV, type PortfolioImport } from '$lib/utils/broker-import';
	import { formatCurrency } from '$lib/utils/format';

	let {
		onApply
	}: {
		onApply?: (result: PortfolioImport) => void;
	} = $props();

	let selectedBroker = $state('directa');
	let csvText = $state('');
	let parseResult = $state<PortfolioImport | null>(null);
	let errorMessage = $state('');
	let successMessage = $state('');

	let selectedTemplate = $derived(brokerTemplates.find(t => t.id === selectedBroker));

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			csvText = e.target?.result as string || '';
			doParse();
		};
		reader.readAsText(file);
		input.value = '';
	}

	function doParse() {
		errorMessage = '';
		successMessage = '';
		parseResult = null;

		if (!csvText.trim()) {
			errorMessage = 'Inserisci o carica un file CSV.';
			return;
		}

		const result = parseBrokerCSV(csvText, selectedBroker);
		if (!result || result.positions.length === 0) {
			errorMessage = 'Nessuna posizione trovata. Verifica il formato del CSV e il template selezionato.';
			return;
		}

		parseResult = result;
	}

	function handleApply() {
		if (!parseResult) return;
		onApply?.(parseResult);
		successMessage = `Importate ${parseResult.positions.length} posizioni nel patrimonio.`;
		parseResult = null;
		csvText = '';
	}

	function categoryBadgeColor(type: string): 'blue' | 'green' | 'yellow' | 'purple' | 'dark' {
		const lower = type.toLowerCase();
		if (lower.includes('azione') || lower.includes('etf') || lower.includes('azion')) return 'blue';
		if (lower.includes('obbligaz') || lower.includes('bond')) return 'green';
		if (lower.includes('oro') || lower.includes('gold')) return 'yellow';
		if (lower.includes('liquid') || lower.includes('cash')) return 'purple';
		return 'dark';
	}

	let totalValue = $derived(parseResult ? parseResult.positions.reduce((s, p) => s + p.value, 0) : 0);

	let brokerOptions = $derived(brokerTemplates.map(t => ({ value: t.id, name: `${t.name} - ${t.description}` })));
</script>

<div class="space-y-4">
	<h4 class="text-lg font-semibold text-gray-900 dark:text-white">
		Importa da Broker
	</h4>
	<p class="text-sm text-gray-500 dark:text-gray-400">
		Importa le posizioni del tuo portafoglio da un file CSV esportato dal tuo broker.
	</p>

	{#if errorMessage}
		<Alert color="red" dismissable>
			{errorMessage}
		</Alert>
	{/if}

	{#if successMessage}
		<Alert color="green" dismissable>
			{successMessage}
		</Alert>
	{/if}

	<!-- Selezione broker -->
	<div>
		<label for="broker-select" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
			Seleziona il tuo broker
		</label>
		<Select id="broker-select" items={brokerOptions} bind:value={selectedBroker} />
	</div>

	{#if selectedTemplate}
		<p class="text-xs text-gray-400">
			Intestazioni attese: <code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{selectedTemplate.sampleHeaders.join(', ')}</code>
		</p>
	{/if}

	<!-- Upload o incolla -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="csv-file" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
				Carica file CSV
			</label>
			<input
				type="file"
				id="csv-file"
				accept=".csv,.txt"
				onchange={handleFileUpload}
				class="block w-full text-sm text-gray-500 dark:text-gray-400
					file:mr-4 file:py-2 file:px-4
					file:rounded-lg file:border-0
					file:text-sm file:font-semibold
					file:bg-primary-50 file:text-primary-700
					dark:file:bg-primary-900/30 dark:file:text-primary-400
					hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50
					cursor-pointer"
			/>
		</div>
		<div>
			<label for="csv-paste" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
				Oppure incolla il CSV
			</label>
			<Textarea
				id="csv-paste"
				bind:value={csvText}
				rows={4}
				placeholder="Incolla qui il contenuto del CSV..."
			/>
		</div>
	</div>

	<Button size="sm" onclick={doParse}>
		Analizza CSV
	</Button>

	<!-- Preview risultati -->
	{#if parseResult}
		<div class="space-y-4">
			<!-- Riepilogo categorie -->
			<div class="flex flex-wrap gap-3">
				{#if parseResult.stocks > 0}
					<Badge color="blue" large>Azioni: {formatCurrency(parseResult.stocks)}</Badge>
				{/if}
				{#if parseResult.bonds > 0}
					<Badge color="green" large>Obbligazioni: {formatCurrency(parseResult.bonds)}</Badge>
				{/if}
				{#if parseResult.gold > 0}
					<Badge color="yellow" large>Oro: {formatCurrency(parseResult.gold)}</Badge>
				{/if}
				{#if parseResult.cash > 0}
					<Badge color="purple" large>Liquidita: {formatCurrency(parseResult.cash)}</Badge>
				{/if}
				{#if parseResult.other > 0}
					<Badge color="dark" large>Altro: {formatCurrency(parseResult.other)}</Badge>
				{/if}
				<Badge color="primary" large>Totale: {formatCurrency(totalValue)}</Badge>
			</div>

			<!-- Tabella posizioni -->
			<div class="overflow-x-auto">
				<Table striped>
					<TableHead>
						<TableHeadCell>Posizione</TableHeadCell>
						<TableHeadCell>Categoria</TableHeadCell>
						<TableHeadCell>Valore</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each parseResult.positions as pos}
							<TableBodyRow>
								<TableBodyCell>{pos.name}</TableBodyCell>
								<TableBodyCell>
									<Badge color={categoryBadgeColor(pos.type)}>{pos.type}</Badge>
								</TableBodyCell>
								<TableBodyCell>{formatCurrency(pos.value)}</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</div>

			<Button color="green" onclick={handleApply}>
				Applica al Patrimonio
			</Button>
		</div>
	{/if}
</div>
