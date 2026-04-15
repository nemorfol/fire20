<script lang="ts">
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';

	let {
		annualIncome = $bindable(0),
		incomeGrowthRate = $bindable(0),
		otherIncome = $bindable(0)
	}: {
		annualIncome?: number;
		incomeGrowthRate?: number;
		otherIncome?: number;
	} = $props();

	let monthlyIncome = $derived(annualIncome / 12);
</script>

<div class="space-y-6">
	<div>
		<CurrencyInput
			bind:value={annualIncome}
			label="Reddito annuo netto"
			id="annualIncome"
			step={500}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Circa <strong>{monthlyIncome.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong> al mese
		</p>
	</div>

	<div>
		<PercentInput
			bind:value={incomeGrowthRate}
			label="Crescita annua prevista del reddito"
			id="incomeGrowthRate"
			min={0}
			max={20}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Incremento annuo dello stipendio (inflazione + carriera)
		</p>
	</div>

	<div>
		<CurrencyInput
			bind:value={otherIncome}
			label="Altri redditi annui"
			id="otherIncome"
			step={100}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Affitti, dividendi, lavoro autonomo, ecc.
		</p>
	</div>
</div>
