<script lang="ts">
	import {
		Card,
		Badge,
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell
	} from 'flowbite-svelte';
	import { fireBenchmarks, type FIREBenchmark } from '$lib/data/benchmarks';
	import { formatCurrency } from '$lib/utils/format';
	import { t } from '$lib/i18n/store.svelte';

	let {
		userSavingsRate = 0,
		userFireNumber = 0,
		userYearsToFire = 0
	}: {
		userSavingsRate?: number;
		userFireNumber?: number;
		userYearsToFire?: number;
	} = $props();

	// Massimo FIRE number tra i benchmark per la scala delle barre
	let maxFireNumber = $derived(
		Math.max(...fireBenchmarks.map((b) => b.typicalFireNumber), userFireNumber)
	);

	function compareValue(
		userVal: number,
		benchVal: number,
		lowerIsBetter: boolean = false
	): 'better' | 'worse' | 'similar' {
		const diff = Math.abs(userVal - benchVal) / Math.max(benchVal, 1);
		if (diff < 0.1) return 'similar';
		if (lowerIsBetter) {
			return userVal < benchVal ? 'better' : 'worse';
		}
		return userVal > benchVal ? 'better' : 'worse';
	}

	function badgeColor(comparison: 'better' | 'worse' | 'similar'): 'green' | 'red' | 'gray' {
		if (comparison === 'better') return 'green';
		if (comparison === 'worse') return 'red';
		return 'gray';
	}

	function comparisonLabel(comparison: 'better' | 'worse' | 'similar'): string {
		if (comparison === 'better') return t('compare.better');
		if (comparison === 'worse') return t('compare.worse');
		return t('compare.similar');
	}

	function barWidth(value: number): string {
		if (maxFireNumber <= 0) return '0%';
		return `${Math.max(2, (value / maxFireNumber) * 100)}%`;
	}
</script>

<Card class="max-w-none">
	<h5 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
		Confronto FIRE Internazionale
	</h5>
	<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
		Come si posiziona il tuo piano FIRE rispetto ai benchmark internazionali.
	</p>

	<!-- Barre FIRE Number -->
	<div class="mb-6">
		<h6 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
			FIRE Number a confronto
		</h6>
		<div class="space-y-2">
			<!-- User bar -->
			<div class="flex items-center gap-2">
				<span class="text-primary-600 dark:text-primary-400 w-44 truncate text-sm font-semibold"
					>Il tuo piano</span
				>
				<div class="h-5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
					<div
						class="bg-primary-500 h-5 rounded-full transition-all"
						style="width: {barWidth(userFireNumber)}"
					></div>
				</div>
				<span class="w-24 text-right text-xs text-gray-600 dark:text-gray-400"
					>{formatCurrency(userFireNumber)}</span
				>
			</div>
			<!-- Benchmark bars -->
			{#each fireBenchmarks as benchmark}
				<div class="flex items-center gap-2">
					<span class="w-44 truncate text-sm">{benchmark.flag} {benchmark.name}</span>
					<div class="h-5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
						<div
							class="h-5 rounded-full bg-gray-400 transition-all dark:bg-gray-500"
							style="width: {barWidth(benchmark.typicalFireNumber)}"
						></div>
					</div>
					<span class="w-24 text-right text-xs text-gray-600 dark:text-gray-400"
						>{formatCurrency(benchmark.typicalFireNumber)}</span
					>
				</div>
			{/each}
		</div>
	</div>

	<!-- Tabella dettagliata -->
	<div class="overflow-x-auto">
		<Table striped>
			<TableHead>
				<TableHeadCell>Paese</TableHeadCell>
				<TableHeadCell>Risparmio</TableHeadCell>
				<TableHeadCell>Anni FIRE</TableHeadCell>
				<TableHeadCell>SWR</TableHeadCell>
				<TableHeadCell>Tasse</TableHeadCell>
				<TableHeadCell>Sanita'/anno</TableHeadCell>
				<TableHeadCell>Costo vita</TableHeadCell>
			</TableHead>
			<TableBody>
				<!-- Riga utente -->
				<TableBodyRow class="bg-primary-50 dark:bg-primary-900/20">
					<TableBodyCell>
						<span class="text-primary-600 dark:text-primary-400 font-semibold">Il tuo piano</span>
					</TableBodyCell>
					<TableBodyCell>
						<span class="font-semibold">{(userSavingsRate * 100).toFixed(0)}%</span>
					</TableBodyCell>
					<TableBodyCell>
						<span class="font-semibold">{userYearsToFire > 0 ? userYearsToFire : 'N/D'}</span>
					</TableBodyCell>
					<TableBodyCell>-</TableBodyCell>
					<TableBodyCell>-</TableBodyCell>
					<TableBodyCell>-</TableBodyCell>
					<TableBodyCell>-</TableBodyCell>
				</TableBodyRow>
				<!-- Benchmark rows -->
				{#each fireBenchmarks as b}
					{@const savingsComp = compareValue(userSavingsRate * 100, b.avgSavingsRate)}
					{@const yearsComp = compareValue(userYearsToFire, b.avgYearsToFire, true)}
					<TableBodyRow>
						<TableBodyCell>
							<div>
								<span class="font-medium">{b.flag} {b.name}</span>
								<p class="mt-0.5 max-w-xs text-xs text-gray-400">{b.description}</p>
							</div>
						</TableBodyCell>
						<TableBodyCell>
							{b.avgSavingsRate}%
							<Badge color={badgeColor(savingsComp)} class="ml-1"
								>{comparisonLabel(savingsComp)}</Badge
							>
						</TableBodyCell>
						<TableBodyCell>
							{b.avgYearsToFire}
							{#if userYearsToFire > 0}
								<Badge color={badgeColor(yearsComp)} class="ml-1"
									>{comparisonLabel(yearsComp)}</Badge
								>
							{/if}
						</TableBodyCell>
						<TableBodyCell>{b.typicalSWR}%</TableBodyCell>
						<TableBodyCell>{b.taxRate}%</TableBodyCell>
						<TableBodyCell>{formatCurrency(b.healthcareCost)}</TableBodyCell>
						<TableBodyCell>
							<div class="flex items-center gap-1">
								{b.costOfLivingIndex}
								{#if b.costOfLivingIndex < 80}
									<Badge color="green" class="text-xs">Basso</Badge>
								{:else if b.costOfLivingIndex > 120}
									<Badge color="red" class="text-xs">Alto</Badge>
								{/if}
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
	<p class="mt-3 text-xs text-gray-400">
		* Indice costo della vita relativo all'Italia (= 100). Dati indicativi basati su medie della
		comunita' FIRE.
	</p>
</Card>
