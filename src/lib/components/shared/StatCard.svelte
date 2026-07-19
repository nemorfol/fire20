<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { ArrowUpOutline, ArrowDownOutline } from 'flowbite-svelte-icons';
	import type { Component } from 'svelte';

	let {
		title = '',
		value = '',
		subtitle = '',
		icon = undefined as Component | undefined,
		trend = 'neutral' as 'up' | 'down' | 'neutral',
		color = 'primary' as 'primary' | 'secondary' | 'green' | 'red' | 'yellow' | 'blue'
	}: {
		title?: string;
		value?: string;
		subtitle?: string;
		icon?: Component;
		trend?: 'up' | 'down' | 'neutral';
		color?: 'primary' | 'secondary' | 'green' | 'red' | 'yellow' | 'blue';
	} = $props();

	const colorClasses: Record<string, string> = {
		primary: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30',
		secondary: 'text-secondary-500 bg-secondary-100 dark:bg-secondary-900/30',
		green: 'text-green-500 bg-green-100 dark:bg-green-900/30',
		red: 'text-red-500 bg-red-100 dark:bg-red-900/30',
		yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
		blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
	};

	const trendColors: Record<string, string> = {
		up: 'text-green-500',
		down: 'text-red-500',
		neutral: 'text-gray-400'
	};
</script>

<Card class="max-w-none">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<p class="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
			<div class="flex items-center gap-2">
				<p class="text-2xl font-bold break-words text-gray-900 dark:text-white">{value}</p>
				{#if trend === 'up'}
					<ArrowUpOutline class="h-4 w-4 {trendColors.up}" />
				{:else if trend === 'down'}
					<ArrowDownOutline class="h-4 w-4 {trendColors.down}" />
				{/if}
			</div>
			{#if subtitle}
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
			{/if}
		</div>
		{#if icon}
			<div class="flex-shrink-0 rounded-lg p-3 {colorClasses[color] ?? colorClasses.primary}">
				{@render iconRender()}
			</div>
		{/if}
	</div>
</Card>

{#snippet iconRender()}
	{#if icon}
		{@const Icon = icon}
		<Icon class="h-6 w-6" />
	{/if}
{/snippet}
