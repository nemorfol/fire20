<script lang="ts">
	import {
		Table,
		TableHead,
		TableBody,
		TableHeadCell,
		TableBodyRow,
		TableBodyCell,
		Button,
		Toggle
	} from 'flowbite-svelte';
	import { DownloadOutline, ChevronDownOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
	import { formatCurrency } from '$lib/utils/format';
	import type { YearlyProjection } from '$lib/engine/fire-calculator';
	import { exportCashFlowCSV } from '$lib/utils/cash-flow-export';

	let {
		projections = [] as YearlyProjection[],
		retirementAge = 0,
		pensionAge = 67
	}: {
		projections?: YearlyProjection[];
		retirementAge?: number;
		pensionAge?: number;
	} = $props();

	let sortKey = $state<keyof YearlyProjection>('year');
	let sortAsc = $state(true);
	let detailedView = $state(false);
	let expandedRows = $state<Set<number>>(new Set());

	let sorted = $derived.by(() => {
		const arr = [...projections];
		arr.sort((a, b) => {
			const va = a[sortKey];
			const vb = b[sortKey];
			if (typeof va === 'number' && typeof vb === 'number') {
				return sortAsc ? va - vb : vb - va;
			}
			return 0;
		});
		return arr;
	});

	function toggleSort(key: keyof YearlyProjection) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = true;
		}
	}

	function sortIcon(key: keyof YearlyProjection): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' ↑' : ' ↓';
	}

	function toggleRow(year: number) {
		const next = new Set(expandedRows);
		if (next.has(year)) {
			next.delete(year);
		} else {
			next.add(year);
		}
		expandedRows = next;
	}

	function isHighlightedRow(d: YearlyProjection): string {
		if (d.age === retirementAge) return 'bg-green-50 dark:bg-green-900/20 font-semibold';
		if (d.age === retirementAge + 1) return 'bg-amber-50 dark:bg-amber-900/20';
		if (d.age === pensionAge) return 'bg-blue-50 dark:bg-blue-900/20';
		return '';
	}

	const columns: { key: keyof YearlyProjection; label: string }[] = [
		{ key: 'year', label: 'Anno' },
		{ key: 'age', label: 'Eta\'' },
		{ key: 'portfolio', label: 'Portafoglio' },
		{ key: 'contributions', label: 'Contributi' },
		{ key: 'pensionIncome', label: 'Pensione' },
		{ key: 'returns', label: 'Rendimenti' },
		{ key: 'withdrawals', label: 'Prelievi' },
		{ key: 'taxes', label: 'Tasse' }
	];

	function handleExport() {
		exportCashFlowCSV(sorted, `cash-flow-fire-${new Date().toISOString().slice(0, 10)}.csv`);
	}
</script>

<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
	<div class="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
		<div>
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
				Proiezione Anno per Anno
			</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				Clicca sulle intestazioni per ordinare. Attiva la vista dettagliata per vedere il breakdown fiscale riga per riga.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Toggle bind:checked={detailedView}>
				<span class="text-sm font-medium">Vista dettagliata</span>
			</Toggle>
			<Button size="xs" color="alternative" onclick={handleExport}>
				<DownloadOutline class="w-4 h-4 me-1" />
				Esporta CSV
			</Button>
		</div>
	</div>

	<div class="overflow-x-auto max-h-[500px] overflow-y-auto">
		<Table striped hoverable>
			<TableHead class="sticky top-0 z-10">
				{#if detailedView}
					<TableHeadCell class="w-8"></TableHeadCell>
				{/if}
				{#each columns as col}
					<TableHeadCell class="cursor-pointer select-none whitespace-nowrap" onclick={() => toggleSort(col.key)}>
						{col.label}{sortIcon(col.key)}
					</TableHeadCell>
				{/each}
			</TableHead>
			<TableBody>
				{#each sorted as row}
					<TableBodyRow class={isHighlightedRow(row)}>
						{#if detailedView}
							<TableBodyCell class="p-1">
								<button
									type="button"
									class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
									aria-label="Espandi dettaglio"
									onclick={() => toggleRow(row.year)}
								>
									{#if expandedRows.has(row.year)}
										<ChevronDownOutline class="w-4 h-4" />
									{:else}
										<ChevronRightOutline class="w-4 h-4" />
									{/if}
								</button>
							</TableBodyCell>
						{/if}
						<TableBodyCell>{row.year}</TableBodyCell>
						<TableBodyCell>
							{row.age}
							{#if row.age === retirementAge}
								<span class="ml-1 text-xs text-green-600 dark:text-green-400 font-bold">FIRE</span>
							{/if}
							{#if row.age === pensionAge}
								<span class="ml-1 text-xs text-blue-600 dark:text-blue-400 font-bold">Pensione</span>
							{/if}
						</TableBodyCell>
						<TableBodyCell class="tabular-nums font-medium">{formatCurrency(row.portfolio)}</TableBodyCell>
						<TableBodyCell class="tabular-nums {row.contributions > 0 ? 'text-green-600 dark:text-green-400' : ''}">
							{row.contributions > 0 ? '+' : ''}{formatCurrency(row.contributions)}
						</TableBodyCell>
						<TableBodyCell class="tabular-nums {(row.pensionIncome ?? 0) > 0 ? 'text-blue-600 dark:text-blue-400' : ''}">
							{(row.pensionIncome ?? 0) > 0 ? formatCurrency(row.pensionIncome ?? 0) : ''}
						</TableBodyCell>
						<TableBodyCell class="tabular-nums {row.returns >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
							{row.returns >= 0 ? '+' : ''}{formatCurrency(row.returns)}
						</TableBodyCell>
						<TableBodyCell class="tabular-nums {row.withdrawals > 0 ? 'text-orange-600 dark:text-orange-400' : ''}">
							{row.withdrawals > 0 ? '-' : ''}{formatCurrency(row.withdrawals)}
						</TableBodyCell>
						<TableBodyCell class="tabular-nums text-red-600 dark:text-red-400">
							{row.taxes > 0 ? '-' : ''}{formatCurrency(row.taxes)}
						</TableBodyCell>
					</TableBodyRow>

					{#if detailedView && expandedRows.has(row.year)}
						<TableBodyRow class="bg-gray-50 dark:bg-gray-900/40">
							<TableBodyCell colspan={9} class="p-0">
								<div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
									<!-- Entrate -->
									<div>
										<h6 class="font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">Entrate</h6>
										<dl class="space-y-1">
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">Stipendio lordo</dt>
												<dd class="tabular-nums">{formatCurrency(row.grossSalary ?? 0)}</dd>
											</div>
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">Contributi INPS</dt>
												<dd class="tabular-nums text-red-600 dark:text-red-400">-{formatCurrency(row.inpsContributions ?? 0)}</dd>
											</div>
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">IRPEF + addizionali</dt>
												<dd class="tabular-nums text-red-600 dark:text-red-400">-{formatCurrency(row.irpef ?? 0)}</dd>
											</div>
											<div class="flex justify-between font-medium border-t border-gray-200 dark:border-gray-700 pt-1">
												<dt class="text-gray-700 dark:text-gray-300">Stipendio netto</dt>
												<dd class="tabular-nums">{formatCurrency(row.netSalary ?? 0)}</dd>
											</div>
											{#if (row.pensionIncome ?? 0) > 0}
												<div class="flex justify-between">
													<dt class="text-gray-500 dark:text-gray-400">Pensione INPS</dt>
													<dd class="tabular-nums text-blue-600 dark:text-blue-400">+{formatCurrency(row.pensionIncome ?? 0)}</dd>
												</div>
											{/if}
											{#if (row.otherIncomeActive ?? 0) > 0}
												<div class="flex justify-between">
													<dt class="text-gray-500 dark:text-gray-400">Altri redditi</dt>
													<dd class="tabular-nums text-blue-600 dark:text-blue-400">+{formatCurrency(row.otherIncomeActive ?? 0)}</dd>
												</div>
											{/if}
										</dl>
									</div>

									<!-- Uscite -->
									<div>
										<h6 class="font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">Uscite</h6>
										<dl class="space-y-1">
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">Spese base</dt>
												<dd class="tabular-nums">{formatCurrency(row.baseExpenses ?? 0)}</dd>
											</div>
											{#if (row.childrenExpenses ?? 0) > 0}
												<div class="flex justify-between">
													<dt class="text-gray-500 dark:text-gray-400">Spese figli</dt>
													<dd class="tabular-nums">{formatCurrency(row.childrenExpenses ?? 0)}</dd>
												</div>
											{/if}
											{#if (row.mortgagePayment ?? 0) > 0}
												<div class="flex justify-between">
													<dt class="text-gray-500 dark:text-gray-400">Rata mutuo</dt>
													<dd class="tabular-nums">{formatCurrency(row.mortgagePayment ?? 0)}</dd>
												</div>
											{/if}
											<div class="flex justify-between font-medium border-t border-gray-200 dark:border-gray-700 pt-1">
												<dt class="text-gray-700 dark:text-gray-300">Totale spese</dt>
												<dd class="tabular-nums">{formatCurrency(row.totalExpenses ?? 0)}</dd>
											</div>
										</dl>
									</div>

									<!-- Portafoglio -->
									<div>
										<h6 class="font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">Portafoglio</h6>
										<dl class="space-y-1">
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">Rendimenti lordi</dt>
												<dd class="tabular-nums">{formatCurrency(row.investmentReturnsGross ?? 0)}</dd>
											</div>
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">Tasse rendimenti</dt>
												<dd class="tabular-nums text-red-600 dark:text-red-400">-{formatCurrency(row.taxes)}</dd>
											</div>
											<div class="flex justify-between">
												<dt class="text-gray-500 dark:text-gray-400">Rendimenti netti</dt>
												<dd class="tabular-nums">{formatCurrency(row.returns)}</dd>
											</div>
											{#if row.contributions > 0}
												<div class="flex justify-between">
													<dt class="text-gray-500 dark:text-gray-400">Nuovi contributi</dt>
													<dd class="tabular-nums text-green-600 dark:text-green-400">+{formatCurrency(row.contributions)}</dd>
												</div>
											{/if}
											{#if row.withdrawals > 0}
												<div class="flex justify-between">
													<dt class="text-gray-500 dark:text-gray-400">Prelievi</dt>
													<dd class="tabular-nums text-orange-600 dark:text-orange-400">-{formatCurrency(row.withdrawals)}</dd>
												</div>
											{/if}
											<div class="flex justify-between font-medium border-t border-gray-200 dark:border-gray-700 pt-1">
												<dt class="text-gray-700 dark:text-gray-300">Portafoglio finale</dt>
												<dd class="tabular-nums">{formatCurrency(row.portfolio)}</dd>
											</div>
										</dl>
									</div>
								</div>
							</TableBodyCell>
						</TableBodyRow>
					{/if}
				{/each}
			</TableBody>
		</Table>
	</div>
</div>
