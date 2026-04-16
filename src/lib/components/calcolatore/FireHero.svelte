<script lang="ts">
	import { formatCurrency, formatCompact } from '$lib/utils/format';

	let {
		fireNumber = 0,
		annualExpenses = 0,
		withdrawalRate = 0.04,
		annualPension = 0
	}: {
		fireNumber?: number;
		annualExpenses?: number;
		withdrawalRate?: number;
		annualPension?: number;
	} = $props();

	let hasPension = $derived(annualPension > 0);
	let expensesNetOfPension = $derived(Math.max(0, annualExpenses - annualPension));
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
			{#if hasPension}
				<p class="text-sm text-primary-100 font-mono">
					({formatCurrency(annualExpenses)} − {formatCurrency(annualPension)}) / {(withdrawalRate * 100).toFixed(1)}% = <strong>{formatCurrency(fireNumber)}</strong>
				</p>
				<p class="text-xs text-primary-300 mt-1">
					(Spese annuali − Pensione INPS annua) / Tasso di prelievo sicuro = Numero FIRE
				</p>
				<p class="text-xs text-primary-200 mt-2">
					Ridotto dalla pensione INPS stimata: copri con il portafoglio solo il gap residuo di {formatCurrency(expensesNetOfPension)}/anno.
				</p>
			{:else}
				<p class="text-sm text-primary-100 font-mono">
					{formatCurrency(annualExpenses)} / {(withdrawalRate * 100).toFixed(1)}% = <strong>{formatCurrency(fireNumber)}</strong>
				</p>
				<p class="text-xs text-primary-300 mt-1">
					Spese annuali / Tasso di prelievo sicuro = Numero FIRE
				</p>
			{/if}
		</div>
	</div>
</div>
