<script lang="ts">
	import { Tooltip } from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';

	let {
		id,
		children,
		size = 'sm',
		variant = 'info'
	}: {
		/** ID univoco (obbligatorio: usato per legare trigger e popover) */
		id: string;
		children?: import('svelte').Snippet;
		size?: 'xs' | 'sm' | 'md';
		variant?: 'info' | 'warning';
	} = $props();

	let sizeClass = $derived(size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4');
	let colorClass = $derived(variant === 'warning'
		? 'text-amber-500 hover:text-amber-600'
		: 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300');
</script>

<span
	id={id}
	class="inline-flex items-center justify-center {colorClass} cursor-help transition-colors ml-1 align-middle"
	aria-label="Spiegazione ipotesi"
>
	<InfoCircleSolid class={sizeClass} />
</span>

<Tooltip triggeredBy="#{id}" class="max-w-xs text-xs leading-relaxed">
	{#if children}
		{@render children()}
	{/if}
</Tooltip>
