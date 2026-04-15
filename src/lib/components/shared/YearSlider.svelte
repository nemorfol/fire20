<script lang="ts">
	import { Range, Label } from 'flowbite-svelte';

	let {
		value = $bindable(30),
		min = 1,
		max = 60,
		label = ''
	}: {
		value?: number;
		label?: string;
		min?: number;
		max?: number;
	} = $props();
</script>

{#if label}
	<Label class="mb-2">{label}</Label>
{/if}
<div class="flex items-center gap-4">
	<Range
		{min}
		{max}
		step={1}
		bind:value
		class="flex-1"
	/>
	<span
		class="min-w-[3rem] text-center text-lg font-semibold text-primary-600 dark:text-primary-400"
	>
		{value}
	</span>
</div>
<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
	<span>{min}</span>
	<span>{max}</span>
</div>
