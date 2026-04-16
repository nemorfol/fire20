<script lang="ts">
	import { Button, Select, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Badge, Textarea, Alert, Input, Card } from 'flowbite-svelte';
	import { bankTemplates, parseBankData, recalculateResult, ALL_CATEGORIES, type BankImportResult, type BankTransaction } from '$lib/utils/bank-import';
	import { formatCurrency } from '$lib/utils/format';

	let {
		onApply
	}: {
		onApply?: (result: { annualIncome: number; annualExpenses: number }) => void;
	} = $props();

	let selectedBank = $state('generic-csv');
	let csvText = $state('');
	let parseResult = $state<BankImportResult | null>(null);
	let errorMessage = $state('');
	let successMessage = $state('');
	let searchQuery = $state('');
	let filterCategory = $state('');

	let selectedTemplate = $derived(bankTemplates.find(t => t.id === selectedBank));

	let bankOptions = $derived(bankTemplates.map(t => ({ value: t.id, name: `${t.name} - ${t.description}` })));

	let categoryFilterOptions = $derived(() => {
		const opts = [{ value: '', name: 'Tutte le categorie' }];
		for (const cat of ALL_CATEGORIES) {
			opts.push({ value: cat, name: cat });
		}
		return opts;
	});

	let filteredTransactions = $derived(() => {
		if (!parseResult) return [];
		let txs = parseResult.transactions;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			txs = txs.filter(t => t.description.toLowerCase().includes(q) || t.date.includes(q));
		}
		if (filterCategory) {
			txs = txs.filter(t => t.category === filterCategory);
		}
		return txs;
	});

	// Period in months for annualization
	let periodMonths = $derived(() => {
		if (!parseResult || !parseResult.period.from || !parseResult.period.to) return 12;
		const from = new Date(parseResult.period.from);
		const to = new Date(parseResult.period.to);
		const diffMs = to.getTime() - from.getTime();
		const months = Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 30.44));
		return months;
	});

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const ext = file.name.split('.').pop()?.toLowerCase() || '';

		if (ext === 'xls' || ext === 'xlsx') {
			const reader = new FileReader();
			reader.onload = (e) => {
				const data = e.target?.result as ArrayBuffer;
				if (!data) { errorMessage = 'Errore nella lettura del file.'; return; }
				doParseBinary(data);
			};
			reader.readAsArrayBuffer(file);
		} else {
			const reader = new FileReader();
			reader.onload = (e) => {
				csvText = e.target?.result as string || '';
				doParseText();
			};
			reader.readAsText(file);
		}
		input.value = '';
	}

	function doParseBinary(data: ArrayBuffer) {
		errorMessage = '';
		successMessage = '';
		parseResult = null;

		const result = parseBankData(data, selectedBank);
		if (!result || result.transactions.length === 0) {
			errorMessage = 'Nessun movimento trovato nel file. Verifica il formato e il template selezionato.';
			return;
		}
		parseResult = result;
	}

	function doParseText() {
		errorMessage = '';
		successMessage = '';
		parseResult = null;

		if (!csvText.trim()) {
			errorMessage = 'Inserisci o carica un file CSV.';
			return;
		}

		const result = parseBankData(csvText, selectedBank);
		if (!result || result.transactions.length === 0) {
			errorMessage = 'Nessun movimento trovato. Verifica il formato del CSV e il template selezionato.';
			return;
		}
		parseResult = result;
	}

	function updateCategory(index: number, newCategory: string) {
		if (!parseResult) return;
		parseResult.transactions[index].category = newCategory;
	}

	function handleRecalculate() {
		if (!parseResult) return;
		parseResult = recalculateResult([...parseResult.transactions]);
	}

	function handleApply() {
		if (!parseResult) return;
		const months = periodMonths();
		const annFactor = 12 / months;
		const annualIncome = Math.round(parseResult.totalIncome * annFactor);
		const annualExpenses = Math.round(Math.abs(parseResult.totalExpenses) * annFactor);
		onApply?.({ annualIncome, annualExpenses });
		successMessage = `Applicati: reddito annuo ${formatCurrency(annualIncome)}, spese annue ${formatCurrency(annualExpenses)}`;
	}

	function categoryColor(cat: string): 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'dark' | 'indigo' | 'pink' {
		switch (cat) {
			case 'Stipendio': return 'green';
			case 'Affitto/Mutuo': return 'red';
			case 'Bollette': return 'yellow';
			case 'Supermercato': return 'blue';
			case 'Trasporti': return 'purple';
			case 'Abbonamenti': return 'indigo';
			case 'Ristoranti': return 'pink';
			case 'Salute': return 'red';
			case 'Investimenti': return 'blue';
			case 'Tasse': return 'dark';
			case 'Shopping': return 'purple';
			default: return 'dark';
		}
	}

	// Simple bar chart data for categories (expenses only)
	let expenseBars = $derived(() => {
		if (!parseResult) return [];
		const expenses = parseResult.categorySummary
			.filter(c => c.total < 0)
			.sort((a, b) => a.total - b.total);
		const maxAbs = Math.max(...expenses.map(c => Math.abs(c.total)), 1);
		return expenses.map(c => ({
			category: c.category,
			total: Math.abs(c.total),
			count: c.count,
			percent: Math.round((Math.abs(c.total) / maxAbs) * 100)
		}));
	});
</script>

<div class="space-y-4">
	<h4 class="text-lg font-semibold text-gray-900 dark:text-white">
		Importa Movimenti Bancari
	</h4>
	<p class="text-sm text-gray-500 dark:text-gray-400">
		Importa i movimenti del conto corrente da un file esportato dalla tua banca (CSV o XLS) per calcolare automaticamente entrate e uscite.
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

	<!-- Selezione banca -->
	<div>
		<label for="bank-select" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
			Seleziona la tua banca
		</label>
		<Select id="bank-select" items={bankOptions} bind:value={selectedBank} />
	</div>

	<!-- Upload o incolla -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="bank-file" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
				Carica file (CSV/XLS/XLSX)
			</label>
			<input
				type="file"
				id="bank-file"
				accept=".csv,.txt,.xls,.xlsx"
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
			<label for="bank-paste" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
				Oppure incolla il CSV
			</label>
			<Textarea
				id="bank-paste"
				bind:value={csvText}
				rows={4}
				placeholder="Incolla qui il contenuto del CSV..."
			/>
		</div>
	</div>

	<Button size="sm" onclick={doParseText}>
		Analizza CSV
	</Button>

	<!-- Risultati -->
	{#if parseResult}
		<div class="space-y-4">
			<!-- Summary cards -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<p class="text-xs text-gray-500 dark:text-gray-400">Periodo</p>
					<p class="text-sm font-semibold text-gray-900 dark:text-white">
						{parseResult.period.from} / {parseResult.period.to}
					</p>
					<p class="text-xs text-gray-400">{parseResult.transactions.length} movimenti</p>
				</div>
				<div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
					<p class="text-xs text-gray-500 dark:text-gray-400">Entrate totali</p>
					<p class="text-lg font-bold text-green-600 dark:text-green-400">
						{formatCurrency(parseResult.totalIncome)}
					</p>
				</div>
				<div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
					<p class="text-xs text-gray-500 dark:text-gray-400">Uscite totali</p>
					<p class="text-lg font-bold text-red-600 dark:text-red-400">
						{formatCurrency(Math.abs(parseResult.totalExpenses))}
					</p>
				</div>
				<div class="p-3 rounded-lg border {parseResult.netFlow >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}">
					<p class="text-xs text-gray-500 dark:text-gray-400">Flusso netto</p>
					<p class="text-lg font-bold {parseResult.netFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}">
						{formatCurrency(parseResult.netFlow)}
					</p>
				</div>
			</div>

			<!-- Category bars (expenses) -->
			{#if expenseBars().length > 0}
				<div class="space-y-2">
					<h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Spese per categoria</h5>
					{#each expenseBars() as bar}
						<div class="flex items-center gap-2">
							<span class="text-xs w-28 text-right text-gray-600 dark:text-gray-400 truncate">{bar.category}</span>
							<div class="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div
									class="h-full bg-red-500 dark:bg-red-600 rounded-full transition-all"
									style="width: {bar.percent}%"
								></div>
							</div>
							<span class="text-xs w-24 text-gray-600 dark:text-gray-400">{formatCurrency(bar.total)} ({bar.count})</span>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Filters -->
			<div class="flex flex-col sm:flex-row gap-3">
				<div class="flex-1">
					<Input
						type="text"
						placeholder="Cerca movimenti..."
						bind:value={searchQuery}
					/>
				</div>
				<div class="w-full sm:w-56">
					<Select items={categoryFilterOptions()} bind:value={filterCategory} />
				</div>
			</div>

			<!-- Transaction table -->
			<div class="overflow-x-auto max-h-96 overflow-y-auto">
				<Table striped>
					<TableHead>
						<TableHeadCell>Data</TableHeadCell>
						<TableHeadCell>Descrizione</TableHeadCell>
						<TableHeadCell>Importo</TableHeadCell>
						<TableHeadCell>Categoria</TableHeadCell>
					</TableHead>
					<TableBody>
						{#each filteredTransactions() as tx, i}
							<TableBodyRow>
								<TableBodyCell class="whitespace-nowrap">{tx.date}</TableBodyCell>
								<TableBodyCell class="max-w-xs truncate" title={tx.description}>{tx.description}</TableBodyCell>
								<TableBodyCell class="whitespace-nowrap {tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-semibold">
									{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, true)}
								</TableBodyCell>
								<TableBodyCell>
									<select
										value={tx.category}
										onchange={(e) => {
											const realIdx = parseResult!.transactions.indexOf(tx);
											if (realIdx >= 0) updateCategory(realIdx, (e.target as HTMLSelectElement).value);
										}}
										class="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-2 py-1"
									>
										{#each ALL_CATEGORIES as cat}
											<option value={cat} selected={tx.category === cat}>{cat}</option>
										{/each}
									</select>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			</div>

			<div class="flex flex-wrap gap-3">
				<Button size="sm" color="alternative" onclick={handleRecalculate}>
					Ricalcola
				</Button>
				<Button size="sm" color="green" onclick={handleApply}>
					Applica al Profilo
				</Button>
			</div>
		</div>
	{/if}
</div>
