<script lang="ts">
	import {
		Card, Label, Input, Button, Badge, Alert,
		Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell
	} from 'flowbite-svelte';
	import { InfoCircleSolid, CheckCircleSolid, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import { calculateRITA, type RITAParams, type RITAResult } from '$lib/engine/pension-fund';

	let currentAge = $state(60);
	let pensionAge = $state(67);
	let unemploymentMonths = $state(0);
	let contributionYears = $state(30);
	let fondoPensioneBalance = $state(150000);
	let yearsInFund = $state(25);
	let expectedReturnRate = $state(3);
	let ritaPercentage = $state(100);

	let result = $state<RITAResult | null>(null);
	let computed = $state(false);

	function calculate() {
		const params: RITAParams = {
			currentAge,
			pensionAge,
			unemploymentMonths,
			contributionYears,
			fondoPensioneBalance,
			yearsInFund,
			expectedReturnRate: expectedReturnRate / 100,
			ritaPercentage
		};
		result = calculateRITA(params);
		computed = true;
	}

	// Confronto RITA vs attesa
	let comparison = $derived(() => {
		if (!result || !result.eligible) return null;
		const yearsRITA = result.durationMonths / 12;
		const totalNetRITA = result.totalNetReceived;

		// Se aspetti la pensione, hai il montante intero da erogare
		const waitMontante = fondoPensioneBalance * Math.pow(1 + expectedReturnRate / 100, yearsRITA);
		const taxRate = result.taxRate;
		// Rendita vitalizia stimata a 67 anni
		const convFactor = 0.054; // Fattore medio a 67 anni uomo
		const annualGross = waitMontante * convFactor;
		const annualNet = annualGross * (1 - taxRate);
		// In 17 anni di aspettativa residua a 67
		const totalNetWait = annualNet * 17;

		return {
			ritaTotal: totalNetRITA,
			ritaMonthly: result.monthlyNet,
			waitMontante: Math.round(waitMontante),
			waitAnnualNet: Math.round(annualNet),
			waitMonthlyNet: Math.round(annualNet / 12),
			waitTotal: Math.round(totalNetWait),
			ritaDuration: Math.round(yearsRITA),
			waitDuration: 17
		};
	});
</script>

<Card class="mb-6">
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Calcolo RITA
	</h3>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		La RITA (Rendita Integrativa Temporanea Anticipata) permette di ricevere il fondo pensione
		prima della pensione di vecchiaia, come reddito ponte verso la pensione INPS.
	</p>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
		<div>
			<Label for="rita-age" class="mb-1">Eta' attuale</Label>
			<Input id="rita-age" type="number" bind:value={currentAge} min={50} max={67} />
		</div>
		<div>
			<Label for="rita-pension-age" class="mb-1">Eta' pensione vecchiaia</Label>
			<Input id="rita-pension-age" type="number" bind:value={pensionAge} min={67} max={71} />
		</div>
		<div>
			<Label for="rita-unemp" class="mb-1">Mesi di inoccupazione</Label>
			<Input id="rita-unemp" type="number" bind:value={unemploymentMonths} min={0} max={120} />
		</div>
		<div>
			<Label for="rita-contr" class="mb-1">Anni di contributi</Label>
			<Input id="rita-contr" type="number" bind:value={contributionYears} min={0} max={45} />
		</div>
		<div>
			<Label for="rita-balance" class="mb-1">Saldo fondo pensione (EUR)</Label>
			<Input id="rita-balance" type="number" bind:value={fondoPensioneBalance} min={0} step={1000} />
		</div>
		<div>
			<Label for="rita-years" class="mb-1">Anni nel fondo</Label>
			<Input id="rita-years" type="number" bind:value={yearsInFund} min={1} max={50} />
		</div>
		<div>
			<Label for="rita-return" class="mb-1">Rendimento atteso (%)</Label>
			<Input id="rita-return" type="number" bind:value={expectedReturnRate} min={0} max={10} step={0.5} />
		</div>
		<div>
			<Label for="rita-pct" class="mb-1">% del montante per RITA</Label>
			<Input id="rita-pct" type="number" bind:value={ritaPercentage} min={10} max={100} step={10} />
		</div>
	</div>

	<Button color="primary" onclick={calculate}>
		Verifica Idoneita' e Calcola RITA
	</Button>
</Card>

{#if computed && result}
	<!-- Risultato idoneita' -->
	{@const r = result}
	<Alert color={r.eligible ? 'green' : 'red'} class="mb-4">
		{#snippet icon()}
			{#if r.eligible}
				<CheckCircleSolid class="w-5 h-5" />
			{:else}
				<ExclamationCircleOutline class="w-5 h-5" />
			{/if}
		{/snippet}
		<span class="font-semibold">{r.eligible ? 'Idoneo alla RITA' : 'Non idoneo alla RITA'}</span>
		<p class="mt-1 text-sm">{r.reason}</p>
	</Alert>

	{#if result.eligible}
		<!-- Dettaglio RITA -->
		<Card class="mb-6">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
				Stima RITA
			</h3>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
				<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
					<p class="text-xs text-gray-500 dark:text-gray-400">Importo RITA</p>
					<p class="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(result.ritaAmount)}</p>
				</div>
				<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
					<p class="text-xs text-gray-500 dark:text-gray-400">Mensile netto</p>
					<p class="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(result.monthlyNet)}</p>
				</div>
				<div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
					<p class="text-xs text-gray-500 dark:text-gray-400">Durata</p>
					<p class="text-xl font-bold text-purple-600 dark:text-purple-400">{Math.round(result.durationMonths / 12)} anni</p>
				</div>
				<div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
					<p class="text-xs text-gray-500 dark:text-gray-400">Aliquota fiscale</p>
					<p class="text-xl font-bold text-yellow-600 dark:text-yellow-400">{formatPercent(result.taxRate * 100)}</p>
				</div>
			</div>

			<div class="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
				<p>Eta' minima per richiedere la RITA: <strong>{result.earliestRITAAge} anni</strong></p>
				<p>Mensile lordo: <strong>{formatCurrency(result.monthlyGross)}</strong></p>
				<p>Totale netto ricevuto: <strong>{formatCurrency(result.totalNetReceived)}</strong></p>
			</div>
		</Card>

		<!-- Confronto RITA vs attesa -->
		{#if comparison()}
			{@const comp = comparison()}
			{#if comp}
				<Card class="mb-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Confronto: RITA ora vs Attendere la Pensione
					</h3>
					<Table striped>
						<TableHead>
							<TableHeadCell></TableHeadCell>
							<TableHeadCell>RITA (da ora)</TableHeadCell>
							<TableHeadCell>Attendi pensione (67 anni)</TableHeadCell>
						</TableHead>
						<TableBody>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Mensile netto</TableBodyCell>
								<TableBodyCell class="text-green-600 dark:text-green-400">{formatCurrency(comp.ritaMonthly)}</TableBodyCell>
								<TableBodyCell>{formatCurrency(comp.waitMonthlyNet)}</TableBodyCell>
							</TableBodyRow>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Durata erogazione</TableBodyCell>
								<TableBodyCell>{comp.ritaDuration} anni</TableBodyCell>
								<TableBodyCell>{comp.waitDuration} anni (stimata)</TableBodyCell>
							</TableBodyRow>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Totale netto</TableBodyCell>
								<TableBodyCell>{formatCurrency(comp.ritaTotal)}</TableBodyCell>
								<TableBodyCell>{formatCurrency(comp.waitTotal)}</TableBodyCell>
							</TableBodyRow>
							<TableBodyRow>
								<TableBodyCell class="font-semibold">Montante residuo</TableBodyCell>
								<TableBodyCell>{formatCurrency(fondoPensioneBalance - result.ritaAmount)}</TableBodyCell>
								<TableBodyCell>{formatCurrency(comp.waitMontante)}</TableBodyCell>
							</TableBodyRow>
						</TableBody>
					</Table>

					<Alert color="blue" class="mt-4">
						{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
						<span class="font-semibold">Nota per FIRE:</span> La RITA e' particolarmente utile come
						"reddito ponte" tra il pensionamento anticipato e la pensione INPS, riducendo i prelievi
						dal portafoglio investito.
					</Alert>
				</Card>
			{/if}
		{/if}
	{/if}
{/if}
