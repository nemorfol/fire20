<script lang="ts">
	/**
	 * Tab "Coniuge" del profilo: permette di aggiungere il partner con il
	 * suo reddito, INPS, pensione attesa e contributo al fondo pensione.
	 * Quando presente, il calcolatore modella un nucleo a due redditi: due
	 * IRPEF separate, due INPS, eventuali due fondi pensione.
	 */
	import { Card, Alert, Toggle } from 'flowbite-svelte';
	import { UserOutline, InfoCircleSolid } from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import type { Spouse } from '$lib/db/index';
	import { formatCurrency } from '$lib/utils/format';
	import { spouseYearlyCashFlow } from '$lib/engine/couple';

	let {
		spouse = $bindable<Spouse | undefined>(undefined)
	}: {
		spouse?: Spouse;
	} = $props();

	const currentYear = new Date().getFullYear();

	let hasSpouse = $state<boolean>(spouse !== undefined);

	function ensureSpouse() {
		if (!spouse) {
			spouse = {
				name: 'Coniuge',
				birthYear: currentYear - 35,
				retirementAge: 67,
				annualIncome: 30000,
				contractType: 'dipendente',
				incomeGrowthRate: 0.01,
				pensionMonthly: 1500,
				pensionAge: 67,
				contributionYears: 10,
				pensionFundContribution: 0,
				initialPortfolio: 0,
				includeReversibility: false
			};
		}
	}

	function toggleSpouse(value: boolean) {
		hasSpouse = value;
		if (value) {
			ensureSpouse();
		} else {
			spouse = undefined;
		}
	}

	let spouseAge = $derived(spouse ? currentYear - spouse.birthYear : 0);

	// Anteprima del netto attuale e della pensione del coniuge
	let preview = $derived(
		spouse ? spouseYearlyCashFlow(spouse, currentYear, currentYear, 0.02) : null
	);
</script>

<div class="space-y-6">
	<Card size="xl" class="w-full !max-w-none">
		<div class="mb-4 flex items-start gap-3">
			<UserOutline class="h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-400" />
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
					Coniuge / partner convivente
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Modella un nucleo a due redditi. Le IRPEF sono calcolate separatamente (la fiscalita'
					italiana e' individuale). Le spese sono di nucleo.
				</p>
			</div>
		</div>

		<div class="mb-4 flex items-center gap-3">
			<Toggle
				bind:checked={hasSpouse}
				onchange={(e) => toggleSpouse((e.target as HTMLInputElement).checked)}
			/>
			<span class="text-sm text-gray-700 dark:text-gray-300">
				Includi coniuge nel calcolo del nucleo
			</span>
		</div>

		{#if hasSpouse && spouse}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label class="mb-1 block text-sm font-medium" for="spouse-name">Nome</label>
					<input
						id="spouse-name"
						type="text"
						bind:value={spouse.name}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="spouse-birth">Anno di nascita</label>
					<input
						id="spouse-birth"
						type="number"
						min="1930"
						max={currentYear}
						bind:value={spouse.birthYear}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
					/>
					<span class="text-xs text-gray-500 dark:text-gray-400"
						>Eta' attuale: {spouseAge} anni</span
					>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="spouse-retire"
						>Eta' di pensione FIRE</label
					>
					<input
						id="spouse-retire"
						type="number"
						min="40"
						max="80"
						bind:value={spouse.retirementAge}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="spouse-contract">Tipo contratto</label>
					<select
						id="spouse-contract"
						bind:value={spouse.contractType}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
					>
						<option value="dipendente">Lavoratore dipendente</option>
						<option value="autonomo">Autonomo / partita IVA</option>
						<option value="parasubordinato">Parasubordinato (co.co.co)</option>
					</select>
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium">Reddito lordo annuo</span>
					<CurrencyInput bind:value={spouse.annualIncome} />
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium"
						>Crescita reddito annua (sopra inflazione)</span
					>
					<PercentInput bind:value={spouse.incomeGrowthRate} step={0.005} />
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium">Pensione INPS attesa (mensile)</span>
					<CurrencyInput bind:value={spouse.pensionMonthly} />
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="spouse-pension-age"
						>Eta' pensione INPS</label
					>
					<input
						id="spouse-pension-age"
						type="number"
						min="50"
						max="80"
						bind:value={spouse.pensionAge}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
					/>
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium">Contributo annuo fondo pensione</span>
					<CurrencyInput bind:value={spouse.pensionFundContribution} />
					<span class="text-xs text-gray-500 dark:text-gray-400">
						Deducibile fino a 5.300€ (Legge di Bilancio 2026), separato dal tuo
					</span>
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium"
						>Investimenti / patrimonio attuale del coniuge</span
					>
					<CurrencyInput bind:value={spouse.initialPortfolio} />
					<span class="text-xs text-gray-500 dark:text-gray-400">
						Capitale gia' investito dal coniuge: si somma al patrimonio del nucleo nel calcolo FIRE.
					</span>
				</div>
			</div>

			{#if preview}
				<div
					class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
				>
					<h4 class="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
						Anteprima cash flow del coniuge (anno corrente)
					</h4>
					<div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
						<div>
							<div class="text-xs text-gray-600 dark:text-gray-400">Lordo annuo</div>
							<div class="font-semibold">{formatCurrency(preview.grossSalary)}</div>
						</div>
						<div>
							<div class="text-xs text-gray-600 dark:text-gray-400">Netto in busta</div>
							<div class="font-semibold text-green-700 dark:text-green-400">
								{formatCurrency(preview.netSalary)}
							</div>
						</div>
						<div>
							<div class="text-xs text-gray-600 dark:text-gray-400">IRPEF + addiz.</div>
							<div class="font-semibold text-red-700 dark:text-red-400">
								{formatCurrency(preview.irpef)}
							</div>
						</div>
						<div>
							<div class="text-xs text-gray-600 dark:text-gray-400">INPS lavoratore</div>
							<div class="font-semibold text-orange-700 dark:text-orange-400">
								{formatCurrency(preview.inps)}
							</div>
						</div>
					</div>
					<p class="mt-3 text-xs text-gray-600 dark:text-gray-400">
						La pensione attesa al pensionamento ({spouse.pensionAge} anni) sara' di {formatCurrency(
							spouse.pensionMonthly * 13
						)} lordi annui (13 mensilita').
					</p>
				</div>
			{/if}
		{:else}
			<Alert color="gray">
				<InfoCircleSolid class="inline h-4 w-4" />
				Profilo single attivo. Attiva il coniuge per modellare il nucleo a due redditi.
			</Alert>
		{/if}
	</Card>
</div>
