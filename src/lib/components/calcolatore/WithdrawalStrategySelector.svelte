<script lang="ts">
	import { Card, Radio, Input, Label } from 'flowbite-svelte';

	type Strategy = 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based' | 'amortized';

	let {
		selected = $bindable('fixed' as Strategy),
		targetBequest = $bindable(0)
	}: {
		selected?: Strategy;
		targetBequest?: number;
	} = $props();

	const strategies: { id: Strategy; label: string; description: string }[] = [
		{
			id: 'fixed',
			label: 'Regola del 4%',
			description:
				'Preleva una percentuale fissa del portafoglio iniziale, aggiustata annualmente per l\'inflazione. Strategia classica e semplice da seguire.'
		},
		{
			id: 'vpw',
			label: 'VPW (Variable Percentage Withdrawal)',
			description:
				'La percentuale di prelievo aumenta con l\'eta basandosi su tavole attuariali. Si adatta automaticamente al portafoglio corrente.'
		},
		{
			id: 'guyton-klinger',
			label: 'Guyton-Klinger (Guardrails)',
			description:
				'Prelievo base aggiustato per inflazione, con guardrail: taglia del 10% se il tasso supera il 120% del tasso iniziale, aumenta del 10% se scende sotto l\'80%.'
		},
		{
			id: 'cape-based',
			label: 'CAPE-Based',
			description:
				'Il tasso di prelievo si adatta alle valutazioni di mercato tramite il rapporto CAPE. Formula: portafoglio x (2% + 0,5 / CAPE).'
		},
		{
			id: 'amortized',
			label: 'Die-with-X (ammortamento)',
			description:
				'Consuma il capitale per arrivare, all\'aspettativa di vita, a un valore target da lasciare in eredita\' (anche 0). Si ricalcola ogni anno sul portafoglio corrente.'
		}
	];
</script>

<Card class="max-w-none">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
		Strategia di Prelievo
	</h3>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		{#each strategies as strategy}
			<button
				type="button"
				class="text-left rounded-xl border-2 p-4 transition-all duration-200 {selected === strategy.id
					? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
					: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
				onclick={() => (selected = strategy.id)}
			>
				<div class="flex items-start gap-3">
					<Radio name="strategy" value={strategy.id} bind:group={selected} class="mt-0.5" />
					<div>
						<p class="font-semibold text-gray-900 dark:text-white text-sm">
							{strategy.label}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
							{strategy.description}
						</p>
					</div>
				</div>
			</button>
		{/each}
	</div>

	{#if selected === 'amortized'}
		<div class="mt-4 max-w-sm">
			<Label class="mb-1">Valore da lasciare in eredità (€ di oggi)</Label>
			<Input type="number" min="0" step="1000" bind:value={targetBequest} />
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Il prelievo si calcola per arrivare a questo valore all'aspettativa di vita (0 = consuma
				tutto il capitale).
			</p>
		</div>
	{/if}
</Card>
