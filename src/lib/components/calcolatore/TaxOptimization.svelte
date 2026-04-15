<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { formatPercent } from '$lib/utils/format';
	import type { WithdrawalPlan } from '$lib/engine/tax-italy';

	let {
		plans = [] as WithdrawalPlan[]
	}: {
		plans?: WithdrawalPlan[];
	} = $props();

	const typeLabels: Record<string, string> = {
		taxable: 'Conti Tassabili',
		pension_fund: 'Fondo Pensione',
		government_bonds: 'Titoli di Stato',
		tfr: 'TFR'
	};

	const typeIcons: Record<string, string> = {
		taxable: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
		pension_fund: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
		government_bonds: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
		tfr: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
	};

	const typeEmoji: Record<string, string> = {
		taxable: '1',
		pension_fund: '2',
		government_bonds: '3',
		tfr: '4'
	};
</script>

<Card class="max-w-none">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Ottimizzazione Fiscale dei Prelievi
	</h3>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
		Ordine consigliato per minimizzare l'impatto fiscale durante il decumulo.
	</p>

	{#if plans.length === 0}
		<p class="text-gray-400 dark:text-gray-500 text-center py-8">
			Nessun conto disponibile per l'ottimizzazione.
		</p>
	{:else}
		<div class="space-y-3">
			{#each plans as plan, i}
				<div class="relative flex items-start gap-4">
					<!-- Step number + connector -->
					<div class="flex flex-col items-center">
						<div
							class="flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold {typeIcons[plan.accountType] ?? 'bg-gray-100 text-gray-600'}"
						>
							{plan.order}
						</div>
						{#if i < plans.length - 1}
							<div class="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-1"></div>
						{/if}
					</div>

					<!-- Content -->
					<div class="flex-1 pb-4">
						<div class="flex items-center gap-3 mb-1">
							<h4 class="font-semibold text-gray-900 dark:text-white">
								{typeLabels[plan.accountType] ?? plan.accountType}
							</h4>
							<span
								class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {plan.taxRate >= 0.2
									? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
									: plan.taxRate >= 0.125
										? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
										: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}"
							>
								{formatPercent(plan.taxRate * 100)}
							</span>
						</div>
						<p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
							{plan.note}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
