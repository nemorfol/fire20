<script lang="ts">
	import {
		Card, Button, Input, Label, Select, Toggle, Badge, Alert
	} from 'flowbite-svelte';
	import {
		PlusOutline, TrashBinOutline, InfoCircleSolid,
		CalendarEditOutline
	} from 'flowbite-svelte-icons';
	import CurrencyInput from '$lib/components/shared/CurrencyInput.svelte';
	import PercentInput from '$lib/components/shared/PercentInput.svelte';
	import { createDefaultLifeEvent, type LifeEvent, type LifeEventType } from '$lib/engine/life-events';

	let {
		lifeEvents = $bindable<LifeEvent[]>([])
	}: {
		lifeEvents?: LifeEvent[];
	} = $props();

	const currentYear = new Date().getFullYear();

	const typeOptions: { value: LifeEventType; name: string }[] = [
		{ value: 'bonus', name: 'Bonus / entrata una-tantum' },
		{ value: 'oneTimeExpense', name: 'Spesa una-tantum' },
		{ value: 'unemployment', name: 'Disoccupazione' },
		{ value: 'partTime', name: 'Part-time' },
		{ value: 'incomeChange', name: 'Variazione permanente stipendio' }
	];

	const typeLabels: Record<LifeEventType, string> = {
		bonus: 'Bonus',
		oneTimeExpense: 'Spesa',
		unemployment: 'Disoccupazione',
		partTime: 'Part-time',
		incomeChange: 'Variazione stipendio'
	};

	const typeColors: Record<LifeEventType, 'green' | 'red' | 'yellow' | 'blue' | 'primary'> = {
		bonus: 'green',
		oneTimeExpense: 'red',
		unemployment: 'red',
		partTime: 'yellow',
		incomeChange: 'blue'
	};

	function addEvent(type: LifeEventType) {
		lifeEvents = [...lifeEvents, createDefaultLifeEvent(type, currentYear + 1)];
	}

	function removeEvent(id: string) {
		lifeEvents = lifeEvents.filter((e) => e.id !== id);
	}

	function toggleEventType(event: LifeEvent, newType: LifeEventType) {
		const replacement = createDefaultLifeEvent(newType, event.year);
		replacement.id = event.id;
		replacement.label = event.label;
		replacement.enabled = event.enabled;
		lifeEvents = lifeEvents.map((e) => (e.id === event.id ? replacement : e));
	}

	let activeCount = $derived(lifeEvents.filter((e) => e.enabled).length);
</script>

<div class="space-y-6">
	<section>
		<div class="flex items-center gap-2 mb-3">
			<CalendarEditOutline class="w-5 h-5 text-primary-600 dark:text-primary-400" />
			<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Eventi di vita parametrici</h4>
			{#if activeCount > 0}
				<Badge color="primary">{activeCount} attivi</Badge>
			{/if}
		</div>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			Aggiungi eventi "una-tantum" o periodi particolari che alterano il piano
			FIRE: bonus, spese straordinarie (matrimonio, auto, ristrutturazione),
			periodi di disoccupazione, part-time, variazioni permanenti di stipendio.
			Ogni evento impatta il cash flow e la proiezione del portafoglio.
		</p>

		{#if lifeEvents.length === 0}
			<Alert color="blue" class="mb-4">
				{#snippet icon()}
					<InfoCircleSolid class="w-4 h-4" />
				{/snippet}
				Nessun evento configurato. Il modello usa ipotesi di accumulo costante.
				Aggiungi eventi per una proiezione piu' realistica.
			</Alert>
		{/if}

		<div class="space-y-3">
			{#each lifeEvents as event (event.id)}
				<Card class="max-w-none">
					<div class="flex items-start justify-between gap-2 mb-3">
						<div class="flex items-center gap-2 flex-wrap">
							<Badge color={typeColors[event.type]}>{typeLabels[event.type]}</Badge>
							{#if !event.enabled}
								<Badge color="gray">Disattivato</Badge>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<Toggle bind:checked={event.enabled} />
							<Button color="red" outline size="xs" onclick={() => removeEvent(event.id)}>
								<TrashBinOutline class="w-3 h-3" />
							</Button>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<Label for="evt-label-{event.id}" class="mb-1 text-xs">Etichetta</Label>
							<Input id="evt-label-{event.id}" size="sm" bind:value={event.label} />
						</div>
						<div>
							<Label for="evt-type-{event.id}" class="mb-1 text-xs">Tipo</Label>
							<Select
								id="evt-type-{event.id}"
								size="sm"
								items={typeOptions}
								value={event.type}
								onchange={(e) => toggleEventType(event, (e.target as HTMLSelectElement).value as LifeEventType)}
							/>
						</div>
						<div>
							<Label for="evt-year-{event.id}" class="mb-1 text-xs">Anno di inizio</Label>
							<Input
								id="evt-year-{event.id}"
								size="sm"
								type="number"
								min={currentYear}
								max={currentYear + 80}
								bind:value={event.year}
							/>
						</div>

						{#if event.type === 'bonus' || event.type === 'oneTimeExpense'}
							<CurrencyInput
								bind:value={event.amount as unknown as number}
								label={event.type === 'bonus' ? 'Importo bonus' : 'Importo spesa'}
								id="evt-amount-{event.id}"
								step={500}
							/>
						{/if}

						{#if event.type === 'unemployment' || event.type === 'partTime'}
							<div>
								<Label for="evt-duration-{event.id}" class="mb-1 text-xs">Durata (anni)</Label>
								<Input
									id="evt-duration-{event.id}"
									size="sm"
									type="number"
									min={1}
									max={20}
									bind:value={event.durationYears as unknown as number}
								/>
							</div>
						{/if}

						{#if event.type === 'partTime'}
							<PercentInput
								bind:value={event.percentage as unknown as number}
								label="Riduzione reddito"
								id="evt-pct-{event.id}"
								min={0.05}
								max={0.95}
								step={0.05}
							/>
						{/if}

						{#if event.type === 'incomeChange'}
							<CurrencyInput
								bind:value={event.amount as unknown as number}
								label="Variazione annua (€/anno, negativo per taglio)"
								id="evt-delta-{event.id}"
								step={500}
							/>
						{/if}
					</div>
				</Card>
			{/each}
		</div>

		<div class="flex flex-wrap gap-2 mt-4">
			<Button color="alternative" size="sm" onclick={() => addEvent('bonus')}>
				<PlusOutline class="w-3 h-3 me-1" /> Bonus
			</Button>
			<Button color="alternative" size="sm" onclick={() => addEvent('oneTimeExpense')}>
				<PlusOutline class="w-3 h-3 me-1" /> Spesa una-tantum
			</Button>
			<Button color="alternative" size="sm" onclick={() => addEvent('unemployment')}>
				<PlusOutline class="w-3 h-3 me-1" /> Disoccupazione
			</Button>
			<Button color="alternative" size="sm" onclick={() => addEvent('partTime')}>
				<PlusOutline class="w-3 h-3 me-1" /> Part-time
			</Button>
			<Button color="alternative" size="sm" onclick={() => addEvent('incomeChange')}>
				<PlusOutline class="w-3 h-3 me-1" /> Variazione stipendio
			</Button>
		</div>
	</section>
</div>
