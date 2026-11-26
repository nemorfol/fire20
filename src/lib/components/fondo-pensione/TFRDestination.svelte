<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Label,
		Input,
		Select,
		Button,
		Toggle,
		Alert,
		Spinner,
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell
	} from 'flowbite-svelte';
	import {
		InfoCircleSolid,
		CheckCircleSolid,
		ExclamationCircleOutline,
		ArrowRightOutline,
		ChartMixedDollarSolid
	} from 'flowbite-svelte-icons';
	import EChart from '$lib/components/shared/EChart.svelte';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import {
		checkTFRAnticipationEligibility,
		compareTFRDestination,
		type TFRAnticipationReason,
		type TFRAnticipationEligibility,
		type TFRDestinationComparison
	} from '$lib/engine/tfr-rules';

	let profile = $state<Profile | undefined>(undefined);
	let loading = $state(true);

	// --- Parametri (precompilati dal profilo dove possibile) ---
	let annualGrossSalary = $state(35000); // RAL
	let years = $state(25); // orizzonte di accumulo
	let inflationPct = $state(2); // inflazione attesa (%)
	let pensionFundReturnPct = $state(3); // rendimento netto atteso del comparto FP (%)
	let marginalIRPEFPct = $state(33); // aliquota IRPEF marginale (%)

	// --- Parametri anticipazione ---
	let yearsOfService = $state(10); // anzianita' nel rapporto attuale
	let tfrAccrued = $state(20000); // TFR maturato ad oggi
	let anticipationReason = $state<TFRAnticipationReason>('firstHome');
	let largeCompany = $state(false); // > 25 dipendenti (solo informativo)
	let alreadyRequested = $state(false);

	let comparison = $state<TFRDestinationComparison | null>(null);
	let eligibility = $state<TFRAnticipationEligibility | null>(null);
	let computed = $state(false);

	// Quota TFR annua accantonata (art. 2120 c.c.: retribuzione / 13,5)
	let tfrAnnual = $derived(Math.round(annualGrossSalary / 13.5));

	const reasonOptions = [
		{ value: 'firstHome', name: 'Acquisto prima casa (propria o dei figli)' },
		{ value: 'renovation', name: 'Ristrutturazione prima casa' },
		{ value: 'medical', name: 'Spese sanitarie straordinarie' },
		{ value: 'parentalLeave', name: 'Congedo parentale' },
		{ value: 'education', name: 'Spese formative' }
	];

	/** Aliquota IRPEF marginale suggerita dagli scaglioni 2026 (23/33/43). */
	function suggestMarginal(ral: number): number {
		if (ral <= 28000) return 23;
		if (ral <= 50000) return 33;
		return 43;
	}

	function initFromProfile(p: Profile) {
		if (p.annualIncome > 0) annualGrossSalary = Math.round(p.annualIncome);
		marginalIRPEFPct = suggestMarginal(annualGrossSalary);
		// Orizzonte: dagli anni all'eta' di pensionamento del profilo
		const currentAge = new Date().getFullYear() - (p.birthYear || 1990);
		const horizon = (p.retirementAge ?? 67) - currentAge;
		if (horizon > 0) years = horizon;
		// Inflazione attesa
		if (p.expenseInflation != null && p.expenseInflation > 0) {
			inflationPct = Math.round(p.expenseInflation * (p.expenseInflation < 1 ? 100 : 1) * 10) / 10;
		}
		// TFR gia' maturato (asset dedicato del profilo)
		if (p.portfolio?.tfr != null && p.portfolio.tfr > 0) tfrAccrued = Math.round(p.portfolio.tfr);
		// Anzianita' stimata dai contributi gia' versati (proxy: pension.contributionYears)
		if (p.pension?.contributionYears != null && p.pension.contributionYears > 0) {
			yearsOfService = p.pension.contributionYears;
		}
	}

	function calculate() {
		comparison = compareTFRDestination(
			tfrAnnual,
			years,
			inflationPct / 100,
			pensionFundReturnPct / 100,
			marginalIRPEFPct / 100
		);
		eligibility = checkTFRAnticipationEligibility(
			yearsOfService,
			tfrAccrued,
			anticipationReason,
			marginalIRPEFPct / 100,
			alreadyRequested
		);
		computed = true;
	}

	let chartOptions = $derived(() => {
		if (!comparison) return {};
		return {
			tooltip: {
				trigger: 'axis' as const,
				valueFormatter: (v: number) => formatCurrency(v)
			},
			legend: { data: ['Netto a scadenza'] },
			xAxis: {
				type: 'category' as const,
				data: ['TFR in azienda', 'TFR al fondo pensione']
			},
			yAxis: {
				type: 'value' as const,
				name: 'EUR',
				axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` }
			},
			series: [
				{
					name: 'Netto a scadenza',
					type: 'bar' as const,
					data: [
						{ value: comparison.inCompanyNet, itemStyle: { color: '#6b7280' } },
						{ value: comparison.inPensionFundNet, itemStyle: { color: '#10b981' } }
					],
					barWidth: '45%',
					label: {
						show: true,
						position: 'top' as const,
						formatter: (p: { value: number }) => formatCurrency(p.value)
					}
				}
			]
		};
	});

	onMount(async () => {
		try {
			const profiles = await getAllProfiles();
			if (profiles.length > 0) {
				profile = profiles[0];
				initFromProfile(profile);
			}
		} catch (e) {
			console.error('Errore caricamento profilo:', e);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<Spinner size="8" />
		<span class="ml-3 text-gray-500 dark:text-gray-400">Caricamento profilo...</span>
	</div>
{:else if !profile}
	<Alert color="yellow">
		{#snippet icon()}
			<ExclamationCircleOutline class="h-5 w-5" />
		{/snippet}
		<span class="font-medium">Profilo non trovato.</span>
		Per confrontare la destinazione del TFR e verificare l'anticipazione, crea prima un profilo: i campi
		verranno precompilati dai tuoi dati.
		<a
			href="/profilo/"
			class="ml-2 inline-flex items-center gap-1 font-medium text-yellow-800 underline dark:text-yellow-300"
		>
			Crea Profilo <ArrowRightOutline class="h-3 w-3" />
		</a>
	</Alert>
{:else}
	<!-- Parametri -->
	<div class="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
			Dove destinare il TFR: azienda o fondo pensione?
		</h3>
		<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
			Il TFR maturando (art. 2120 c.c.) puo' restare in azienda oppure essere conferito al fondo
			pensione complementare (D.Lgs. 252/2005). La scelta e' <strong>permanente</strong>: qui
			confronti il netto a scadenza delle due strade e verifichi le regole di anticipazione. I campi
			sono precompilati dal tuo profilo attivo.
		</p>

		<h4 class="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
			Confronto destinazione
		</h4>
		<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			<div>
				<Label for="tfr-ral" class="mb-1">Retribuzione annua lorda (RAL)</Label>
				<Input id="tfr-ral" type="number" bind:value={annualGrossSalary} min={0} step={1000} />
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Quota TFR annua: <strong>{formatCurrency(tfrAnnual)}</strong> (RAL / 13,5)
				</p>
			</div>
			<div>
				<Label for="tfr-years" class="mb-1">Orizzonte di accumulo (anni)</Label>
				<Input id="tfr-years" type="number" bind:value={years} min={1} max={45} />
			</div>
			<div>
				<Label for="tfr-inflation" class="mb-1">Inflazione attesa (%)</Label>
				<Input
					id="tfr-inflation"
					type="number"
					bind:value={inflationPct}
					min={0}
					max={10}
					step={0.1}
				/>
			</div>
			<div>
				<Label for="tfr-fpreturn" class="mb-1">Rendimento atteso del fondo (%)</Label>
				<Input
					id="tfr-fpreturn"
					type="number"
					bind:value={pensionFundReturnPct}
					min={0}
					max={10}
					step={0.5}
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Netto di commissioni del comparto.
				</p>
			</div>
			<div>
				<Label for="tfr-irpef" class="mb-1">Aliquota IRPEF marginale (%)</Label>
				<Input
					id="tfr-irpef"
					type="number"
					bind:value={marginalIRPEFPct}
					min={23}
					max={43}
					step={1}
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Usata per la tassazione separata del TFR in azienda.
				</p>
			</div>
		</div>

		<h4 class="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
			Verifica anticipazione (TFR in azienda)
		</h4>
		<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			<div>
				<Label for="tfr-service" class="mb-1">Anzianita' nel rapporto attuale (anni)</Label>
				<Input id="tfr-service" type="number" bind:value={yearsOfService} min={0} max={45} />
			</div>
			<div>
				<Label for="tfr-accrued" class="mb-1">TFR maturato ad oggi (EUR)</Label>
				<Input id="tfr-accrued" type="number" bind:value={tfrAccrued} min={0} step={1000} />
			</div>
			<div>
				<Label for="tfr-reason" class="mb-1">Motivo dell'anticipazione</Label>
				<Select id="tfr-reason" items={reasonOptions} bind:value={anticipationReason} />
			</div>
			<div class="flex items-end">
				<Toggle bind:checked={largeCompany}>Azienda con oltre 25 dipendenti</Toggle>
			</div>
			<div class="flex items-end">
				<Toggle bind:checked={alreadyRequested}>Anticipazione gia' richiesta in passato</Toggle>
			</div>
		</div>

		<Button color="primary" onclick={calculate} class="w-full md:w-auto">
			<ChartMixedDollarSolid class="me-2 h-4 w-4" />
			Confronta e verifica
		</Button>
	</div>

	{#if computed && comparison}
		<!-- Confronto destinazione -->
		<div class="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
			<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				Netto a scadenza: azienda vs fondo pensione
			</h3>

			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
				<div class="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/40">
					<p class="text-xs text-gray-500 dark:text-gray-400">TFR in azienda (netto)</p>
					<p class="text-xl font-bold text-gray-700 dark:text-gray-200">
						{formatCurrency(comparison.inCompanyNet)}
					</p>
					<p class="mt-1 text-xs text-gray-400">
						Rendimento netto: {formatPercent(comparison.companyAnnualReturn * 100)}/anno
					</p>
				</div>
				<div class="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
					<p class="text-xs text-gray-500 dark:text-gray-400">TFR al fondo pensione (netto)</p>
					<p class="text-xl font-bold text-green-600 dark:text-green-400">
						{formatCurrency(comparison.inPensionFundNet)}
					</p>
					<p class="mt-1 text-xs text-gray-400">
						Rendimento netto: {formatPercent(comparison.pensionFundAnnualReturn * 100)}/anno
					</p>
				</div>
				<div
					class="rounded-lg p-3 text-center {comparison.advantagePensionFund >= 0
						? 'bg-green-50 dark:bg-green-900/20'
						: 'bg-yellow-50 dark:bg-yellow-900/20'}"
				>
					<p class="text-xs text-gray-500 dark:text-gray-400">Vantaggio fondo pensione</p>
					<p
						class="text-xl font-bold {comparison.advantagePensionFund >= 0
							? 'text-green-600 dark:text-green-400'
							: 'text-yellow-600 dark:text-yellow-400'}"
					>
						{comparison.advantagePensionFund >= 0 ? '+' : ''}{formatCurrency(
							comparison.advantagePensionFund
						)}
					</p>
				</div>
			</div>

			<EChart options={chartOptions()} height="320px" class="mb-4" />

			<Alert color={comparison.advantagePensionFund >= 0 ? 'green' : 'yellow'}>
				{#snippet icon()}<InfoCircleSolid class="h-5 w-5" />{/snippet}
				<span class="font-semibold">Indicazione:</span>
				{comparison.recommendation}
			</Alert>

			<p class="mt-3 text-xs text-gray-400">
				Ipotesi del motore: TFR in azienda rivalutato all'1,5% + 75% dell'inflazione e tassato con
				aliquota separata (media IRPEF); fondo pensione con rendimenti tassati al 20% e prestazione
				tassata dal 15% al 9% (−0,3%/anno dopo il 15°) sulla sola quota contributi. Stime educative,
				non consulenza.
			</p>
		</div>

		<!-- Eleggibilita' anticipazione -->
		{#if eligibility}
			<div class="mb-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
				<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
					Anticipazione del TFR (art. 2120 c.c.)
				</h3>

				<Alert color={eligibility.eligible ? 'green' : 'red'} class="mb-4">
					{#snippet icon()}
						{#if eligibility?.eligible}
							<CheckCircleSolid class="h-5 w-5" />
						{:else}
							<ExclamationCircleOutline class="h-5 w-5" />
						{/if}
					{/snippet}
					<span class="font-semibold"
						>{eligibility.eligible
							? "Hai diritto a richiedere l'anticipazione"
							: 'Anticipazione non disponibile'}</span
					>
					<p class="mt-1 text-sm">{eligibility.reason}</p>
				</Alert>

				{#if eligibility.eligible}
					<div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
						<div class="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
							<p class="text-xs text-gray-500 dark:text-gray-400">% massima richiedibile</p>
							<p class="text-xl font-bold text-blue-600 dark:text-blue-400">
								{formatPercent(eligibility.maxPercentage * 100)}
							</p>
						</div>
						<div class="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
							<p class="text-xs text-gray-500 dark:text-gray-400">Importo massimo</p>
							<p class="text-xl font-bold text-purple-600 dark:text-purple-400">
								{formatCurrency(eligibility.maxAmount)}
							</p>
						</div>
						<div class="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
							<p class="text-xs text-gray-500 dark:text-gray-400">Tassazione stimata</p>
							<p class="text-xl font-bold text-yellow-600 dark:text-yellow-400">
								{formatPercent(eligibility.expectedTaxRate * 100)}
							</p>
						</div>
					</div>
				{/if}

				<!-- Requisiti -->
				<h4 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
					Requisiti dell'anticipazione
				</h4>
				<div class="overflow-x-auto">
					<Table striped>
						<TableHead>
							<TableHeadCell>Requisito</TableHeadCell>
							<TableHeadCell>Regola</TableHeadCell>
							<TableHeadCell>Tua situazione</TableHeadCell>
						</TableHead>
						<TableBody>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Anzianita' minima</TableBodyCell>
								<TableBodyCell>8 anni nello stesso datore di lavoro</TableBodyCell>
								<TableBodyCell class={yearsOfService >= 8 ? 'text-green-600' : 'text-red-600'}>
									{yearsOfService} anni {yearsOfService >= 8 ? 'OK' : '(insufficiente)'}
								</TableBodyCell>
							</TableBodyRow>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Numero di richieste</TableBodyCell>
								<TableBodyCell>Una sola volta nel rapporto di lavoro</TableBodyCell>
								<TableBodyCell class={alreadyRequested ? 'text-red-600' : 'text-green-600'}>
									{alreadyRequested ? "Gia' utilizzata" : 'Ancora disponibile'}
								</TableBodyCell>
							</TableBodyRow>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Quota massima</TableBodyCell>
								<TableBodyCell>Fino al 70% del TFR maturato</TableBodyCell>
								<TableBodyCell>{formatCurrency(Math.round(tfrAccrued * 0.7))}</TableBodyCell>
							</TableBodyRow>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Limite aziendale</TableBodyCell>
								<TableBodyCell>
									Aziende &gt; 25 dipendenti: max 10% degli aventi diritto per anno
								</TableBodyCell>
								<TableBodyCell class={largeCompany ? 'text-yellow-600' : 'text-gray-500'}>
									{largeCompany ? "Possibile lista d'attesa" : 'Nessun tetto aziendale'}
								</TableBodyCell>
							</TableBodyRow>
						</TableBody>
					</Table>
				</div>

				<Alert color="blue" class="mt-4">
					{#snippet icon()}<InfoCircleSolid class="h-5 w-5" />{/snippet}
					<span class="font-semibold">Nota per FIRE:</span>
					la possibilita' di anticipazione rende il TFR in azienda meno illiquido di quanto sembri: fino
					al 70% e' richiedibile per prima casa, spese mediche, ristrutturazione, congedo parentale o
					formazione. Alcuni CCNL prevedono deroghe (anzianita' piu' breve o percentuali maggiori) per
					le spese sanitarie.
				</Alert>
			</div>
		{/if}
	{/if}
{/if}
