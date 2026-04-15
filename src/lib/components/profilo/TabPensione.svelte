<script lang="ts">
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import YearSlider from '$lib/components/shared/YearSlider.svelte';
	import { Label, Input } from 'flowbite-svelte';
	import type { PensionInfo } from '$lib/db/index';
	import PensionCalculator from './PensionCalculator.svelte';
	import INPSImport from './INPSImport.svelte';

	let {
		pension = $bindable<PensionInfo>({
			contributionYears: 0,
			estimatedMonthly: 0,
			pensionAge: 67
		}),
		birthYear = 1990,
		retirementAge = 50,
		annualExpenses = 20000
	}: {
		pension?: PensionInfo;
		birthYear?: number;
		retirementAge?: number;
		annualExpenses?: number;
	} = $props();

	let annualPension = $derived(pension.estimatedMonthly * 13);
</script>

<div class="space-y-6">
	<div>
		<Label for="contributionYears" class="mb-2 text-base font-semibold">Anni di contribuzione maturati</Label>
		<Input
			id="contributionYears"
			type="number"
			bind:value={pension.contributionYears}
			min={0}
			max={50}
			class="w-32"
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Anni di contributi INPS gia versati
		</p>
	</div>

	<div>
		<CurrencyInput
			bind:value={pension.estimatedMonthly}
			label="Pensione mensile stimata (lorda)"
			id="estimatedMonthly"
			step={50}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Pensione annua lorda: <strong>{annualPension.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong> (13 mensilita).
			Puoi usare il simulatore INPS per una stima precisa.
		</p>
	</div>

	<div>
		<YearSlider
			bind:value={pension.pensionAge}
			min={57}
			max={71}
			label="Eta di accesso alla pensione INPS"
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Pensione di vecchiaia: 67 anni. Anticipata: da 57 anni con requisiti contributivi.
		</p>
	</div>

	<hr class="border-gray-200 dark:border-gray-700 my-6" />

	<PensionCalculator {birthYear} {retirementAge} {annualExpenses} />

	<hr class="border-gray-200 dark:border-gray-700 my-6" />

	<INPSImport onApply={(data) => {
		pension.contributionYears = data.contributionYears;
		pension.estimatedMonthly = data.estimatedMonthly;
	}} />
</div>
