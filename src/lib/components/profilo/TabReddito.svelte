<script lang="ts">
	import { Label, Range, Radio } from 'flowbite-svelte';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';

	let {
		annualIncome = $bindable(0),
		incomeGrowthRate = $bindable(0),
		otherIncome = $bindable(0),
		otherIncomeEndAge = $bindable(85),
		lifeExpectancy = 85,
		currentAge = 40
	}: {
		annualIncome?: number;
		incomeGrowthRate?: number;
		otherIncome?: number;
		otherIncomeEndAge?: number;
		lifeExpectancy?: number;
		currentAge?: number;
	} = $props();

	let monthlyIncome = $derived(annualIncome / 12);

	// Preset semplici per l'utente, internamente si mappano su un'eta' finale
	let durationPreset = $derived<'active' | 'perpetual' | 'custom'>(
		otherIncomeEndAge >= lifeExpectancy
			? 'perpetual'
			: otherIncomeEndAge <= currentAge + 1
				? 'active'
				: 'custom'
	);

	function setPreset(preset: 'active' | 'perpetual' | 'custom') {
		if (preset === 'perpetual') otherIncomeEndAge = lifeExpectancy;
		else if (preset === 'active') otherIncomeEndAge = currentAge;
		// 'custom' lascia il valore attuale, controllato via slider
	}
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

	<div class="space-y-3">
		<CurrencyInput
			bind:value={otherIncome}
			label="Altri redditi annui"
			id="otherIncome"
			step={100}
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Affitti, dividendi, lavoro autonomo, royalties, rendite.
		</p>

		{#if otherIncome > 0}
			<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
				<Label class="text-sm font-semibold">Continuano anche dopo il FIRE?</Label>
				<div class="flex flex-col gap-2 text-sm">
					<Radio
						name="otherIncomeDuration"
						checked={durationPreset === 'active'}
						onchange={() => setPreset('active')}
					>
						<span class="ml-1">
							<strong>Solo reddito attivo</strong> — cessa quando smetti di lavorare
							<span class="block text-xs text-gray-500 dark:text-gray-400">
								Es. lavoro autonomo, consulenze, stipendi extra
							</span>
						</span>
					</Radio>
					<Radio
						name="otherIncomeDuration"
						checked={durationPreset === 'perpetual'}
						onchange={() => setPreset('perpetual')}
					>
						<span class="ml-1">
							<strong>Rendita passiva perpetua</strong> — continua per tutta la vita
							<span class="block text-xs text-gray-500 dark:text-gray-400">
								Es. affitti, dividendi ETF a distribuzione, rendite vitalizie
							</span>
						</span>
					</Radio>
					<Radio
						name="otherIncomeDuration"
						checked={durationPreset === 'custom'}
						onchange={() => (otherIncomeEndAge = Math.min(lifeExpectancy - 1, Math.max(currentAge + 1, otherIncomeEndAge)))}
					>
						<span class="ml-1">
							<strong>Fino a un'eta' specifica</strong>
							<span class="block text-xs text-gray-500 dark:text-gray-400">
								Es. affitto da contratto temporaneo, rendita a termine
							</span>
						</span>
					</Radio>
				</div>

				{#if durationPreset === 'custom'}
					<div class="pt-2">
						<div class="flex justify-between text-sm mb-2">
							<Label>Eta' finale di percezione</Label>
							<span class="font-bold text-primary-600 dark:text-primary-400">
								{otherIncomeEndAge} anni
							</span>
						</div>
						<Range
							min={currentAge + 1}
							max={lifeExpectancy}
							step={1}
							bind:value={otherIncomeEndAge}
						/>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
