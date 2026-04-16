<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import BrokerImport from '$lib/components/profilo/BrokerImport.svelte';
	import type { PortfolioAllocation, MonthlyContributions } from '$lib/db/index';
	import type { PortfolioImport } from '$lib/utils/broker-import';
	import { LIQUID_ASSET_KEYS, ILLIQUID_ASSET_KEYS } from '$lib/engine/fire-calculator';

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

	// Cast di convenienza dalle costanti readonly
	const liquidKeys = LIQUID_ASSET_KEYS as readonly (keyof PortfolioAllocation)[];
	const illiquidKeys = ILLIQUID_ASSET_KEYS as readonly (keyof PortfolioAllocation)[];

	let liquidTotal = $derived(liquidKeys.reduce((s, k) => s + (portfolio[k] || 0), 0));
	let illiquidTotal = $derived(illiquidKeys.reduce((s, k) => s + (portfolio[k] || 0), 0));

	function formatEur(v: number): string {
		return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	}

	function handleBrokerImport(result: PortfolioImport) {
		portfolio.stocks += result.stocks;
		portfolio.bonds += result.bonds;
		portfolio.cash += result.cash;
		portfolio.gold += result.gold;
		portfolio.other += result.other;
	}
</script>

<div class="space-y-8">
	<div>
		<Heading tag="h4" class="mb-2 text-lg">Patrimonio attuale</Heading>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Gli asset <strong>liquidi</strong> sono usati per il calcolo del FIRE Number (prelievo
			al 4%). Gli asset <strong>illiquidi</strong> (immobili, TFR) producono reddito o hanno
			vincoli di prelievo: non fanno parte del capitale da cui si attinge per le spese correnti.
		</p>

		<div class="mb-6">
			<div class="flex items-baseline justify-between mb-3">
				<Heading tag="h5" class="text-base font-semibold text-emerald-600 dark:text-emerald-400">
					Liquidi — usati per il FIRE Number
				</Heading>
				<span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
					{formatEur(liquidTotal)}
				</span>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each liquidKeys as key}
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

		<div>
			<div class="flex items-baseline justify-between mb-3">
				<Heading tag="h5" class="text-base font-semibold text-amber-600 dark:text-amber-400">
					Illiquidi — esclusi dal FIRE Number
				</Heading>
				<span class="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
					{formatEur(illiquidTotal)}
				</span>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
				Gli immobili producono eventualmente un affitto netto (inseriscilo in
				<em>Reddito → Altri redditi annui</em> come rendita passiva perpetua).
				Il TFR e' liquidabile solo in casi specifici.
			</p>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each illiquidKeys as key}
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
	</div>

	<hr class="border-gray-200 dark:border-gray-700" />

	<div>
		<Heading tag="h4" class="mb-4 text-lg">Contributi mensili</Heading>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Quanto investi ogni mese in ciascuna categoria di asset.
		</p>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each [...liquidKeys, ...illiquidKeys] as key}
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

	<hr class="border-gray-200 dark:border-gray-700" />

	<div>
		<BrokerImport onApply={handleBrokerImport} />
	</div>
</div>
