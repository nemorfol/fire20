<script lang="ts">
	import {
		Table,
		TableHead,
		TableBody,
		TableHeadCell,
		TableBodyRow,
		TableBodyCell
	} from 'flowbite-svelte';
	import { formatCurrency } from '$lib/utils/format';
	import type { YearlyProjection } from '$lib/engine/fire-calculator';

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
		return sortAsc ? ' \u2191' : ' \u2193';
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
		{ key: 'returns', label: 'Rendimenti' },
		{ key: 'withdrawals', label: 'Prelievi' },
		{ key: 'taxes', label: 'Tasse' }
	];
</script>

<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
	<div class="p-4 border-b border-gray-200 dark:border-gray-700">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
			Proiezione Anno per Anno
		</h3>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Clicca sulle intestazioni per ordinare. Le righe evidenziate indicano il FIRE e l'eta pensionabile.
		</p>
	</div>

	<div class="overflow-x-auto max-h-[500px] overflow-y-auto">
		<Table striped hoverable>
			<TableHead class="sticky top-0 z-10">
				{#each columns as col}
					<TableHeadCell class="cursor-pointer select-none whitespace-nowrap" onclick={() => toggleSort(col.key)}>
						{col.label}{sortIcon(col.key)}
					</TableHeadCell>
				{/each}
			</TableHead>
			<TableBody>
				{#each sorted as row}
					<TableBodyRow class={isHighlightedRow(row)}>
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
				{/each}
			</TableBody>
		</Table>
	</div>
</div>
