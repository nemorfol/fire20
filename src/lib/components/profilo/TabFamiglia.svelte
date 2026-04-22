<script lang="ts">
	import { Button, Input, Label, Card, Alert, Toggle, Badge } from 'flowbite-svelte';
	import {
		PlusOutline, TrashBinOutline, InfoCircleSolid,
		UserOutline, HomeOutline
	} from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import type { Child, Mortgage } from '$lib/db/index';
	import {
		childTotalRemainingCost,
		calculateMortgageMonthlyPayment
	} from '$lib/engine/family';
	import { formatCurrency } from '$lib/utils/format';

	let {
		children = $bindable<Child[]>([]),
		mortgage = $bindable<Mortgage | undefined>(undefined)
	}: {
		children?: Child[];
		mortgage?: Mortgage;
	} = $props();

	const currentYear = new Date().getFullYear();

	// === Figli ===
	function addChild() {
		children = [
			...children,
			{
				name: `Figlio ${children.length + 1}`,
				birthYear: currentYear - 1,
				monthlyExpense: 500,
				independenceAge: 25,
				universityStartAge: 19,
				universityYears: 5,
				universityAnnualCost: 8000
			}
		];
	}

	function removeChild(index: number) {
		children = children.filter((_, i) => i !== index);
	}

	function toggleUniversity(index: number) {
		const c = children[index];
		const hasUni = c.universityStartAge !== undefined && (c.universityYears ?? 0) > 0;
		if (hasUni) {
			// Disabilita
			const copy = [...children];
			copy[index] = {
				...c,
				universityStartAge: undefined,
				universityYears: 0,
				universityAnnualCost: 0
			};
			children = copy;
		} else {
			const copy = [...children];
			copy[index] = {
				...c,
				universityStartAge: 19,
				universityYears: 5,
				universityAnnualCost: 8000
			};
			children = copy;
		}
	}

	function childAge(c: Child): number {
		return currentYear - c.birthYear;
	}

	function childCost(c: Child): number {
		return childTotalRemainingCost(c, currentYear);
	}

	let totalChildrenCost = $derived(
		children.reduce((sum, c) => sum + childCost(c), 0)
	);

	// === Mutuo ===
	let hasMortgage = $state(false);

	$effect(() => {
		hasMortgage = !!(mortgage && mortgage.balance > 0);
	});

	function enableMortgage() {
		mortgage = {
			balance: 150000,
			interestRate: 0.035,
			monthlyPayment: 0,
			remainingMonths: 240
		};
		hasMortgage = true;
		// Suggerisci rata in base a balance+rate+months
		const suggested = calculateMortgageMonthlyPayment(150000, 0.035, 240);
		mortgage = { ...mortgage, monthlyPayment: Math.round(suggested) };
	}

	function disableMortgage() {
		mortgage = undefined;
		hasMortgage = false;
	}

	function suggestPayment() {
		if (!mortgage) return;
		const suggested = calculateMortgageMonthlyPayment(
			mortgage.balance,
			mortgage.interestRate,
			mortgage.remainingMonths
		);
		mortgage = { ...mortgage, monthlyPayment: Math.round(suggested) };
	}

	let mortgageEndYear = $derived(
		mortgage && mortgage.remainingMonths > 0
			? currentYear + Math.ceil(mortgage.remainingMonths / 12)
			: 0
	);
	let mortgageTotalRemainingPayments = $derived(
		mortgage && mortgage.monthlyPayment > 0 && mortgage.remainingMonths > 0
			? mortgage.monthlyPayment * mortgage.remainingMonths
			: 0
	);
</script>

<div class="space-y-8">
	<!-- === Sezione Figli === -->
	<section>
		<div class="flex items-center gap-2 mb-3">
			<UserOutline class="w-5 h-5 text-primary-600 dark:text-primary-400" />
			<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Figli a carico</h4>
			{#if children.length > 0}
				<Badge color="primary">{children.length}</Badge>
			{/if}
		</div>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Aggiungi i figli a carico per includere le spese ricorrenti (cibo, scuola, sport) e
			il costo universitario nel calcolo del FIRE Number. Le spese sono considerate in
			euro di oggi e inflazionate ogni anno.
		</p>

		{#if children.length === 0}
			<Alert color="blue" class="mb-4">
				{#snippet icon()}
					<InfoCircleSolid class="w-4 h-4" />
				{/snippet}
				Nessun figlio inserito. Se hai figli a carico, aggiungili qui per una stima realistica.
			</Alert>
		{/if}

		<div class="space-y-3">
			{#each children as child, index (index)}
				{@const age = childAge(child)}
				{@const hasUni = child.universityStartAge !== undefined && (child.universityYears ?? 0) > 0}
				<Card class="max-w-none">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<h5 class="text-base font-semibold text-gray-900 dark:text-white">
								{child.name || `Figlio ${index + 1}`}
							</h5>
							{#if age >= 0}
								<Badge color="gray">{age} anni</Badge>
							{/if}
						</div>
						<Button color="red" outline size="sm" onclick={() => removeChild(index)}>
							<TrashBinOutline class="w-4 h-4" />
						</Button>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<Label for="child-name-{index}" class="mb-1">Nome</Label>
							<Input
								id="child-name-{index}"
								type="text"
								bind:value={child.name}
								placeholder="Nome figlio"
							/>
						</div>
						<div>
							<Label for="child-birthyear-{index}" class="mb-1">Anno di nascita</Label>
							<Input
								id="child-birthyear-{index}"
								type="number"
								min={1980}
								max={currentYear + 1}
								bind:value={child.birthYear}
							/>
						</div>
						<CurrencyInput
							bind:value={child.monthlyExpense}
							label="Spesa mensile (euro di oggi)"
							id="child-expense-{index}"
							step={50}
						/>
						<div>
							<Label for="child-indep-{index}" class="mb-1">Eta di indipendenza</Label>
							<Input
								id="child-indep-{index}"
								type="number"
								min={16}
								max={35}
								bind:value={child.independenceAge}
							/>
						</div>
					</div>

					<div class="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
						<Toggle checked={hasUni} onchange={() => toggleUniversity(index)}>
							<span class="font-medium text-gray-900 dark:text-white">Universita</span>
						</Toggle>
					</div>

					{#if hasUni}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<Label for="child-unistart-{index}" class="mb-1">Eta inizio</Label>
								<Input
									id="child-unistart-{index}"
									type="number"
									min={17}
									max={25}
									bind:value={child.universityStartAge}
								/>
							</div>
							<div>
								<Label for="child-uniyears-{index}" class="mb-1">Durata (anni)</Label>
								<Input
									id="child-uniyears-{index}"
									type="number"
									min={3}
									max={8}
									bind:value={child.universityYears}
								/>
							</div>
							<CurrencyInput
								bind:value={child.universityAnnualCost}
								label="Costo annuo"
								id="child-unicost-{index}"
								step={500}
							/>
						</div>
					{/if}

					<p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
						Costo totale stimato fino all'indipendenza: <strong>{formatCurrency(childCost(child))}</strong> (euro di oggi)
					</p>
				</Card>
			{/each}
		</div>

		<div class="flex justify-center mt-4">
			<Button color="alternative" onclick={addChild}>
				<PlusOutline class="w-4 h-4 me-2" />
				Aggiungi figlio
			</Button>
		</div>

		{#if children.length > 0}
			<Alert color="gray" class="mt-4">
				<span class="font-medium">Costo totale figli:</span>
				{formatCurrency(totalChildrenCost)} (euro di oggi, fino all'indipendenza di ciascuno)
			</Alert>
		{/if}
	</section>

	<!-- === Sezione Mutuo === -->
	<section>
		<div class="flex items-center gap-2 mb-3">
			<HomeOutline class="w-5 h-5 text-primary-600 dark:text-primary-400" />
			<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Mutuo prima casa</h4>
			{#if hasMortgage}
				<Badge color="green">Attivo</Badge>
			{/if}
		</div>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Se hai un mutuo attivo, le rate residue vengono incluse nel calcolo del FIRE Number.
			Se il mutuo si estingue dopo il pensionamento FIRE, le rate post-FIRE aumentano il
			capitale necessario.
		</p>

		{#if !hasMortgage}
			<div class="text-center py-6">
				<p class="text-gray-500 dark:text-gray-400 mb-4">
					Nessun mutuo configurato.
				</p>
				<Button color="alternative" onclick={enableMortgage}>
					<PlusOutline class="w-4 h-4 me-2" />
					Aggiungi mutuo
				</Button>
			</div>
		{:else if mortgage}
			<Card class="max-w-none">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<CurrencyInput
						bind:value={mortgage.balance}
						label="Capitale residuo"
						id="mortgage-balance"
						step={1000}
					/>
					<PercentInput
						bind:value={mortgage.interestRate}
						label="Tasso annuo"
						id="mortgage-rate"
						min={0}
						max={15}
						step={0.1}
					/>
					<div>
						<Label for="mortgage-months" class="mb-1">Mesi residui</Label>
						<Input
							id="mortgage-months"
							type="number"
							min={1}
							max={480}
							bind:value={mortgage.remainingMonths}
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							{#if mortgageEndYear > 0}
								Ultima rata: {mortgageEndYear}
							{/if}
						</p>
					</div>
					<div>
						<CurrencyInput
							bind:value={mortgage.monthlyPayment}
							label="Rata mensile"
							id="mortgage-payment"
							step={10}
						/>
						<Button size="xs" color="alternative" class="mt-1" onclick={suggestPayment}>
							Calcola dalla formula
						</Button>
					</div>
				</div>

				<div class="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
					<div class="text-sm">
						<span class="text-gray-500 dark:text-gray-400">Esborso residuo totale: </span>
						<strong class="text-gray-900 dark:text-white">{formatCurrency(mortgageTotalRemainingPayments)}</strong>
					</div>
					<Button color="red" outline size="sm" onclick={disableMortgage}>
						<TrashBinOutline class="w-4 h-4 me-1" />
						Rimuovi mutuo
					</Button>
				</div>
			</Card>
		{/if}
	</section>
</div>
