<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import type { PortfolioAllocation, MonthlyContributions } from '$lib/db/index';

	let {
		portfolio = $bindable<PortfolioAllocation>({
			stocks: 0, bonds: 0, cash: 0, realEstate: 0,
			gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
		}),
		monthlyContributions = $bindable<MonthlyContributions>({
			stocks: 0, bonds: 0, cash: 0, realEstate: 0,
			gold: 0, crypto: 0, pensionFund: 0, tfr: 0, other: 0
		})
	}: {
		portfolio?: PortfolioAllocation;
		monthlyContributions?: MonthlyContributions;
	} = $props();

	const assetLabels: Record<keyof PortfolioAllocation, string> = {
		stocks: 'Azioni / ETF azionari',
		bonds: 'Obbligazioni / ETF obbligazionari',
		cash: 'Liquidita (conti, depositi)',
		realEstate: 'Immobili (valore netto)',
		gold: 'Oro / metalli preziosi',
		crypto: 'Criptovalute',
		pensionFund: 'Fondo pensione',
		tfr: 'TFR accantonato',
		other: 'Altro'
	};

	const assetKeys = Object.keys(assetLabels) as (keyof PortfolioAllocation)[];
</script>

<div class="space-y-8">
	<div>
		<Heading tag="h4" class="mb-4 text-lg">Patrimonio attuale</Heading>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each assetKeys as key}
				<div>
					<CurrencyInput
						bind:value={portfolio[key]}
						label={assetLabels[key]}
						id="portfolio-{key}"
						step={1000}
					/>
				</div>
			{/each}
		</div>
	</div>

	<hr class="border-gray-200 dark:border-gray-700" />

	<div>
		<Heading tag="h4" class="mb-4 text-lg">Contributi mensili</Heading>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Quanto investi ogni mese in ciascuna categoria di asset.
		</p>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each assetKeys as key}
				<div>
					<CurrencyInput
						bind:value={monthlyContributions[key]}
						label={assetLabels[key]}
						id="contrib-{key}"
						step={50}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>
