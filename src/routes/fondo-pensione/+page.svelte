<script lang="ts">
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Alert,
		Tabs,
		TabItem,
		Card
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
	<Card class="mb-6">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
			Riforma 2026: Cosa Cambia
		</h2>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
			La Legge di Bilancio 2026 introduce importanti novita' per i fondi pensione complementari,
			con nuove modalita' di erogazione piu' flessibili e vantaggiose.
		</p>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
			<div class="p-3 border border-purple-200 dark:border-purple-800 rounded-lg">
				<h3 class="font-semibold text-purple-700 dark:text-purple-400 mb-1">Rendita Vitalizia</h3>
				<p class="text-xs text-gray-600 dark:text-gray-400">
					Classica rendita a vita. Capitale trasferito alla compagnia assicurativa.
					Tassazione dal 15% al 9%.
				</p>
			</div>
			<div class="p-3 border border-blue-200 dark:border-blue-800 rounded-lg">
				<div class="flex items-center gap-1 mb-1">
					<h3 class="font-semibold text-blue-700 dark:text-blue-400">Rendita a Durata Definita</h3>
					<span class="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">NUOVO</span>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400">
					Il capitale resta nel fondo e genera rendimenti. Rata ricalcolata ogni anno.
					Gli eredi ricevono il capitale residuo.
				</p>
			</div>
			<div class="p-3 border border-green-200 dark:border-green-800 rounded-lg">
				<div class="flex items-center gap-1 mb-1">
					<h3 class="font-semibold text-green-700 dark:text-green-400">Prelievi Liberi</h3>
					<span class="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">NUOVO</span>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400">
					Massima flessibilita': prelevi quando vuoi. Tetto massimo cumulativo.
					Ideale per la strategia FIRE.
				</p>
			</div>
			<div class="p-3 border border-red-200 dark:border-red-800 rounded-lg">
				<div class="flex items-center gap-1 mb-1">
					<h3 class="font-semibold text-red-700 dark:text-red-400">Erogazione Frazionata</h3>
					<span class="text-[10px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold">NUOVO</span>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400">
					Rate fisse su minimo 5 anni. Tassazione piu' alta (20% base).
					Meno vantaggiosa delle altre opzioni.
				</p>
			</div>
			<div class="p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg">
				<h3 class="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Capitale (fino al 60%)</h3>
				<p class="text-xs text-gray-600 dark:text-gray-400">
					Limite alzato dal 50% al 60%. Il resto in rendita.
					100% in capitale se la rendita e' sotto soglia.
				</p>
			</div>
			<div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
				<h3 class="font-semibold text-gray-700 dark:text-gray-400 mb-1">Deducibilita' Aumentata</h3>
				<p class="text-xs text-gray-600 dark:text-gray-400">
					Limite ordinario portato a 5.300 EUR/anno (era 5.164,57 EUR).
					Extra fino a 2.650 EUR per lavoratori post-2007.
				</p>
			</div>
		</div>
	</Card>

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
