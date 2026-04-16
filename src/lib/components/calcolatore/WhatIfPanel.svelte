<script lang="ts">
	import { Card, Label, Range, Button, Badge } from 'flowbite-svelte';
	import { ChevronDownOutline, ChevronUpOutline } from 'flowbite-svelte-icons';

	let {
		annualExpenses = $bindable(20000),
		initialPortfolio = $bindable(0),
		annualContribution = $bindable(0),
		retirementAge = $bindable(65),
		pensionAmount = $bindable(0),
		pensionAge = $bindable(67),
		lifeExpectancy = $bindable(90),
		// Default values from profile for reset & change detection
		defaults = {} as {
			annualExpenses: number;
			initialPortfolio: number;
			annualContribution: number;
			retirementAge: number;
			pensionAmount: number;
			pensionAge: number;
			lifeExpectancy: number;
		},
		onreset = () => {}
	}: {
		annualExpenses?: number;
		initialPortfolio?: number;
		annualContribution?: number;
		retirementAge?: number;
		pensionAmount?: number;
		pensionAge?: number;
		lifeExpectancy?: number;
		defaults?: {
			annualExpenses: number;
			initialPortfolio: number;
			annualContribution: number;
			retirementAge: number;
			pensionAmount: number;
			pensionAge: number;
			lifeExpectancy: number;
		};
		onreset?: () => void;
	} = $props();

	let expanded = $state(true);

	let hasChanges = $derived(
		annualExpenses !== defaults.annualExpenses ||
		initialPortfolio !== defaults.initialPortfolio ||
		annualContribution !== defaults.annualContribution ||
		retirementAge !== defaults.retirementAge ||
		pensionAmount !== defaults.pensionAmount ||
		pensionAge !== defaults.pensionAge ||
		lifeExpectancy !== defaults.lifeExpectancy
	);

	function formatCurrency(value: number): string {
		return value.toLocaleString('it-IT') + ' \u20AC';
	}

	function isChanged(current: number, defaultVal: number): boolean {
		return current !== defaultVal;
	}
</script>

<Card class="max-w-none">
	<div class="flex items-center justify-between mb-2">
		<button
			type="button"
			class="flex items-center gap-2 text-left"
			onclick={() => (expanded = !expanded)}
		>
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
				Esplora Scenari
			</h3>
			<Badge color={hasChanges ? 'yellow' : 'gray'} class="ml-2">
				{hasChanges ? 'Modificato' : 'What If'}
			</Badge>
			{#if expanded}
				<ChevronUpOutline class="w-4 h-4 text-gray-500" />
			{:else}
				<ChevronDownOutline class="w-4 h-4 text-gray-500" />
			{/if}
		</button>
		{#if hasChanges}
			<Button size="xs" color="alternative" onclick={onreset}>
				Reset
			</Button>
		{/if}
	</div>

	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Modifica i parametri per esplorare scenari alternativi. Il grafico si aggiorna in tempo reale.
	</p>

	{#if expanded}
		<div class="space-y-8">
			<!-- Fase di Accumulo -->
			<div>
				<h4 class="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
					Fase di Accumulo
				</h4>
				<div class="space-y-5">
					<!-- Spese annuali FIRE -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Spese annuali FIRE
								{#if isChanged(annualExpenses, defaults.annualExpenses)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
								{formatCurrency(annualExpenses)}
							</span>
						</div>
						<Range min={5000} max={100000} step={500} bind:value={annualExpenses} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>5.000 &euro;</span>
							<span>100.000 &euro;</span>
						</div>
					</div>

					<!-- Portafoglio iniziale -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Portafoglio iniziale
								{#if isChanged(initialPortfolio, defaults.initialPortfolio)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
								{formatCurrency(initialPortfolio)}
							</span>
						</div>
						<Range min={0} max={2000000} step={10000} bind:value={initialPortfolio} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>0 &euro;</span>
							<span>2.000.000 &euro;</span>
						</div>
					</div>

					<!-- Contributi annuali -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Contributi annuali
								{#if isChanged(annualContribution, defaults.annualContribution)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
								{formatCurrency(annualContribution)}
							</span>
						</div>
						<Range min={0} max={100000} step={1000} bind:value={annualContribution} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>0 &euro;</span>
							<span>100.000 &euro;</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Fase di Decumulo -->
			<div>
				<h4 class="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
					Fase di Decumulo
				</h4>
				<div class="space-y-5">
					<!-- Et&agrave; pensionamento -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Et&agrave; pensionamento
								{#if isChanged(retirementAge, defaults.retirementAge)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
								{retirementAge} anni
							</span>
						</div>
						<Range min={30} max={75} step={1} bind:value={retirementAge} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>30 anni</span>
							<span>75 anni</span>
						</div>
					</div>

					<!-- Pensione INPS mensile -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Pensione INPS mensile
								{#if isChanged(pensionAmount, defaults.pensionAmount)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
								{formatCurrency(pensionAmount)}
							</span>
						</div>
						<Range min={0} max={5000} step={50} bind:value={pensionAmount} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>0 &euro;</span>
							<span>5.000 &euro;</span>
						</div>
					</div>

					<!-- Et&agrave; pensione INPS -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Et&agrave; pensione INPS
								{#if isChanged(pensionAge, defaults.pensionAge)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
								{pensionAge} anni
							</span>
						</div>
						<Range min={57} max={71} step={1} bind:value={pensionAge} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>57 anni</span>
							<span>71 anni</span>
						</div>
					</div>

					<!-- Aspettativa di vita -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<Label>
								Aspettativa di vita
								{#if isChanged(lifeExpectancy, defaults.lifeExpectancy)}
									<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-1"></span>
								{/if}
							</Label>
							<span class="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
								{lifeExpectancy} anni
							</span>
						</div>
						<Range min={70} max={100} step={1} bind:value={lifeExpectancy} />
						<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>70 anni</span>
							<span>100 anni</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</Card>
