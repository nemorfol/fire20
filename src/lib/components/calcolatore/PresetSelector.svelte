<script lang="ts">
	import { Card, ButtonGroup, Button } from 'flowbite-svelte';
	import { ShieldCheckSolid, AdjustmentsHorizontalOutline, FireSolid } from 'flowbite-svelte-icons';
	import AssumptionTooltip from '$lib/components/shared/AssumptionTooltip.svelte';

	export type PresetMode = 'conservative' | 'base' | 'aggressive' | 'custom';

	interface PresetValues {
		swr: number;            // % (es. 3.5)
		expectedReturn: number; // % (es. 6)
		inflationRate: number;  // % (es. 2.5)
	}

	const PRESETS: Record<Exclude<PresetMode, 'custom'>, PresetValues> = {
		conservative: { swr: 3.0, expectedReturn: 5.0, inflationRate: 3.0 },
		base:         { swr: 4.0, expectedReturn: 7.0, inflationRate: 2.0 },
		aggressive:   { swr: 4.5, expectedReturn: 8.5, inflationRate: 1.5 }
	};

	let {
		swr = $bindable(4),
		expectedReturn = $bindable(7),
		inflationRate = $bindable(2)
	}: {
		swr?: number;
		expectedReturn?: number;
		inflationRate?: number;
	} = $props();

	// Riconosce automaticamente se i valori correnti coincidono con un preset
	let currentMode = $derived.by<PresetMode>(() => {
		for (const [key, p] of Object.entries(PRESETS)) {
			if (
				Math.abs(p.swr - swr) < 0.01 &&
				Math.abs(p.expectedReturn - expectedReturn) < 0.01 &&
				Math.abs(p.inflationRate - inflationRate) < 0.01
			) {
				return key as PresetMode;
			}
		}
		return 'custom';
	});

	function applyPreset(mode: Exclude<PresetMode, 'custom'>) {
		const p = PRESETS[mode];
		swr = p.swr;
		expectedReturn = p.expectedReturn;
		inflationRate = p.inflationRate;
	}
</script>

<Card class="max-w-none">
	<div class="flex items-center gap-2 mb-3">
		<h3 class="text-base font-semibold text-gray-900 dark:text-white">
			Modalita' di calcolo
		</h3>
		<AssumptionTooltip id="tip-preset-mode">
			<strong class="block mb-1">Come funzionano i preset</strong>
			Ogni modalita' applica combinazioni coerenti di SWR, rendimento atteso e
			inflazione. Conservativa = ipotesi prudenti (SWR 3%, rendimento 5%,
			inflazione 3%); Base = regola del 4% classica; Aggressiva = ipotesi
			ottimistiche per orizzonti lunghi (SWR 4.5%, rendimento 8.5%, inflazione
			1.5%). Scegliere la stessa modalita' di chi ha pubblicato la strategia
			aiuta il confronto.
		</AssumptionTooltip>
	</div>

	<ButtonGroup class="w-full">
		<Button
			color={currentMode === 'conservative' ? 'primary' : 'alternative'}
			class="flex-1"
			onclick={() => applyPreset('conservative')}
		>
			<ShieldCheckSolid class="w-4 h-4 me-2" />
			Conservativa
		</Button>
		<Button
			color={currentMode === 'base' ? 'primary' : 'alternative'}
			class="flex-1"
			onclick={() => applyPreset('base')}
		>
			<AdjustmentsHorizontalOutline class="w-4 h-4 me-2" />
			Base
		</Button>
		<Button
			color={currentMode === 'aggressive' ? 'primary' : 'alternative'}
			class="flex-1"
			onclick={() => applyPreset('aggressive')}
		>
			<FireSolid class="w-4 h-4 me-2" />
			Aggressiva
		</Button>
	</ButtonGroup>

	<div class="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
		<div class="text-gray-500 dark:text-gray-400">
			SWR <span class="font-semibold text-gray-900 dark:text-white">{swr.toFixed(1)}%</span>
		</div>
		<div class="text-gray-500 dark:text-gray-400">
			Rendimento <span class="font-semibold text-gray-900 dark:text-white">{expectedReturn.toFixed(1)}%</span>
		</div>
		<div class="text-gray-500 dark:text-gray-400">
			Inflazione <span class="font-semibold text-gray-900 dark:text-white">{inflationRate.toFixed(1)}%</span>
		</div>
	</div>

	{#if currentMode === 'custom'}
		<p class="mt-3 text-xs text-gray-500 dark:text-gray-400 italic text-center">
			Modalita' personalizzata (i parametri non coincidono con nessun preset)
		</p>
	{/if}
</Card>
