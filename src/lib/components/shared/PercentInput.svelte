<script lang="ts">
	import { Input, InputAddon, Label } from 'flowbite-svelte';

	let {
		value = $bindable(0),
		label = '',
		min = 0,
		max = 100,
		step = 0.1,
		id = ''
	}: {
		value?: number;
		label?: string;
		min?: number;
		max?: number;
		step?: number;
		id?: string;
	} = $props();

	let isEditing = $state(false);
	let displayValue = $state(formatDisplay(value));

	function formatDisplay(num: number): string {
		return num.toLocaleString('it-IT', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 2
		});
	}

	function parseInput(text: string): number {
		const cleaned = text.replace(',', '.');
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? 0 : parsed;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		displayValue = target.value;
	}

	function handleBlur() {
		let parsed = parseInput(displayValue);
		parsed = Math.max(min, Math.min(max, parsed));
		value = parsed;
		displayValue = formatDisplay(parsed);
		isEditing = false;
	}

	function handleFocus() {
		isEditing = true;
		if (value === 0) {
			displayValue = '';
		}
	}

	$effect(() => {
		if (!isEditing) {
			displayValue = formatDisplay(value);
		}
	});
</script>

<div>
	{#if label}
		<Label for={id} class="mb-2">{label}</Label>
	{/if}
	<div class="flex">
		<Input
			{id}
			type="text"
			inputmode="decimal"
			placeholder="0,0"
			value={displayValue}
			oninput={handleInput}
			onblur={handleBlur}
			onfocus={handleFocus}
			class="rounded-r-none"
			aria-label={label || 'Percentuale'}
		/>
		<InputAddon>%</InputAddon>
	</div>
</div>
