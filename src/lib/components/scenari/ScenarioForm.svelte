<script lang="ts">
	import { Modal, Button, Label, Input, Textarea, Select } from 'flowbite-svelte';
	import type { Profile, Scenario } from '$lib/db/index';

	let {
		open = $bindable(false),
		profiles = [] as Profile[],
		scenario = null as Scenario | null,
		onSave
	}: {
		open?: boolean;
		profiles?: Profile[];
		scenario?: Scenario | null;
		onSave: (data: {
			name: string;
			description: string;
			type: Scenario['type'];
			profileId: number;
			overrides: Partial<Profile>;
		}) => void;
	} = $props();

	let name = $state('');
	let description = $state('');
	let type = $state<Scenario['type']>('custom');
	let profileId = $state<number>(0);

	// Override fields
	let withdrawalRate = $state<number | undefined>(undefined);
	let stockAllocation = $state<number | undefined>(undefined);
	let inflationRate = $state<number | undefined>(undefined);
	let expectedReturn = $state<number | undefined>(undefined);
	let annualExpenses = $state<number | undefined>(undefined);
	let fireExpenses = $state<number | undefined>(undefined);
	let retirementAge = $state<number | undefined>(undefined);

	const typeOptions = [
		{ value: 'optimistic', name: 'Ottimistico' },
		{ value: 'pessimistic', name: 'Pessimistico' },
		{ value: 'custom', name: 'Personalizzato' },
		{ value: 'historical', name: 'Storico' }
	];

	let profileOptions = $derived(
		profiles.map((p) => ({ value: p.id, name: p.name }))
	);

	let selectedProfile = $derived(profiles.find((p) => p.id === profileId));

	// When scenario changes (editing), populate fields
	$effect(() => {
		if (open) {
			if (scenario) {
				name = scenario.name;
				description = scenario.description;
				type = scenario.type;
				profileId = scenario.profileId;
				withdrawalRate = scenario.overrides?.simulation?.withdrawalRate ?? undefined;
				stockAllocation = scenario.overrides?.simulation?.stockAllocation ?? undefined;
				inflationRate = scenario.overrides?.simulation?.inflationRate ?? undefined;
				expectedReturn = scenario.overrides?.simulation?.expectedReturn ?? undefined;
				annualExpenses = scenario.overrides?.annualExpenses ?? undefined;
				fireExpenses = scenario.overrides?.fireExpenses ?? undefined;
				retirementAge = scenario.overrides?.retirementAge ?? undefined;
			} else {
				name = '';
				description = '';
				type = 'custom';
				profileId = profiles.length > 0 ? profiles[0].id : 0;
				withdrawalRate = undefined;
				stockAllocation = undefined;
				inflationRate = undefined;
				expectedReturn = undefined;
				annualExpenses = undefined;
				fireExpenses = undefined;
				retirementAge = undefined;
			}
		}
	});

	function handleSave() {
		if (!name.trim() || !profileId) return;
		const overrides: Partial<Profile> = {};
		if (annualExpenses !== undefined) overrides.annualExpenses = annualExpenses;
		if (fireExpenses !== undefined) overrides.fireExpenses = fireExpenses;
		if (retirementAge !== undefined) overrides.retirementAge = retirementAge;

		const simOverrides: Record<string, number> = {};
		if (withdrawalRate !== undefined) simOverrides.withdrawalRate = withdrawalRate;
		if (stockAllocation !== undefined) simOverrides.stockAllocation = stockAllocation;
		if (inflationRate !== undefined) simOverrides.inflationRate = inflationRate;
		if (expectedReturn !== undefined) simOverrides.expectedReturn = expectedReturn;

		if (Object.keys(simOverrides).length > 0) {
			(overrides as any).simulation = simOverrides;
		}

		onSave({ name: name.trim(), description: description.trim(), type, profileId, overrides });
		open = false;
	}

	let isEditing = $derived(!!scenario);
	let title = $derived(isEditing ? 'Modifica Scenario' : 'Nuovo Scenario');
</script>

<Modal bind:open size="lg" {title}>
	<div class="space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="sc-name" class="mb-1">Nome</Label>
				<Input id="sc-name" bind:value={name} placeholder="Nome scenario" required />
			</div>
			<div>
				<Label for="sc-type" class="mb-1">Tipo</Label>
				<Select id="sc-type" items={typeOptions} bind:value={type} />
			</div>
		</div>

		<div>
			<Label for="sc-desc" class="mb-1">Descrizione</Label>
			<Textarea id="sc-desc" bind:value={description} rows={2} placeholder="Descrizione opzionale" />
		</div>

		<div>
			<Label for="sc-profile" class="mb-1">Profilo di riferimento</Label>
			<Select id="sc-profile" items={profileOptions} bind:value={profileId} />
		</div>

		{#if selectedProfile}
			<div class="border-t border-gray-200 dark:border-gray-700 pt-4">
				<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
					Parametri personalizzati (lascia vuoto per usare i valori del profilo)
				</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<Label for="sc-wr" class="mb-1 text-xs">
							Tasso di prelievo (%) <span class="text-gray-400">Profilo: {selectedProfile.simulation.withdrawalRate}%</span>
						</Label>
						<Input id="sc-wr" type="number" step="0.1" bind:value={withdrawalRate} placeholder={String(selectedProfile.simulation.withdrawalRate)} />
					</div>
					<div>
						<Label for="sc-stock" class="mb-1 text-xs">
							Allocazione azioni (%) <span class="text-gray-400">Profilo: {selectedProfile.simulation.stockAllocation}%</span>
						</Label>
						<Input id="sc-stock" type="number" step="1" bind:value={stockAllocation} placeholder={String(selectedProfile.simulation.stockAllocation)} />
					</div>
					<div>
						<Label for="sc-infl" class="mb-1 text-xs">
							Inflazione (%) <span class="text-gray-400">Profilo: {selectedProfile.simulation.inflationRate}%</span>
						</Label>
						<Input id="sc-infl" type="number" step="0.1" bind:value={inflationRate} placeholder={String(selectedProfile.simulation.inflationRate)} />
					</div>
					<div>
						<Label for="sc-ret" class="mb-1 text-xs">
							Rendimento atteso (%) <span class="text-gray-400">Profilo: {selectedProfile.simulation.expectedReturn}%</span>
						</Label>
						<Input id="sc-ret" type="number" step="0.1" bind:value={expectedReturn} placeholder={String(selectedProfile.simulation.expectedReturn)} />
					</div>
					<div>
						<Label for="sc-exp" class="mb-1 text-xs">
							Spese annuali <span class="text-gray-400">Profilo: {selectedProfile.annualExpenses}</span>
						</Label>
						<Input id="sc-exp" type="number" step="100" bind:value={annualExpenses} placeholder={String(selectedProfile.annualExpenses)} />
					</div>
					<div>
						<Label for="sc-fexp" class="mb-1 text-xs">
							Spese FIRE <span class="text-gray-400">Profilo: {selectedProfile.fireExpenses}</span>
						</Label>
						<Input id="sc-fexp" type="number" step="100" bind:value={fireExpenses} placeholder={String(selectedProfile.fireExpenses)} />
					</div>
					<div>
						<Label for="sc-rage" class="mb-1 text-xs">
							Eta FIRE target <span class="text-gray-400">Profilo: {selectedProfile.retirementAge}</span>
						</Label>
						<Input id="sc-rage" type="number" step="1" bind:value={retirementAge} placeholder={String(selectedProfile.retirementAge)} />
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex justify-end gap-3">
			<Button color="alternative" onclick={() => (open = false)}>Annulla</Button>
			<Button color="primary" onclick={handleSave} disabled={!name.trim() || !profileId}>
				{isEditing ? 'Aggiorna' : 'Crea Scenario'}
			</Button>
		</div>
	{/snippet}
</Modal>
