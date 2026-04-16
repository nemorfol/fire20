<script lang="ts">
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Alert,
		Tabs,
		TabItem
	} from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';

	import PayoutSimulator from '$lib/components/fondo-pensione/PayoutSimulator.svelte';
	import RITACalculator from '$lib/components/fondo-pensione/RITACalculator.svelte';
	import RiscattoLaurea from '$lib/components/fondo-pensione/RiscattoLaurea.svelte';
	import ContributionOptimizer from '$lib/components/fondo-pensione/ContributionOptimizer.svelte';
</script>

<div class="max-w-7xl mx-auto">
	<!-- Breadcrumb -->
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
		<BreadcrumbItem>Fondo Pensione</BreadcrumbItem>
	</Breadcrumb>

	<!-- Titolo -->
	<Heading tag="h1" class="mb-2">Gestione Fondo Pensione</Heading>
	<p class="text-gray-500 dark:text-gray-400 mb-6">
		Analisi completa del fondo pensione complementare con le nuove regole della
		Legge di Bilancio 2026 (in vigore dal 1 luglio 2026).
	</p>

	<!-- Panoramica Riforma 2026 -->
	<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
		<div class="flex items-center gap-3 mb-4">
			<div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
				<InfoCircleSolid class="w-6 h-6 text-primary-600 dark:text-primary-400" />
			</div>
			<div>
				<h2 class="text-xl font-bold text-gray-900 dark:text-white">Riforma 2026: Cosa Cambia</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">Legge di Bilancio 2026 - In vigore dal 1 luglio 2026</p>
			</div>
		</div>

		<!-- Le 5 strategie di erogazione -->
		<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">5 Modalita' di Erogazione</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
			<!-- Rendita Vitalizia -->
			<div class="flex gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
				<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-purple-200 dark:bg-purple-800 rounded-lg text-lg">&#9854;</div>
				<div>
					<h4 class="font-semibold text-purple-700 dark:text-purple-300">Rendita Vitalizia</h4>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Assegno mensile a vita. Capitale trasferito alla compagnia assicurativa. Tassazione <strong>15% → 9%</strong>.</p>
				</div>
			</div>
			<!-- Rendita a Durata Definita -->
			<div class="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
				<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-200 dark:bg-blue-800 rounded-lg text-lg">&#128197;</div>
				<div>
					<div class="flex items-center gap-2">
						<h4 class="font-semibold text-blue-700 dark:text-blue-300">Rendita a Durata Definita</h4>
						<span class="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Nuovo</span>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Il capitale resta nel fondo e genera rendimenti. Rata ricalcolata ogni anno su aspettativa di vita ISTAT. <strong>Eredi ricevono il residuo</strong>. Tax: <strong>15% → 9%</strong>.</p>
				</div>
			</div>
			<!-- Prelievi Liberi -->
			<div class="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
				<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-green-200 dark:bg-green-800 rounded-lg text-lg">&#128176;</div>
				<div>
					<div class="flex items-center gap-2">
						<h4 class="font-semibold text-green-700 dark:text-green-300">Prelievi Liberi</h4>
						<span class="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Nuovo</span>
						<span class="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold uppercase">Ideale FIRE</span>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Massima flessibilita': prelevi quando vuoi, quanto vuoi. Tetto = rendita virtuale maturata. Tax: <strong>15% → 9%</strong>.</p>
				</div>
			</div>
			<!-- Erogazione Frazionata -->
			<div class="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
				<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-red-200 dark:bg-red-800 rounded-lg text-lg">&#128467;</div>
				<div>
					<div class="flex items-center gap-2">
						<h4 class="font-semibold text-red-700 dark:text-red-300">Erogazione Frazionata</h4>
						<span class="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Nuovo</span>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Rate fisse su minimo 5 anni. Tassazione piu' alta: <strong>20% → 15%</strong> (-0.25%/anno). Meno vantaggiosa.</p>
				</div>
			</div>
		</div>

		<!-- Altre novita' -->
		<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Altre Novita' 2026</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div class="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
				<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-yellow-200 dark:bg-yellow-800 rounded-lg text-lg">&#128184;</div>
				<div>
					<h4 class="font-semibold text-yellow-700 dark:text-yellow-300">Capitale fino al 60%</h4>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Limite alzato dal 50% al 60%. Il resto in rendita. 100% capitale se la rendita e' sotto soglia (~267 EUR/mese).</p>
				</div>
			</div>
			<div class="flex gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-xl">
				<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-lg text-lg">&#128200;</div>
				<div>
					<h4 class="font-semibold text-gray-700 dark:text-gray-300">Deducibilita' Aumentata</h4>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Ordinaria: <strong>5.300 EUR/anno</strong>. Extra post-2007: <strong>+2.650 EUR</strong> (totale max 7.950 EUR).</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Tabs con le sezioni -->
	<Tabs
		tabStyle="underline"
		contentClass="mt-4"
	>
		<TabItem open title="Simulatore Prestazioni">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Confronta le 5 modalita' di erogazione del fondo pensione e scopri quale conviene
				di piu' nella tua situazione. Inserisci i tuoi dati e premi "Confronta".
			</p>
			<PayoutSimulator />
		</TabItem>

		<TabItem title="RITA">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				La RITA e' un reddito ponte tra il pensionamento FIRE e la pensione INPS.
				Verifica se sei idoneo e calcola quanto riceverai.
			</p>
			<RITACalculator />
		</TabItem>

		<TabItem title="Riscatto Laurea">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Valuta se conviene riscattare gli anni di laurea per anticipare la pensione
				e aumentare il montante contributivo.
			</p>
			<RiscattoLaurea />
		</TabItem>

		<TabItem title="Ottimizzatore Contributi">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Trova il livello ottimale di contribuzione al fondo pensione per massimizzare
				il risparmio fiscale e il montante alla pensione.
			</p>
			<ContributionOptimizer />
		</TabItem>
	</Tabs>
</div>
