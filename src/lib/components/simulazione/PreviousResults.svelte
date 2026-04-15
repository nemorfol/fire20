<script lang="ts">
	import {
		Card,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Button,
		Badge
	} from 'flowbite-svelte';
	import { TrashBinSolid, EyeSolid } from 'flowbite-svelte-icons';
	import type { SimulationResult } from '$lib/db/index';
	import { formatCurrency, formatDateShort, formatCompact } from '$lib/utils/format';

	let {
		results = [] as SimulationResult[],
		onLoad,
		onDelete
	}: {
		results?: SimulationResult[];
		onLoad: (result: SimulationResult) => void;
		onDelete: (id: number) => void;
	} = $props();

	function successColor(rate: number): string {
		if (rate >= 0.95) return 'green';
		if (rate >= 0.80) return 'yellow';
		return 'red';
	}
</script>

{#if results.length > 0}
	<Card class="max-w-none">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			Risultati Precedenti
		</h3>
		<div class="overflow-x-auto">
			<Table striped hoverable>
				<TableHead>
					<TableHeadCell class="text-xs">Data</TableHeadCell>
					<TableHeadCell class="text-xs text-center">Iterazioni</TableHeadCell>
					<TableHeadCell class="text-xs text-center">Anni</TableHeadCell>
					<TableHeadCell class="text-xs text-center">Successo</TableHeadCell>
					<TableHeadCell class="text-xs text-right">Mediana Finale</TableHeadCell>
					<TableHeadCell class="text-xs text-center">Azioni</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each results as result}
						<TableBodyRow>
							<TableBodyCell class="text-xs">
								{formatDateShort(new Date(result.runAt))}
							</TableBodyCell>
							<TableBodyCell class="text-center text-xs">
								{result.iterations.toLocaleString('it-IT')}
							</TableBodyCell>
							<TableBodyCell class="text-center text-xs">
								{result.years}
							</TableBodyCell>
							<TableBodyCell class="text-center">
								<Badge color={successColor(result.successRate)}>
									{(result.successRate * 100).toFixed(1)}%
								</Badge>
							</TableBodyCell>
							<TableBodyCell class="text-right text-xs">
								{formatCompact(result.medianFinalValue)}
							</TableBodyCell>
							<TableBodyCell class="text-center">
								<div class="flex items-center justify-center gap-2">
									<Button
										size="xs"
										color="primary"
										outline
										onclick={() => onLoad(result)}
									>
										<EyeSolid class="w-3 h-3 me-1" />
										Carica
									</Button>
									<Button
										size="xs"
										color="red"
										outline
										onclick={() => onDelete(result.id)}
									>
										<TrashBinSolid class="w-3 h-3" />
									</Button>
								</div>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	</Card>
{/if}
