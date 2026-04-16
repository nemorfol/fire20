<script lang="ts">
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import YearSlider from '$lib/components/shared/YearSlider.svelte';
	import { Label, Input, Tabs, TabItem } from 'flowbite-svelte';
	import type { PensionInfo } from '$lib/db/index';
	import PensionCalculator from './PensionCalculator.svelte';
	import INPSImport from './INPSImport.svelte';
	import INPSSimulator from './INPSSimulator.svelte';

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

	function handleINPSImport(data: { contributionYears: number; estimatedMonthly: number }) {
		pension.contributionYears = data.contributionYears;
		pension.estimatedMonthly = data.estimatedMonthly;
	}

	function handleSimulatorApply(data: { contributionYears: number; estimatedMonthly: number; pensionAge: number }) {
		pension.contributionYears = data.contributionYears;
		pension.estimatedMonthly = data.estimatedMonthly;
		pension.pensionAge = data.pensionAge;
	}
</script>

<div class="space-y-4">
	<!-- Dati base pensione (sempre visibili, compatti) -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div>
			<Label for="contributionYears" class="mb-1.5">Anni di contribuzione</Label>
			<Input
				id="contributionYears"
				type="number"
				bind:value={pension.contributionYears}
				min={0}
				max={50}
			/>
		</div>
		<div>
			<CurrencyInput
				bind:value={pension.estimatedMonthly}
				label="Pensione mensile (lorda)"
				id="estimatedMonthly"
				step={50}
			/>
		</div>
		<div>
			<YearSlider
				bind:value={pension.pensionAge}
				min={57}
				max={71}
				label="Eta' pensione INPS"
			/>
		</div>
	</div>
	<p class="text-xs text-gray-500 dark:text-gray-400">
		Pensione annua lorda: <strong>{annualPension.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong> (13 mensilita'). Usa gli strumenti sotto per una stima precisa.
	</p>

	<!-- Sotto-tab per gli strumenti avanzati -->
	<Tabs tabStyle="underline" contentClass="mt-3">
		<TabItem open title="Calcolatore INPS">
			<PensionCalculator {birthYear} {retirementAge} {annualExpenses} />
		</TabItem>

		<TabItem title="Simulatore Avanzato">
			<INPSSimulator {birthYear} {retirementAge} {annualExpenses} onApply={handleSimulatorApply} />
		</TabItem>

		<TabItem title="Import Estratto Conto">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
				Carica il file XML esportato dal sito INPS, oppure incolla il testo dell'estratto conto (CSV/TXT).
			</p>
			<INPSImport onApply={handleINPSImport} />
		</TabItem>
	</Tabs>
</div>
