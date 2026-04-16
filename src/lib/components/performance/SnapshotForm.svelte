<script lang="ts">
	import { Button, Input, Label, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Modal } from 'flowbite-svelte';
	import { CirclePlusSolid, TrashBinSolid } from 'flowbite-svelte-icons';
	import { db, type PortfolioSnapshotRecord } from '$lib/db/index';
	import { liveQuery } from 'dexie';

	let {
		profileId = 1,
		onsnapshotsChanged = () => {}
	}: {
		profileId?: number;
		onsnapshotsChanged?: () => void;
	} = $props();

	let showModal = $state(false);
	let dateValue = $state('');
	let totalValue = $state(0);
	let notes = $state('');

	// Query reattiva degli snapshot
	let snapshots = $state<PortfolioSnapshotRecord[]>([]);

	$effect(() => {
		const sub = liveQuery(() =>
			db.portfolio_snapshots.where('profileId').equals(profileId).sortBy('date')
		).subscribe((result) => {
			snapshots = result;
		});
		return () => sub.unsubscribe();
	});

	async function addSnapshot() {
		if (!dateValue || totalValue <= 0) return;

		await db.portfolio_snapshots.add({
			profileId,
			date: new Date(dateValue),
			totalValue,
			allocation: {},
			notes: notes || undefined
		});

		dateValue = '';
		totalValue = 0;
		notes = '';
		showModal = false;
		onsnapshotsChanged();
	}

	async function deleteSnapshot(id: number | undefined) {
		if (id == null) return;
		await db.portfolio_snapshots.delete(id);
		onsnapshotsChanged();
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
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Snapshot del Portafoglio</h3>
		<Button size="sm" onclick={() => (showModal = true)}>
			<CirclePlusSolid class="w-4 h-4 me-1" />
			Aggiungi Snapshot
		</Button>
	</div>

	{#if snapshots.length > 0}
		<Table striped>
			<TableHead>
				<TableHeadCell>Data</TableHeadCell>
				<TableHeadCell>Valore Totale</TableHeadCell>
				<TableHeadCell>Note</TableHeadCell>
				<TableHeadCell>Azioni</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each snapshots as snap}
					<TableBodyRow>
						<TableBodyCell>{formatDate(snap.date)}</TableBodyCell>
						<TableBodyCell class="font-semibold">{formatCurrency(snap.totalValue)}</TableBodyCell>
						<TableBodyCell>{snap.notes || '-'}</TableBodyCell>
						<TableBodyCell>
							<Button size="xs" color="red" outline onclick={() => deleteSnapshot(snap.id)}>
								<TrashBinSolid class="w-3 h-3" />
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Nessuno snapshot registrato. Aggiungi il primo per iniziare a tracciare le performance.
		</p>
	{/if}
</div>

<Modal title="Aggiungi Snapshot" bind:open={showModal} size="sm">
	<div class="space-y-4">
		<div>
			<Label for="snap-date">Data</Label>
			<Input id="snap-date" type="date" bind:value={dateValue} />
		</div>
		<div>
			<Label for="snap-value">Valore Totale del Portafoglio</Label>
			<Input id="snap-value" type="number" bind:value={totalValue} placeholder="es. 100000" step="100" />
		</div>
		<div>
			<Label for="snap-notes">Note (opzionale)</Label>
			<Input id="snap-notes" type="text" bind:value={notes} placeholder="es. Dopo ribilanciamento" />
		</div>
	</div>
	{#snippet footer()}
		<div class="flex gap-2 justify-end">
			<Button color="alternative" onclick={() => (showModal = false)}>Annulla</Button>
			<Button onclick={addSnapshot} disabled={!dateValue || totalValue <= 0}>Salva</Button>
		</div>
	{/snippet}
</Modal>
