<script lang="ts">
	import { Label, Input } from 'flowbite-svelte';
	import YearSlider from '$lib/components/shared/YearSlider.svelte';

	let {
		birthYear = $bindable(1990),
		retirementAge = $bindable(67),
		lifeExpectancy = $bindable(85)
	}: {
		birthYear?: number;
		retirementAge?: number;
		lifeExpectancy?: number;
	} = $props();

	let currentAge = $derived(new Date().getFullYear() - birthYear);
	let yearsToFire = $derived(Math.max(0, retirementAge - currentAge));
</script>

<div class="space-y-6">
	<div>
		<Label class="mb-2 text-base font-semibold">Anno di nascita</Label>
		<div class="flex items-center gap-4">
			<Input
				type="number"
				bind:value={birthYear}
				min={1940}
				max={2010}
				class="w-32"
			/>
			<span class="text-sm text-gray-500 dark:text-gray-400">
				Eta attuale: <strong class="text-primary-600 dark:text-primary-400">{currentAge} anni</strong>
			</span>
		</div>
	</div>

	<div>
		<YearSlider
			bind:value={retirementAge}
			min={40}
			max={75}
			label="Eta FIRE target (quando smetterai di lavorare)"
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Mancano <strong class="text-primary-600 dark:text-primary-400">{yearsToFire} anni</strong> al FIRE.
			Diverso dall'eta di pensione INPS (vedi tab Pensione), che puo essere successiva.
		</p>
	</div>

	<div>
		<YearSlider
			bind:value={lifeExpectancy}
			min={70}
			max={100}
			label="Aspettativa di vita"
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			Anni in FIRE: <strong class="text-primary-600 dark:text-primary-400">{Math.max(0, lifeExpectancy - retirementAge)} anni</strong>
		</p>
	</div>
</div>
