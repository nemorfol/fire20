<script lang="ts">
	/**
	 * Pannello "Ipotesi attive": mostra all'utente tutte le aliquote/parametri
	 * normativi/fiscali correntemente applicati al calcolo. Permette di
	 * scegliere tra preset (DEFAULT_2026, PRE_RIFORMA_2023, IPOTESI_FLAT_2027)
	 * o passare in modalita' "custom" e modificarli.
	 *
	 * Filosofia: trasparenza > potenza. Ogni numero del calcolatore deve
	 * poter essere ricondotto a un'ipotesi visibile in questo pannello.
	 */
	import {
		PRESET_ASSUMPTIONS,
		DEFAULT_2026,
		customizeAssumptions,
		getPreset,
		type AssumptionSet
	} from '$lib/engine/assumptions';
	import { Card, Badge } from 'flowbite-svelte';
	import { ChevronDownOutline, ChevronUpOutline } from 'flowbite-svelte-icons';
	import { ADDIZIONALI_REGIONALI } from '$lib/data/addizionali-regionali';

	let {
		assumptions = $bindable(DEFAULT_2026)
	}: {
		assumptions: AssumptionSet;
	} = $props();

	let expanded = $state(false);
	let editing = $state(false);

	let selectedPresetId = $derived(assumptions.id);
	let isCustom = $derived(assumptions.id === 'custom');

	function selectPreset(id: string) {
		assumptions = getPreset(id);
		editing = false;
	}

	function startEditing() {
		// Forziamo la modalita' custom partendo dal preset corrente
		assumptions = customizeAssumptions(assumptions, {});
		editing = true;
	}

	function updateBracket(idx: number, field: 'from' | 'to' | 'rate', value: number) {
		const newBrackets = assumptions.irpefBrackets.map((b, i) => {
			if (i !== idx) return b;
			return { ...b, [field]: value };
		});
		assumptions = customizeAssumptions(assumptions, { irpefBrackets: newBrackets });
	}

	function updateCapital(field: keyof typeof assumptions.capital, value: number) {
		assumptions = customizeAssumptions(assumptions, { capital: { [field]: value } });
	}

	function updateInps(field: keyof typeof assumptions.inps, value: number) {
		assumptions = customizeAssumptions(assumptions, { inps: { [field]: value } });
	}

	function updatePension(field: keyof typeof assumptions.pensionFund, value: number) {
		assumptions = customizeAssumptions(assumptions, { pensionFund: { [field]: value } });
	}

	function updateSurtax(field: keyof typeof assumptions.surtaxes, value: number) {
		assumptions = customizeAssumptions(assumptions, { surtaxes: { [field]: value } });
	}

	const fmtPercent = (v: number) => `${(v * 100).toFixed(2)}%`;
	const fmtEuro = (v: number) =>
		v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`;
</script>

<Card size="xl" class="!max-w-none w-full mb-4">
	<div class="flex flex-col sm:flex-row sm:items-start gap-4">
		<div class="flex-1">
			<div class="flex items-center gap-2 mb-2">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
					Ipotesi attive
				</h3>
				<Badge color="blue">{assumptions.label}</Badge>
				{#if isCustom}
					<Badge color="yellow">Personalizzato</Badge>
				{/if}
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{assumptions.description}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<select
				class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
				value={selectedPresetId}
				onchange={(e) => selectPreset((e.target as HTMLSelectElement).value)}
			>
				{#each PRESET_ASSUMPTIONS as preset (preset.id)}
					<option value={preset.id}>{preset.label}</option>
				{/each}
				{#if isCustom}
					<option value="custom">Personalizzato</option>
				{/if}
			</select>
			<button
				class="text-sm px-3 py-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-950/50 transition-colors"
				onclick={() => (expanded = !expanded)}
			>
				{#if expanded}
					<ChevronUpOutline class="w-4 h-4 inline-block" />
					Nascondi
				{:else}
					<ChevronDownOutline class="w-4 h-4 inline-block" />
					Dettagli
				{/if}
			</button>
		</div>
	</div>

	{#if expanded}
		<div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
			<div class="flex justify-end">
				{#if !editing}
					<button
						class="text-xs px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
						onclick={startEditing}
					>
						Modifica (crea preset personalizzato)
					</button>
				{:else}
					<span class="text-xs text-amber-700 dark:text-amber-300">
						Modalita' editing — i preset non sono modificabili, le modifiche creano un set "Personalizzato".
					</span>
				{/if}
			</div>

			<!-- IRPEF -->
			<section>
				<h4 class="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Scaglioni IRPEF</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each assumptions.irpefBrackets as bracket, idx (idx)}
						<div class="flex items-center gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
							<span class="text-gray-600 dark:text-gray-400">
								{fmtEuro(bracket.from)}–{bracket.to === Number.POSITIVE_INFINITY
									? '∞'
									: fmtEuro(bracket.to)}:
							</span>
							{#if editing}
								<input
									type="number"
									step="0.01"
									min="0"
									max="1"
									class="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
									value={bracket.rate}
									onchange={(e) => updateBracket(idx, 'rate', Number((e.target as HTMLInputElement).value))}
								/>
							{:else}
								<span class="font-mono font-semibold">{fmtPercent(bracket.rate)}</span>
							{/if}
						</div>
					{/each}
				</div>
			</section>

			<!-- Capital -->
			<section>
				<h4 class="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
					Redditi finanziari e patrimoniali
				</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Capital gain azioni/ETF:</span>
						{#if editing}
							<input
								type="number"
								step="0.001"
								class="ml-1 w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.capital.stocksAndEtf}
								onchange={(e) => updateCapital('stocksAndEtf', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.capital.stocksAndEtf)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Titoli di stato (BTP/BOT):</span>
						{#if editing}
							<input
								type="number"
								step="0.001"
								class="ml-1 w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.capital.governmentBonds}
								onchange={(e) => updateCapital('governmentBonds', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.capital.governmentBonds)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Cedolare secca affitti:</span>
						{#if editing}
							<input
								type="number"
								step="0.001"
								class="ml-1 w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.capital.cedolareSecca}
								onchange={(e) => updateCapital('cedolareSecca', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.capital.cedolareSecca)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Bollo titoli (annuo):</span>
						{#if editing}
							<input
								type="number"
								step="0.0001"
								class="ml-1 w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.capital.stampDuty}
								onchange={(e) => updateCapital('stampDuty', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.capital.stampDuty)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">IVAFE (broker estero):</span>
						{#if editing}
							<input
								type="number"
								step="0.0001"
								class="ml-1 w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.capital.ivafe}
								onchange={(e) => updateCapital('ivafe', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.capital.ivafe)}</span>
						{/if}
					</div>
				</div>
			</section>

			<!-- INPS -->
			<section>
				<h4 class="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Contributi INPS</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Dipendente:</span>
						{#if editing}
							<input
								type="number"
								step="0.0001"
								class="ml-1 w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.inps.employeeBase}
								onchange={(e) => updateInps('employeeBase', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.inps.employeeBase)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Parasubordinato:</span>
						<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.inps.parasubordinato)}</span>
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Massimale:</span>
						<span class="font-mono font-semibold ml-1">{fmtEuro(assumptions.inps.massimale)}</span>
					</div>
				</div>
			</section>

			<!-- Fondo pensione -->
			<section>
				<h4 class="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Fondo pensione complementare</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Deduzione max:</span>
						{#if editing}
							<input
								type="number"
								step="1"
								class="ml-1 w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.pensionFund.maxDeduction}
								onchange={(e) => updatePension('maxDeduction', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtEuro(assumptions.pensionFund.maxDeduction)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Extra (post-2007):</span>
						<span class="font-mono font-semibold ml-1">{fmtEuro(assumptions.pensionFund.extraDeduction)}</span>
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Tassa rendimenti:</span>
						<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.pensionFund.returnTaxRate)}</span>
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Tassa prestazione (15→9%):</span>
						<span class="font-mono font-semibold ml-1">
							{fmtPercent(assumptions.pensionFund.benefitTaxBase)}–{fmtPercent(assumptions.pensionFund.benefitTaxFloor)}
						</span>
					</div>
				</div>
			</section>

			<!-- Addizionali -->
			<section>
				<h4 class="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
					Addizionali medie nazionali
				</h4>
				{#if editing}
					<div class="mb-2 text-xs">
						<label class="text-gray-600 dark:text-gray-400" for="region-select">
							Precompila l'addizionale regionale dalla tua regione:
						</label>
						<select
							id="region-select"
							class="ml-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
							onchange={(e) => {
								const sel = (e.target as HTMLSelectElement).value;
								const r = ADDIZIONALI_REGIONALI.find((x) => x.region === sel);
								if (r) updateSurtax('regional', r.rate);
							}}
						>
							<option value="">— scegli regione —</option>
							{#each ADDIZIONALI_REGIONALI as r}
								<option value={r.region}>
									{r.region} ({fmtPercent(r.rate)}{r.note ? ', ' + r.note : ''})
								</option>
							{/each}
						</select>
						<p class="text-gray-500 dark:text-gray-400 mt-1">
							Valori <strong>indicativi</strong>: le regioni applicano scaglioni propri e
							soglie di esenzione, e i valori cambiano per anno e reddito — verifica la
							delibera della tua regione. L'addizionale comunale (sotto) va impostata a parte.
						</p>
					</div>
				{/if}
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Regionale (media IT):</span>
						{#if editing}
							<input
								type="number"
								step="0.0001"
								class="ml-1 w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.surtaxes.regional}
								onchange={(e) => updateSurtax('regional', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.surtaxes.regional)}</span>
						{/if}
					</div>
					<div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span class="text-gray-600 dark:text-gray-400">Comunale (media IT):</span>
						{#if editing}
							<input
								type="number"
								step="0.0001"
								class="ml-1 w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5"
								value={assumptions.surtaxes.municipal}
								onchange={(e) => updateSurtax('municipal', Number((e.target as HTMLInputElement).value))}
							/>
						{:else}
							<span class="font-mono font-semibold ml-1">{fmtPercent(assumptions.surtaxes.municipal)}</span>
						{/if}
					</div>
				</div>
			</section>

			<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
				Tutti i valori sono espressi come decimali (0.26 = 26%) o euro. La modifica
				non e' permanente: per salvarla nel profilo serve cliccare "Salva profilo"
				dalla pagina Profilo.
			</p>
		</div>
	{/if}
</Card>
