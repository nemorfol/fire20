<script lang="ts">
	import { Card, Label, Input, Button, Select } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import type { RiskEvent } from '$lib/engine/risk-scenarios';

	let {
		onSubmit
	}: {
		onSubmit: (event: RiskEvent) => void;
	} = $props();

	let name = $state('');
	let description = $state('');
	let type = $state<RiskEvent['type']>('market');
	let portfolioShock = $state(0);
	let expenseIncrease = $state(0);
	let incomeReduction = $state(0);
	let duration = $state(1);
	let yearOfOccurrence = $state(0);
	let returnReduction = $state(0);

	const typeOptions = [
		{ value: 'health', name: 'Salute' },
		{ value: 'market', name: 'Mercato' },
		{ value: 'inflation', name: 'Inflazione' },
		{ value: 'geopolitical', name: 'Geopolitica' },
		{ value: 'personal', name: 'Personale' },
		{ value: 'longevity', name: 'Longevita\'' }
	];

	function handleSubmit() {
		if (!name.trim()) return;

		const event: RiskEvent = {
			id: `custom-${Date.now()}`,
			name: name.trim(),
			description: description.trim() || `Scenario personalizzato: ${name.trim()}`,
			type,
			impact: {
				portfolioShock: portfolioShock / 100,
				expenseIncrease: expenseIncrease / 100,
				incomeReduction: incomeReduction / 100,
				duration,
				yearOfOccurrence,
				returnReduction: returnReduction / 100
			}
		};

		onSubmit(event);

		// Reset form
		name = '';
		description = '';
		type = 'market';
		portfolioShock = 0;
		expenseIncrease = 0;
		incomeReduction = 0;
		duration = 1;
		yearOfOccurrence = 0;
		returnReduction = 0;
	}
</script>

<Card class="max-w-none">
	<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Crea Scenario Personalizzato
	</h5>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
		<div>
			<Label for="custom-name" class="mb-1">Nome scenario</Label>
			<Input id="custom-name" bind:value={name} placeholder="Es. Recessione prolungata" />
		</div>
		<div>
			<Label for="custom-type" class="mb-1">Tipo</Label>
			<Select id="custom-type" items={typeOptions} bind:value={type} />
		</div>
	</div>

	<div class="mb-4">
		<Label for="custom-desc" class="mb-1">Descrizione (opzionale)</Label>
		<Input id="custom-desc" bind:value={description} placeholder="Descrizione dello scenario..." />
	</div>

	<h6 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Parametri di Impatto</h6>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
		<div>
			<Label for="custom-shock" class="mb-1">Shock portafoglio (%)</Label>
			<Input id="custom-shock" type="number" bind:value={portfolioShock} step="5" min="-100" max="0" />
			<p class="text-xs text-gray-400 mt-0.5">Es. -40 per un crollo del 40%</p>
		</div>
		<div>
			<Label for="custom-expense" class="mb-1">Aumento spese (%)</Label>
			<Input id="custom-expense" type="number" bind:value={expenseIncrease} step="5" min="0" max="200" />
			<p class="text-xs text-gray-400 mt-0.5">Es. 30 per +30% spese</p>
		</div>
		<div>
			<Label for="custom-income" class="mb-1">Riduzione reddito (%)</Label>
			<Input id="custom-income" type="number" bind:value={incomeReduction} step="10" min="0" max="100" />
			<p class="text-xs text-gray-400 mt-0.5">Es. 100 per perdita totale</p>
		</div>
		<div>
			<Label for="custom-duration" class="mb-1">Durata (anni)</Label>
			<Input id="custom-duration" type="number" bind:value={duration} step="1" min="1" max="30" />
		</div>
		<div>
			<Label for="custom-year" class="mb-1">Anno di occorrenza</Label>
			<Input id="custom-year" type="number" bind:value={yearOfOccurrence} step="1" min="-10" max="30" />
			<p class="text-xs text-gray-400 mt-0.5">0 = al FIRE, negativo = pre-FIRE</p>
		</div>
		<div>
			<Label for="custom-return" class="mb-1">Riduzione rendimenti (%)</Label>
			<Input id="custom-return" type="number" bind:value={returnReduction} step="1" min="0" max="30" />
			<p class="text-xs text-gray-400 mt-0.5">Es. 15 per -15 punti percentuali</p>
		</div>
	</div>

	<Button onclick={handleSubmit} disabled={!name.trim()} class="gap-1">
		<PlusOutline class="w-4 h-4" />
		Applica Stress Test
	</Button>
</Card>
