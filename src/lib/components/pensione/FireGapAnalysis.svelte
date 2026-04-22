<script lang="ts">
	import { Card, Alert } from 'flowbite-svelte';
	import { InfoCircleSolid, CheckCircleSolid, ExclamationCircleSolid } from 'flowbite-svelte-icons';
	import { formatCurrency } from '$lib/utils/format';

	let {
		annualFireExpenses = 0,
		monthlyPensionNet = 0,
		yearsToPension = 0,
		yearsInRetirement = 20,
		realReturn = 0.02
	}: {
		/** Spese annue in FIRE (es. profile.fireExpenses) */
		annualFireExpenses?: number;
		/** Pensione mensile netta stimata (alla eta ottimale) */
		monthlyPensionNet?: number;
		/** Anni mancanti all'arrivo della pensione INPS */
		yearsToPension?: number;
		/** Anni previsti di percezione (es. lifeExpectancy - pensionAge) */
		yearsInRetirement?: number;
		/** Rendimento reale per calcolare il capitale aggiuntivo necessario */
		realReturn?: number;
	} = $props();

	// Pensione INPS annua (13 mensilita italiane)
	let annualPensionNet = $derived(monthlyPensionNet * 13);

	// Gap annuo in fase di pensionamento INPS
	let annualGap = $derived(Math.max(0, annualFireExpenses - annualPensionNet));
	let monthlyGap = $derived(annualGap / 12);
	let coveragePercent = $derived(
		annualFireExpenses > 0
			? Math.min(100, (annualPensionNet / annualFireExpenses) * 100)
			: 0
	);

	// Capitale aggiuntivo necessario al momento della pensione per colmare il gap
	// PV di una rendita di annualGap per yearsInRetirement anni
	let capitalToCoverGap = $derived.by(() => {
		if (annualGap === 0 || yearsInRetirement <= 0) return 0;
		const r = realReturn;
		if (Math.abs(r) < 1e-9) return annualGap * yearsInRetirement;
		return (annualGap * (1 - Math.pow(1 + r, -yearsInRetirement))) / r;
	});

	// Contributo mensile suggerito per raggiungere il capitale nel tempo disponibile
	let monthlyContributionSuggested = $derived.by(() => {
		if (capitalToCoverGap === 0 || yearsToPension <= 0) return 0;
		// FV di annuita mensile = FV / [(1+r_monthly)^n - 1) / r_monthly]
		const n = yearsToPension * 12;
		const rMonthly = realReturn / 12;
		if (Math.abs(rMonthly) < 1e-9) return capitalToCoverGap / n;
		const factor = (Math.pow(1 + rMonthly, n) - 1) / rMonthly;
		return capitalToCoverGap / factor;
	});

	let isFullyCovered = $derived(annualGap === 0);
</script>

<Card class="max-w-none">
	<h5 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		Analisi gap FIRE vs pensione INPS
	</h5>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
		Quanta parte delle tue spese FIRE e' coperta dall'INPS, e quanto capitale aggiuntivo
		serve accumulare nel fondo pensione o nel portafoglio privato per colmare la differenza.
	</p>

	<!-- Copertura -->
	<div class="mb-5">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Copertura INPS</span>
			<span class="text-sm font-bold text-gray-900 dark:text-white">
				{coveragePercent.toFixed(1)}%
			</span>
		</div>
		<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
			<div
				class="h-3 rounded-full transition-all"
				class:bg-green-500={coveragePercent >= 80}
				class:bg-yellow-500={coveragePercent >= 40 && coveragePercent < 80}
				class:bg-red-500={coveragePercent < 40}
				style="width: {coveragePercent}%"
			></div>
		</div>
		<div class="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
			<span>Pensione INPS: {formatCurrency(annualPensionNet)}/anno</span>
			<span>Spese FIRE: {formatCurrency(annualFireExpenses)}/anno</span>
		</div>
	</div>

	<!-- Metriche -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
		<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
			<div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Gap annuo</div>
			<div class="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
				{formatCurrency(annualGap)}
			</div>
			<div class="text-xs text-gray-400 dark:text-gray-500">
				{formatCurrency(monthlyGap)}/mese da coprire con risparmio privato
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
			<div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Capitale extra necessario</div>
			<div class="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
				{formatCurrency(capitalToCoverGap)}
			</div>
			<div class="text-xs text-gray-400 dark:text-gray-500">
				Al momento della pensione, per coprire {yearsInRetirement} anni
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
			<div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Contributo mensile consigliato</div>
			<div class="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
				{formatCurrency(monthlyContributionSuggested)}
			</div>
			<div class="text-xs text-gray-400 dark:text-gray-500">
				Da oggi per {yearsToPension} anni, rendimento reale {(realReturn * 100).toFixed(1)}%
			</div>
		</div>
	</div>

	<!-- Esito -->
	{#if isFullyCovered}
		<Alert color="green">
			{#snippet icon()}
				<CheckCircleSolid class="w-5 h-5" />
			{/snippet}
			<span class="font-medium">Pensione INPS sufficiente.</span>
			La pensione stimata copre tutte le spese FIRE annue. Non e' necessario accumulare
			capitale aggiuntivo per la fase post-pensione.
		</Alert>
	{:else if coveragePercent >= 50}
		<Alert color="yellow">
			{#snippet icon()}
				<InfoCircleSolid class="w-5 h-5" />
			{/snippet}
			<span class="font-medium">Gap moderato.</span>
			La pensione copre circa la meta' del fabbisogno. Il capitale aggiuntivo puo' venire
			da fondo pensione complementare (deducibilita' fiscale fino a 5.300€/anno), portafoglio
			ETF o rendite passive (affitti).
		</Alert>
	{:else}
		<Alert color="red">
			{#snippet icon()}
				<ExclamationCircleSolid class="w-5 h-5" />
			{/snippet}
			<span class="font-medium">Gap significativo.</span>
			La pensione INPS copre meno della meta' delle spese FIRE. Oltre al fondo pensione,
			valuta di ridurre le spese target, posticipare l'uscita dal lavoro o incrementare
			l'aliquota di risparmio.
		</Alert>
	{/if}
</Card>
