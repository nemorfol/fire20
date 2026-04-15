<script lang="ts">
	import { Card, Radio } from 'flowbite-svelte';

	type Strategy = 'fixed' | 'vpw' | 'guyton-klinger' | 'cape-based';

	let {
		selected = $bindable('fixed' as Strategy)
	}: {
		selected?: Strategy;
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
					<Radio
						name="strategy"
						value={strategy.id}
						checked={selected === strategy.id}
						class="mt-0.5"
					/>
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
</Card>
