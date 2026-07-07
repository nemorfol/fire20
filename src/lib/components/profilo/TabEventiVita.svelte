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
	import { formatCurrency } from '$lib/utils/format';
	import { createDefaultLifeEvent, type LifeEvent, type LifeEventType } from '$lib/engine/life-events';
	import { calculatePropertyCapitalGainsTax } from '$lib/engine/tax-italy';
	import type { SuccessionRelationship } from '$lib/engine/tax-italy';

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
		{ value: 'incomeChange', name: 'Variazione permanente stipendio' },
		{ value: 'inheritance', name: 'Eredità' },
		{ value: 'propertySale', name: 'Vendita immobile' }
	];

	const typeLabels: Record<LifeEventType, string> = {
		bonus: 'Bonus',
		oneTimeExpense: 'Spesa',
		unemployment: 'Disoccupazione',
		partTime: 'Part-time',
		incomeChange: 'Variazione stipendio',
		inheritance: 'Eredità',
		propertySale: 'Vendita immobile'
	};

	const typeColors: Record<LifeEventType, 'green' | 'red' | 'yellow' | 'blue' | 'primary'> = {
		bonus: 'green',
		oneTimeExpense: 'red',
		unemployment: 'red',
		partTime: 'yellow',
		incomeChange: 'blue',
		inheritance: 'green',
		propertySale: 'primary'
	};

	/** Imposta plusvalenza dell'evento vendita immobile (per anteprima live). */
	function propertySaleTax(e: LifeEvent): number {
		const yearsHeld = e.purchaseYear > 0 ? e.year - e.purchaseYear : 99;
		return calculatePropertyCapitalGainsTax(e.amount, e.costBasis, yearsHeld, e.isPrimaryResidence);
	}

	/** Nota descrittiva sulla plusvalenza (esente / imponibile) per l'anteprima. */
	function propertySaleTaxNote(e: LifeEvent): string {
		const yearsHeld = e.purchaseYear > 0 ? e.year - e.purchaseYear : 99;
		const tax = propertySaleTax(e);
		if (tax > 0)
			return `Plusvalenza imponibile ${Math.round(tax)} € (26%, possesso ${yearsHeld} anni < 5)`;
		if (e.isPrimaryResidence) return 'Plusvalenza esente (abitazione principale / prima casa)';
		return `Plusvalenza esente (possesso ${yearsHeld} anni ≥ 5)`;
	}

	/** Netto incassato dalla vendita (al netto della plusvalenza). */
	function propertySaleNet(e: LifeEvent): number {
		return Math.max(0, e.amount - propertySaleTax(e));
	}

	/** Annualita' costante (ammortamento francese) se vendita rateale. */
	function propertySaleAnnuity(e: LifeEvent): number {
		const n = Math.max(0, Math.floor(e.durationYears));
		if (n <= 0) return 0;
		const net = propertySaleNet(e);
		const r = e.percentage > 0 ? e.percentage : 0;
		return r > 0 ? (net * r) / (1 - Math.pow(1 + r, -n)) : net / n;
	}

	const relationshipOptions: { value: SuccessionRelationship; name: string }[] = [
		{ value: 'spouse-direct', name: 'Coniuge / figli / genitori (franchigia 1M€, 4%)' },
		{ value: 'siblings', name: 'Fratelli/sorelle (franchigia 100k€, 6%)' },
		{ value: 'other-relatives', name: 'Altri parenti (6%, no franchigia)' },
		{ value: 'unrelated', name: 'Estranei (8%, no franchigia)' }
	];

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
			periodi di disoccupazione, part-time, variazioni permanenti di stipendio,
			eredità e la vendita di un immobile (con plusvalenza e regola dei 5 anni).
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

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
						<div>
							<Label for="evt-label-{event.id}" class="mb-2">Etichetta</Label>
							<Input id="evt-label-{event.id}" bind:value={event.label} />
						</div>
						<div>
							<Label for="evt-type-{event.id}" class="mb-2">Tipo</Label>
							<Select
								id="evt-type-{event.id}"
								items={typeOptions}
								value={event.type}
								onchange={(e) => toggleEventType(event, (e.target as HTMLSelectElement).value as LifeEventType)}
							/>
						</div>
						<div>
							<Label for="evt-year-{event.id}" class="mb-2">Anno di inizio</Label>
							<Input
								id="evt-year-{event.id}"
								type="number"
								min={currentYear}
								max={currentYear + 80}
								bind:value={event.year}
							/>
						</div>

						{#if event.type === 'bonus' || event.type === 'oneTimeExpense'}
							<CurrencyInput
								bind:value={event.amount}
								label={event.type === 'bonus' ? 'Importo bonus' : 'Importo spesa'}
								id="evt-amount-{event.id}"
								step={500}
							/>
						{/if}

						{#if event.type === 'unemployment' || event.type === 'partTime'}
							<div>
								<Label for="evt-duration-{event.id}" class="mb-2">Durata (anni)</Label>
								<Input
									id="evt-duration-{event.id}"
									type="number"
									min={1}
									max={20}
									bind:value={event.durationYears}
								/>
							</div>
						{/if}

						{#if event.type === 'partTime'}
							<PercentInput
								bind:value={event.percentage}
								label="Riduzione reddito"
								id="evt-pct-{event.id}"
								min={0.05}
								max={0.95}
								step={0.05}
							/>
						{/if}

						{#if event.type === 'incomeChange'}
							<CurrencyInput
								bind:value={event.amount}
								label="Variazione annua (€/anno, negativo per taglio)"
								id="evt-delta-{event.id}"
								step={500}
							/>
						{/if}

						{#if event.type === 'inheritance'}
							<CurrencyInput
								bind:value={event.amount}
								label="Valore ereditato (lordo)"
								id="evt-inh-amount-{event.id}"
								step={1000}
							/>
							<div>
								<Label for="evt-inh-rel-{event.id}" class="mb-2">Parentela (successione)</Label>
								<Select
									id="evt-inh-rel-{event.id}"
									items={relationshipOptions}
									bind:value={event.relationship}
								/>
							</div>
							<div class="flex items-end pb-2">
								<Toggle bind:checked={event.isProperty}>Immobile (illiquido, non investito)</Toggle>
							</div>
							{#if !event.isProperty}
								<div>
									<Label for="evt-inh-alloc-{event.id}" class="mb-2">Destinazione</Label>
									<Select
										id="evt-inh-alloc-{event.id}"
										items={[
											{ value: 'growth', name: 'Reinvesti nel portafoglio (ETF)' },
											{ value: 'goal', name: 'Bucket obiettivo (basso rischio)' }
										]}
										bind:value={event.allocation}
									/>
								</div>
								{#if event.allocation === 'goal'}
									<PercentInput
										bind:value={event.goalAnnualReturn}
										label="Rendimento bucket"
										id="evt-inh-goalret-{event.id}"
										min={0}
										max={0.06}
										step={0.005}
									/>
									<div>
										<Label for="evt-inh-goalpurp-{event.id}" class="mb-2">Obiettivo</Label>
										<Select
											id="evt-inh-goalpurp-{event.id}"
											items={[
												{ value: 'university', name: 'Università figli (prelievo automatico)' },
												{ value: 'general', name: 'Riserva generica' }
											]}
											bind:value={event.goalPurpose}
										/>
									</div>
									<div class="md:col-span-2 lg:col-span-4">
										<Alert color="blue" class="py-2">
											<span class="text-xs">
												Il bucket è tenuto <strong>separato dal portafoglio FIRE</strong> (non
												esposto alla volatilità) e cresce al tasso indicato.{event.goalPurpose ===
												'university'
													? ' Copre automaticamente i costi universitari dei figli prima che pesino sul portafoglio.'
													: ''}
											</span>
										</Alert>
									</div>
								{/if}
							{/if}
						{/if}

						{#if event.type === 'propertySale'}
							<CurrencyInput
								bind:value={event.amount}
								label="Valore di vendita"
								id="evt-ps-amount-{event.id}"
								step={5000}
							/>
							<CurrencyInput
								bind:value={event.costBasis}
								label="Prezzo di acquisto"
								id="evt-ps-cost-{event.id}"
								step={5000}
							/>
							<div>
								<Label for="evt-ps-py-{event.id}" class="mb-2">Anno di acquisto</Label>
								<Input
									id="evt-ps-py-{event.id}"
									type="number"
									min={1950}
									max={currentYear + 80}
									bind:value={event.purchaseYear}
								/>
							</div>
							<div class="flex items-end pb-2">
								<Toggle bind:checked={event.isPrimaryResidence}>
									Abitazione principale / prima casa
								</Toggle>
							</div>
							<div>
								<Label for="evt-ps-ry-{event.id}" class="mb-2">
									Rateizza su (anni, 0 = incasso unico)
								</Label>
								<Input
									id="evt-ps-ry-{event.id}"
									type="number"
									min={0}
									max={40}
									bind:value={event.durationYears}
								/>
							</div>
							{#if event.durationYears > 0}
								<PercentInput
									bind:value={event.percentage}
									label="Tasso di interesse (rateale)"
									id="evt-ps-rate-{event.id}"
									min={0}
									max={0.1}
									step={0.005}
								/>
							{/if}
							<div class="md:col-span-2 lg:col-span-4">
								<Alert color={propertySaleTax(event) > 0 ? 'yellow' : 'green'} class="py-2">
									<span class="text-xs">
										{propertySaleTaxNote(event)} ·
										{#if event.durationYears > 0}
											incasso rateale (la liquidita' entra anno per anno).
										{:else}
											la vendita immette il netto come liquidita' nell'anno indicato
											(immobile illiquido monetizzato).
										{/if}
									</span>
								</Alert>
							</div>
							{#if event.durationYears > 0}
								<div class="md:col-span-2 lg:col-span-4">
									<Alert color="blue" class="py-2">
										<span class="text-xs">
											Rateale: ~{formatCurrency(propertySaleAnnuity(event))}/anno per
											{event.durationYears} anni (totale ~{formatCurrency(
												propertySaleAnnuity(event) * event.durationYears
											)}). TIR implicito {(event.percentage * 100).toFixed(1)}%: il rateale
											conviene rispetto all'incasso unico solo se questo tasso supera il
											rendimento atteso dei tuoi investimenti.
										</span>
									</Alert>
								</div>
							{/if}
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
			<Button color="alternative" size="sm" onclick={() => addEvent('inheritance')}>
				<PlusOutline class="w-3 h-3 me-1" /> Eredità
			</Button>
			<Button color="alternative" size="sm" onclick={() => addEvent('propertySale')}>
				<PlusOutline class="w-3 h-3 me-1" /> Vendita immobile
			</Button>
		</div>
	</section>
</div>
