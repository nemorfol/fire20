<script lang="ts">
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';

	let {
		annualExpenses = $bindable(0),
		fireExpenses = $bindable(0),
		expenseInflation = $bindable(0)
	}: {
		annualExpenses?: number;
		fireExpenses?: number;
		expenseInflation?: number;
	} = $props();

	let monthlyExpenses = $derived(annualExpenses / 12);
	let monthlyFireExpenses = $derived(fireExpenses / 12);
</script>

<div class="space-y-6">
	<div>
		<CurrencyInput
			bind:value={annualExpenses}
			label="Spese annuali attuali"
			id="annualExpenses"
			step={500}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Circa <strong>{monthlyExpenses.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong> al mese
		</p>
	</div>

	<div>
		<CurrencyInput
			bind:value={fireExpenses}
			label="Spese annuali previste in FIRE"
			id="fireExpenses"
			step={500}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Circa <strong>{monthlyFireExpenses.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong> al mese.
			Le spese in FIRE possono essere diverse: niente pendolarismo, ma piu tempo libero.
		</p>
	</div>

	<div>
		<PercentInput
			bind:value={expenseInflation}
			label="Inflazione prevista sulle spese"
			id="expenseInflation"
			min={0}
			max={15}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Media storica italiana: circa 2% annuo
		</p>
	</div>
</div>
