<script lang="ts">
	import { formatCurrency, formatCompact } from '$lib/utils/format';

	let {
		fireNumber = 0,
		annualExpenses = 0,
		withdrawalRate = 0.04,
		annualPension = 0,
		fireNumberClassic = 0,
		hasPensionBridge = false,
		bridgeYears = 0,
		pensionAge = 67,
		retirementAge = 65,
		otherIncome = 0,
		otherIncomeEndAge = 0
	}: {
		fireNumber?: number;
		annualExpenses?: number;
		withdrawalRate?: number;
		annualPension?: number;
		fireNumberClassic?: number;
		hasPensionBridge?: boolean;
		bridgeYears?: number;
		pensionAge?: number;
		retirementAge?: number;
		otherIncome?: number;
		otherIncomeEndAge?: number;
	} = $props();

	let hasPension = $derived(annualPension > 0);
	let expensesNetOfPension = $derived(Math.max(0, annualExpenses - annualPension));
	let hasOtherIncomeInFire = $derived(otherIncome > 0 && otherIncomeEndAge > retirementAge);
</script>

<div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 text-white shadow-xl">
	<div class="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
	<div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>

	<div class="relative">
		<p class="text-sm font-medium uppercase tracking-wider text-primary-200 mb-2">
			Il tuo numero FIRE
		</p>
		<p class="text-5xl font-extrabold tracking-tight mb-3">
			{formatCurrency(fireNumber)}
		</p>
		<div class="flex items-center gap-2 text-primary-200 text-sm">
			<span class="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
				{formatCompact(fireNumber)}
			</span>
		</div>

		<div class="mt-6 pt-6 border-t border-white/20">
			{#if hasPensionBridge}
				<p class="text-sm text-primary-100">
					Il portafoglio deve coprire <strong>{bridgeYears} anni di "ponte"</strong> a spese piene
					({formatCurrency(annualExpenses)}/anno dai {retirementAge} ai {pensionAge} anni)
					e poi il gap residuo di {formatCurrency(expensesNetOfPension)}/anno dopo la pensione INPS.
				</p>
				<p class="text-xs text-primary-300 mt-2">
					Il calcolo usa il valore attuale (PV) delle due rendite al rendimento reale.
				</p>
				<p class="text-xs text-primary-200 mt-2">
					Riferimento: FIRE Number "classico" senza considerare la pensione = <strong>{formatCurrency(fireNumberClassic)}</strong>
					({formatCurrency(annualExpenses)} / {(withdrawalRate * 100).toFixed(1)}%).
				</p>
			{:else if hasPension}
				<p class="text-sm text-primary-100 font-mono">
					({formatCurrency(annualExpenses)} − {formatCurrency(annualPension)}) / {(withdrawalRate * 100).toFixed(1)}% = <strong>{formatCurrency(fireNumber)}</strong>
				</p>
				<p class="text-xs text-primary-300 mt-1">
					(Spese annuali − Pensione INPS annua) / Tasso di prelievo sicuro = Numero FIRE
				</p>
				<p class="text-xs text-primary-200 mt-2">
					Pensione INPS gia' attiva (FIRE age &ge; {pensionAge}): copri con il portafoglio solo il gap residuo di {formatCurrency(expensesNetOfPension)}/anno.
				</p>
			{:else}
				<p class="text-sm text-primary-100 font-mono">
					{formatCurrency(annualExpenses)} / {(withdrawalRate * 100).toFixed(1)}% = <strong>{formatCurrency(fireNumber)}</strong>
				</p>
				<p class="text-xs text-primary-300 mt-1">
					Spese annuali / Tasso di prelievo sicuro = Numero FIRE
				</p>
			{/if}

			{#if hasOtherIncomeInFire}
				<p class="text-xs text-emerald-200 mt-3 border-t border-white/10 pt-3">
					Altri redditi in FIRE: <strong>{formatCurrency(otherIncome)}/anno</strong>
					{#if otherIncomeEndAge > retirementAge}
						fino a {otherIncomeEndAge} anni
					{/if}
					(affitti, dividendi, rendite). Il valore attuale di questa rendita riduce
					il FIRE Number: senza di essa sarebbe <strong>{formatCurrency(fireNumberClassic)}</strong>.
				</p>
			{/if}
		</div>
	</div>
</div>
