<script lang="ts">
	import { Button, Input, Label, Card } from 'flowbite-svelte';
	import { PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import type { Debt } from '$lib/db/index';

	let {
		debts = $bindable<Debt[]>([])
	}: {
		debts?: Debt[];
	} = $props();

	function addDebt() {
		debts = [
			...debts,
			{
				name: 'Nuovo debito',
				balance: 0,
				interestRate: 0,
				monthlyPayment: 0,
				remainingMonths: 0
			}
		];
	}

	function removeDebt(index: number) {
		debts = debts.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-4">
	{#if debts.length === 0}
		<div class="py-8 text-center">
			<p class="mb-4 text-gray-500 dark:text-gray-400">
				Nessun debito inserito. Se hai mutui, prestiti o finanziamenti, aggiungili qui.
			</p>
		</div>
	{/if}

	{#each debts as debt, index}
		<Card class="max-w-none">
			<div class="mb-4 flex items-center justify-between">
				<div class="mr-4 flex-1">
					<Label for="debt-name-{index}" class="mb-1">Nome del debito</Label>
					<Input
						id="debt-name-{index}"
						type="text"
						bind:value={debt.name}
						placeholder="Es. Mutuo casa, Prestito auto..."
					/>
				</div>
				<Button color="red" outline size="sm" onclick={() => removeDebt(index)} class="mt-5">
					<TrashBinOutline class="h-4 w-4" />
				</Button>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<CurrencyInput
					bind:value={debt.balance}
					label="Saldo residuo"
					id="debt-balance-{index}"
					step={1000}
				/>
				<PercentInput
					bind:value={debt.interestRate}
					label="Tasso di interesse annuo"
					id="debt-rate-{index}"
					min={0}
					max={30}
				/>
				<CurrencyInput
					bind:value={debt.monthlyPayment}
					label="Rata mensile"
					id="debt-payment-{index}"
					step={50}
				/>
				<div>
					<Label for="debt-months-{index}" class="mb-2">Mesi rimanenti</Label>
					<Input
						id="debt-months-{index}"
						type="number"
						bind:value={debt.remainingMonths}
						min={0}
						max={600}
						placeholder="0"
					/>
				</div>
			</div>
		</Card>
	{/each}

	<div class="flex justify-center">
		<Button color="alternative" onclick={addDebt}>
			<PlusOutline class="me-2 h-4 w-4" />
			Aggiungi debito
		</Button>
	</div>
</div>
