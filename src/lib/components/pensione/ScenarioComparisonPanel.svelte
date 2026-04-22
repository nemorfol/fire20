<script lang="ts">
	import {
		Card, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Badge
	} from 'flowbite-svelte';
	import {
		simulateINPSPension, calculateRiscattoLaureaCost,
		type INPSSimulatorParams, type INPSSimulatorResult
	} from '$lib/engine/inps-simulator';
	import { formatCurrency, formatPercent } from '$lib/utils/format';

	let {
		baseParams
	}: {
		baseParams: INPSSimulatorParams;
	} = $props();

	type Variant = {
		id: string;
		label: string;
		description: string;
		params: INPSSimulatorParams;
		result: INPSSimulatorResult | null;
	};

	let variants = $derived.by((): Variant[] => {
		const items: Variant[] = [
			{
				id: 'base',
				label: 'Baseline',
				description: 'Pensione stimata con i parametri del profilo',
				params: baseParams,
				result: safeSim(baseParams)
			},
			{
				id: 'riscatto',
				label: '+ Riscatto laurea (3 anni)',
				description: 'Con 3 anni di riscatto laurea aggiunti ai contributi',
				params: {
					...baseParams,
					riscattoLaurea: {
						years: 3,
						cost: calculateRiscattoLaureaCost(3, baseParams.contractType)
					}
				},
				result: null
			},
			{
				id: 'late',
				label: '+ 5 anni di lavoro',
				description: 'Posticipare il pensionamento di 5 anni',
				params: {
					...baseParams,
					targetRetirementAge: (baseParams.targetRetirementAge ?? 67) + 5
				},
				result: null
			},
			{
				id: 'salary-growth',
				label: '+ Crescita stipendio (4%/anno)',
				description: 'Ipotesi ottimistica: crescita salariale al 4% annuo invece del valore attuale',
				params: {
					...baseParams,
					salaryGrowthRate: 4
				},
				result: null
			}
		];
		// Calcola risultati per le varianti non ancora risolte
		for (const v of items) {
			if (v.result === null) v.result = safeSim(v.params);
		}
		return items;
	});

	function safeSim(p: INPSSimulatorParams): INPSSimulatorResult | null {
		try {
			return simulateINPSPension(p);
		} catch {
			return null;
		}
	}

	function pensionAtOptimal(v: Variant): number {
		if (!v.result) return 0;
		const target = v.params.targetRetirementAge ?? v.result.earliestRetirementAge;
		const point = v.result.pensionAtAge.find((p) => p.age === target)
			?? v.result.pensionAtAge.find((p) => p.age === v.result!.earliestRetirementAge);
		return point?.monthlyNet ?? 0;
	}

	let baseMonthly = $derived(variants[0] ? pensionAtOptimal(variants[0]) : 0);

	function deltaVsBase(v: Variant): number {
		if (v.id === 'base') return 0;
		return pensionAtOptimal(v) - baseMonthly;
	}
</script>

<Card class="max-w-none">
	<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Confronto scenari pensionistici
	</h5>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Varia uno parametro alla volta per vedere quanto cambia la pensione mensile netta
		stimata all'eta di uscita. Utile per capire quale leva ha l'impatto maggiore.
	</p>

	<div class="overflow-x-auto">
		<Table hoverable>
			<TableHead>
				<TableHeadCell>Scenario</TableHeadCell>
				<TableHeadCell>Eta uscita</TableHeadCell>
				<TableHeadCell class="text-right">Pensione netta/mese</TableHeadCell>
				<TableHeadCell class="text-right">Tasso sostituzione</TableHeadCell>
				<TableHeadCell class="text-right">Δ vs baseline</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each variants as v (v.id)}
					{@const delta = deltaVsBase(v)}
					{@const res = v.result}
					<TableBodyRow class={v.id === 'base' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
						<TableBodyCell>
							<div class="font-medium">{v.label}</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">{v.description}</div>
						</TableBodyCell>
						<TableBodyCell>
							{#if res}
								{v.params.targetRetirementAge ?? res.earliestRetirementAge} anni
							{:else}
								-
							{/if}
						</TableBodyCell>
						<TableBodyCell class="text-right tabular-nums font-medium">
							{formatCurrency(pensionAtOptimal(v))}
						</TableBodyCell>
						<TableBodyCell class="text-right tabular-nums">
							{#if res}
								{#each res.pensionAtAge.filter((p) => p.age === (v.params.targetRetirementAge ?? res.earliestRetirementAge)) as p}
									{formatPercent(p.replacementRate * 100)}
								{/each}
							{/if}
						</TableBodyCell>
						<TableBodyCell class="text-right">
							{#if v.id === 'base'}
								<span class="text-gray-400">-</span>
							{:else if delta > 0}
								<Badge color="green">+{formatCurrency(delta)}/mese</Badge>
							{:else if delta < 0}
								<Badge color="red">{formatCurrency(delta)}/mese</Badge>
							{:else}
								<Badge color="gray">{formatCurrency(0)}</Badge>
							{/if}
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>

	<p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
		Nota: i risultati sono stime basate sui coefficienti di trasformazione 2025-2026 e
		una rivalutazione del montante pari al PIL nominale medio (1,5%/anno). Variazioni
		normative possono alterare questi valori.
	</p>
</Card>
