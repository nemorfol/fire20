<script lang="ts">
	import { Card, Badge, Button } from 'flowbite-svelte';
	import { PlaySolid } from 'flowbite-svelte-icons';
	import type { RiskEvent } from '$lib/engine/risk-scenarios';
	import { formatPercent } from '$lib/utils/format';

	let {
		event,
		selected = false,
		onApply,
		onToggleSelect
	}: {
		event: RiskEvent;
		selected?: boolean;
		onApply: (event: RiskEvent) => void;
		onToggleSelect: (event: RiskEvent) => void;
	} = $props();

	const typeLabels: Record<string, string> = {
		health: 'Salute',
		market: 'Mercato',
		inflation: 'Inflazione',
		geopolitical: 'Geopolitica',
		personal: 'Personale',
		longevity: "Longevita'"
	};

	const typeColors: Record<string, 'red' | 'blue' | 'yellow' | 'purple' | 'green' | 'indigo'> = {
		health: 'red',
		market: 'blue',
		inflation: 'yellow',
		geopolitical: 'purple',
		personal: 'green',
		longevity: 'indigo'
	};
</script>

<Card class="max-w-none {selected ? 'ring-primary-500 ring-2' : ''}">
	<div class="mb-3 flex items-start justify-between">
		<h5 class="text-lg font-semibold text-gray-900 dark:text-white">{event.name}</h5>
		<Badge color={typeColors[event.type] ?? 'blue'}>{typeLabels[event.type] ?? event.type}</Badge>
	</div>

	<p class="mb-4 line-clamp-3 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>

	<div class="mb-4 grid grid-cols-2 gap-2 text-sm">
		{#if event.impact.portfolioShock !== 0}
			<div class="flex justify-between rounded bg-red-50 px-2 py-1 dark:bg-red-900/20">
				<span class="text-gray-600 dark:text-gray-400">Shock portafoglio</span>
				<span class="font-medium text-red-600 dark:text-red-400"
					>{formatPercent(event.impact.portfolioShock * 100)}</span
				>
			</div>
		{/if}
		{#if event.impact.expenseIncrease !== 0}
			<div class="flex justify-between rounded bg-yellow-50 px-2 py-1 dark:bg-yellow-900/20">
				<span class="text-gray-600 dark:text-gray-400">Aumento spese</span>
				<span class="font-medium text-yellow-600 dark:text-yellow-400"
					>+{formatPercent(event.impact.expenseIncrease * 100)}</span
				>
			</div>
		{/if}
		{#if event.impact.incomeReduction !== 0}
			<div class="flex justify-between rounded bg-orange-50 px-2 py-1 dark:bg-orange-900/20">
				<span class="text-gray-600 dark:text-gray-400">Riduzione reddito</span>
				<span class="font-medium text-orange-600 dark:text-orange-400"
					>-{formatPercent(event.impact.incomeReduction * 100)}</span
				>
			</div>
		{/if}
		{#if event.impact.returnReduction !== 0}
			<div class="flex justify-between rounded bg-blue-50 px-2 py-1 dark:bg-blue-900/20">
				<span class="text-gray-600 dark:text-gray-400">Riduzione rendimenti</span>
				<span class="font-medium text-blue-600 dark:text-blue-400"
					>-{formatPercent(event.impact.returnReduction * 100)}</span
				>
			</div>
		{/if}
		<div class="flex justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-800">
			<span class="text-gray-600 dark:text-gray-400">Durata</span>
			<span class="font-medium"
				>{event.impact.duration} {event.impact.duration === 1 ? 'anno' : 'anni'}</span
			>
		</div>
		<div class="flex justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-800">
			<span class="text-gray-600 dark:text-gray-400">Occorrenza</span>
			<span class="font-medium">
				{#if event.impact.yearOfOccurrence < 0}
					{Math.abs(event.impact.yearOfOccurrence)} anni pre-FIRE
				{:else if event.impact.yearOfOccurrence === 0}
					Al FIRE
				{:else}
					Anno {event.impact.yearOfOccurrence} post-FIRE
				{/if}
			</span>
		</div>
	</div>

	<div class="flex gap-2">
		<Button size="sm" onclick={() => onApply(event)} class="flex-1 gap-1">
			<PlaySolid class="h-3.5 w-3.5" />
			Applica Stress Test
		</Button>
		<Button
			size="sm"
			outline
			color={selected ? 'red' : 'blue'}
			onclick={() => onToggleSelect(event)}
		>
			{selected ? 'Rimuovi' : 'Confronta'}
		</Button>
	</div>
</Card>
