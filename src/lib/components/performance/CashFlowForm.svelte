<script lang="ts">
	import { Button, Input, Label, Select, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Modal, Badge } from 'flowbite-svelte';
	import { CirclePlusSolid, TrashBinSolid } from 'flowbite-svelte-icons';
	import { db, type CashFlowRecord } from '$lib/db/index';
	import { liveQuery } from 'dexie';

	let {
		profileId = 1,
		onCashFlowsChanged = () => {}
	}: {
		profileId?: number;
		onCashFlowsChanged?: () => void;
	} = $props();

	let showModal = $state(false);
	let dateValue = $state('');
	let amount = $state(0);
	let flowType = $state<'contribution' | 'withdrawal' | 'dividend'>('contribution');
	let description = $state('');

	const typeOptions = [
		{ value: 'contribution', name: 'Contributo' },
		{ value: 'withdrawal', name: 'Prelievo' },
		{ value: 'dividend', name: 'Dividendo' }
	];

	const typeLabels: Record<string, string> = {
		contribution: 'Contributo',
		withdrawal: 'Prelievo',
		dividend: 'Dividendo'
	};

	const typeColors: Record<string, 'green' | 'red' | 'blue'> = {
		contribution: 'green',
		withdrawal: 'red',
		dividend: 'blue'
	};

	let cashFlows = $state<CashFlowRecord[]>([]);

	$effect(() => {
		const sub = liveQuery(() =>
			db.cash_flows.where('profileId').equals(profileId).sortBy('date')
		).subscribe((result) => {
			cashFlows = result;
		});
		return () => sub.unsubscribe();
	});

	async function addCashFlow() {
		if (!dateValue || amount === 0) return;

		const signedAmount = flowType === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount);

		await db.cash_flows.add({
			profileId,
			date: new Date(dateValue),
			amount: signedAmount,
			type: flowType,
			description: description || undefined
		});

		dateValue = '';
		amount = 0;
		flowType = 'contribution';
		description = '';
		showModal = false;
		onCashFlowsChanged();
	}

	async function deleteCashFlow(id: number | undefined) {
		if (id == null) return;
		await db.cash_flows.delete(id);
		onCashFlowsChanged();
	}

	function formatDate(d: Date): string {
		return new Date(d).toLocaleDateString('it-IT');
	}

	function formatCurrency(v: number): string {
		return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Movimenti di Cassa</h3>
		<Button size="sm" onclick={() => (showModal = true)}>
			<CirclePlusSolid class="w-4 h-4 me-1" />
			Aggiungi Movimento
		</Button>
	</div>

	{#if cashFlows.length > 0}
		<Table striped>
			<TableHead>
				<TableHeadCell>Data</TableHeadCell>
				<TableHeadCell>Tipo</TableHeadCell>
				<TableHeadCell>Importo</TableHeadCell>
				<TableHeadCell>Descrizione</TableHeadCell>
				<TableHeadCell>Azioni</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each cashFlows as cf}
					<TableBodyRow>
						<TableBodyCell>{formatDate(cf.date)}</TableBodyCell>
						<TableBodyCell>
							<Badge color={typeColors[cf.type] ?? 'blue'}>{typeLabels[cf.type] ?? cf.type}</Badge>
						</TableBodyCell>
						<TableBodyCell class="font-semibold {cf.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
							{cf.amount >= 0 ? '+' : ''}{formatCurrency(cf.amount)}
						</TableBodyCell>
						<TableBodyCell>{cf.description || '-'}</TableBodyCell>
						<TableBodyCell>
							<Button size="xs" color="red" outline onclick={() => deleteCashFlow(cf.id)}>
								<TrashBinSolid class="w-3 h-3" />
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Nessun movimento registrato. Aggiungi contributi, prelievi o dividendi.
		</p>
	{/if}
</div>

<Modal title="Aggiungi Movimento" bind:open={showModal} size="sm">
	<div class="space-y-4">
		<div>
			<Label for="cf-date">Data</Label>
			<Input id="cf-date" type="date" bind:value={dateValue} />
		</div>
		<div>
			<Label for="cf-type">Tipo</Label>
			<Select id="cf-type" items={typeOptions} bind:value={flowType} />
		</div>
		<div>
			<Label for="cf-amount">Importo</Label>
			<Input id="cf-amount" type="number" bind:value={amount} placeholder="es. 5000" step="100" />
		</div>
		<div>
			<Label for="cf-desc">Descrizione (opzionale)</Label>
			<Input id="cf-desc" type="text" bind:value={description} placeholder="es. PAC mensile" />
		</div>
	</div>
	{#snippet footer()}
		<div class="flex gap-2 justify-end">
			<Button color="alternative" onclick={() => (showModal = false)}>Annulla</Button>
			<Button onclick={addCashFlow} disabled={!dateValue || amount === 0}>Salva</Button>
		</div>
	{/snippet}
</Modal>
