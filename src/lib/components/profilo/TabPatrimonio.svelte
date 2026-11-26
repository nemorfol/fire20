<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import BrokerImport from '$lib/components/profilo/BrokerImport.svelte';
	import GestptfImport from '$lib/components/profilo/GestptfImport.svelte';
	import type { PortfolioAllocation, MonthlyContributions } from '$lib/db/index';
	import type { PortfolioImport } from '$lib/utils/broker-import';
	import {
		LIQUID_ASSET_KEYS,
		ILLIQUID_ASSET_KEYS,
		DEFERRED_ASSET_KEYS
	} from '$lib/engine/fire-calculator';

	let {
		portfolio = $bindable<PortfolioAllocation>({
			stocks: 0,
			bonds: 0,
			bfp: 0,
			cd: 0,
			cash: 0,
			realEstate: 0,
			gold: 0,
			crypto: 0,
			pensionFund: 0,
			tfr: 0,
			other: 0
		}),
		monthlyContributions = $bindable<MonthlyContributions>({
			stocks: 0,
			bonds: 0,
			bfp: 0,
			cd: 0,
			cash: 0,
			realEstate: 0,
			gold: 0,
			crypto: 0,
			pensionFund: 0,
			tfr: 0,
			other: 0
		})
	}: {
		portfolio?: PortfolioAllocation;
		monthlyContributions?: MonthlyContributions;
	} = $props();

	const assetLabels: Record<keyof PortfolioAllocation, string> = {
		stocks: 'Azioni / ETF azionari',
		bonds: 'Obbligazioni / ETF obbligazionari',
		bfp: 'Buoni Fruttiferi Postali (BFP)',
		cd: 'Conti deposito',
		cash: 'Liquidita (conti correnti)',
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
	const deferredKeys = DEFERRED_ASSET_KEYS as readonly (keyof PortfolioAllocation)[];

	let liquidTotal = $derived(liquidKeys.reduce((s, k) => s + (portfolio[k] || 0), 0));
	let illiquidTotal = $derived(illiquidKeys.reduce((s, k) => s + (portfolio[k] || 0), 0));
	let deferredTotal = $derived(deferredKeys.reduce((s, k) => s + (portfolio[k] || 0), 0));

	function formatEur(v: number): string {
		return v.toLocaleString('it-IT', {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 0
		});
	}

	function handleBrokerImport(result: PortfolioImport) {
		portfolio.stocks += result.stocks;
		portfolio.bonds += result.bonds;
		portfolio.cash += result.cash;
		portfolio.gold += result.gold;
		portfolio.other += result.other;
	}

	function handleGestptfImport(
		assets: Record<keyof PortfolioAllocation, number>,
		mode: 'replace' | 'add'
	) {
		// Lo snapshot e' completo (tutte le 11 categorie): in "replace" rimpiazza,
		// in "add" somma. Copre sia gli asset liquidi sia quelli illiquidi.
		for (const k of [...liquidKeys, ...deferredKeys, ...illiquidKeys]) {
			const v = assets[k];
			if (v == null) continue;
			portfolio[k] = mode === 'add' ? (portfolio[k] || 0) + v : v;
		}
	}
</script>

<div class="space-y-8">
	<div>
		<Heading tag="h4" class="mb-2 text-lg">Patrimonio attuale</Heading>
		<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
			Gli asset <strong>liquidi</strong> sono usati per il calcolo del FIRE Number (prelievo al 4%).
			Il <strong>fondo pensione</strong> e' un asset differito: diventa reddito solo con la RITA o
			la prestazione. Gli asset <strong>illiquidi</strong> (immobili, TFR) producono reddito o hanno vincoli
			di prelievo: non fanno parte del capitale da cui si attinge per le spese correnti.
		</p>

		<div class="mb-6">
			<div class="mb-3 flex items-baseline justify-between">
				<Heading tag="h5" class="text-base font-semibold text-emerald-600 dark:text-emerald-400">
					Liquidi — usati per il FIRE Number
				</Heading>
				<span class="text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
					{formatEur(liquidTotal)}
				</span>
			</div>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
			<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
				<strong>BFP</strong> e <strong>conti deposito</strong> sono a capitale garantito e volatilita'
				quasi nulla: tienili distinti da azioni/obbligazioni. Fiscalmente i BFP sono tassati al 12,5%
				(come i titoli di stato) ed esenti da imposta di bollo; i conti deposito al 26% con bollo 0,2%
				annuo.
			</p>
		</div>

		<div class="mb-6">
			<div class="mb-3 flex items-baseline justify-between">
				<Heading tag="h5" class="text-base font-semibold text-violet-600 dark:text-violet-400">
					Fondo pensione — RITA (non prelevabile al 4%)
				</Heading>
				<span class="text-sm font-semibold text-violet-600 tabular-nums dark:text-violet-400">
					{formatEur(deferredTotal)}
				</span>
			</div>
			<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
				Il montante cresce a parte (con i versamenti mensili indicati sotto) e non entra nel
				patrimonio liquido. Dopo la cessazione del lavoro si puo' incassare come <strong
					>RITA</strong
				>: fino a 5 anni prima della pensione di vecchiaia con almeno 20 anni di contributi, fino a
				10 anni prima dopo oltre 24 mesi di inoccupazione. Altrimenti diventa prestazione all'eta'
				di pensione. Il Calcolatore conteggia questi incassi come reddito futuro.
			</p>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each deferredKeys as key}
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
			<div class="mb-3 flex items-baseline justify-between">
				<Heading tag="h5" class="text-base font-semibold text-amber-600 dark:text-amber-400">
					Illiquidi — esclusi dal FIRE Number
				</Heading>
				<span class="text-sm font-semibold text-amber-600 tabular-nums dark:text-amber-400">
					{formatEur(illiquidTotal)}
				</span>
			</div>
			<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
				Gli immobili producono eventualmente un affitto netto (inseriscilo in
				<em>Reddito → Altri redditi annui</em> come rendita passiva perpetua). Il TFR e' liquidabile solo
				in casi specifici.
			</p>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
		<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
			Quanto investi ogni mese in ciascuna categoria di asset.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each [...liquidKeys, ...deferredKeys, ...illiquidKeys] as key}
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

	<hr class="border-gray-200 dark:border-gray-700" />

	<div>
		<GestptfImport onApply={handleGestptfImport} />
	</div>
</div>
