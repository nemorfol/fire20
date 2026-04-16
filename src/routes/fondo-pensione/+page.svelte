<script lang="ts">
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Tabs,
		TabItem,
		Badge
	} from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';

	import PayoutSimulator from '$lib/components/fondo-pensione/PayoutSimulator.svelte';
	import RITACalculator from '$lib/components/fondo-pensione/RITACalculator.svelte';
	import RiscattoLaurea from '$lib/components/fondo-pensione/RiscattoLaurea.svelte';
	import ContributionOptimizer from '$lib/components/fondo-pensione/ContributionOptimizer.svelte';
</script>

<svelte:head>
	<title>Fondo Pensione - FIRE Planner</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
		<BreadcrumbItem>Fondo Pensione</BreadcrumbItem>
	</Breadcrumb>

	<div class="flex items-center gap-3 mb-4">
		<Heading tag="h1">Gestione Fondo Pensione</Heading>
		<Badge color="blue" large>Riforma 2026</Badge>
	</div>
	<p class="text-gray-500 dark:text-gray-400 mb-5">
		Analisi completa del fondo pensione complementare con le nuove regole della Legge di Bilancio 2026.
	</p>

	<!-- Tutto gestito a Tabs -->
	<Tabs tabStyle="pill" contentClass="mt-4">

		<!-- TAB 1: Panoramica Riforma -->
		<TabItem open title="Panoramica 2026">
			<div class="space-y-6">
				<!-- Intro -->
				<div class="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
					<InfoCircleSolid class="w-6 h-6 text-primary-500 shrink-0 mt-0.5" />
					<div>
						<p class="text-sm text-gray-700 dark:text-gray-300">
							La Legge di Bilancio 2026 (in vigore dal <strong>1 luglio 2026</strong>) introduce nuove modalita' di erogazione piu' flessibili.
							Prima esistevano solo rendita vitalizia e capitale (max 50%). Ora le opzioni sono <strong>5</strong>, con il capitale alzato al <strong>60%</strong>.
						</p>
					</div>
				</div>

				<!-- Le 5 strategie -->
				<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">5 Modalita' di Erogazione</h3>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div class="flex gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
						<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-purple-200 dark:bg-purple-800 rounded-lg text-lg">&#9854;</div>
						<div>
							<h4 class="font-semibold text-purple-700 dark:text-purple-300">Rendita Vitalizia</h4>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Assegno mensile a vita. Capitale trasferito all'assicurazione. Tax: <strong>15% → 9%</strong>.</p>
						</div>
					</div>
					<div class="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
						<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-200 dark:bg-blue-800 rounded-lg text-lg">&#128197;</div>
						<div>
							<div class="flex items-center gap-2 flex-wrap">
								<h4 class="font-semibold text-blue-700 dark:text-blue-300">Rendita a Durata Definita</h4>
								<Badge color="blue">Nuovo</Badge>
							</div>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Capitale resta nel fondo. Rata ricalcolata annualmente (ISTAT). <strong>Eredi ricevono il residuo</strong>. Tax: <strong>15% → 9%</strong>.</p>
						</div>
					</div>
					<div class="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
						<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-green-200 dark:bg-green-800 rounded-lg text-lg">&#128176;</div>
						<div>
							<div class="flex items-center gap-2 flex-wrap">
								<h4 class="font-semibold text-green-700 dark:text-green-300">Prelievi Liberi</h4>
								<Badge color="green">Nuovo</Badge>
								<Badge color="yellow">Ideale FIRE</Badge>
							</div>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Prelevi quando vuoi. Tetto = rendita virtuale maturata. Tax: <strong>15% → 9%</strong>.</p>
						</div>
					</div>
					<div class="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
						<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-red-200 dark:bg-red-800 rounded-lg text-lg">&#128467;</div>
						<div>
							<div class="flex items-center gap-2 flex-wrap">
								<h4 class="font-semibold text-red-700 dark:text-red-300">Erogazione Frazionata</h4>
								<Badge color="red">Nuovo</Badge>
							</div>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Rate fisse, min 5 anni. Tax piu' alta: <strong>20% → 15%</strong>. Meno vantaggiosa.</p>
						</div>
					</div>
				</div>

				<!-- Altre novita' -->
				<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Altre Novita'</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
						<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-yellow-200 dark:bg-yellow-800 rounded-lg text-lg">&#128184;</div>
						<div>
							<h4 class="font-semibold text-yellow-700 dark:text-yellow-300">Capitale fino al 60%</h4>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Era 50%, ora 60%. 100% capitale se rendita sotto ~267 EUR/mese.</p>
						</div>
					</div>
					<div class="flex gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-xl">
						<div class="shrink-0 w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-lg text-lg">&#128200;</div>
						<div>
							<h4 class="font-semibold text-gray-700 dark:text-gray-300">Deducibilita' Aumentata</h4>
							<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Ordinaria <strong>5.300 EUR</strong>. Extra post-2007: <strong>+2.650 EUR</strong> (max 7.950).</p>
						</div>
					</div>
				</div>
			</div>
		</TabItem>

		<!-- TAB 2: Simulatore Prestazioni -->
		<TabItem title="Simulatore Prestazioni">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Confronta le 5 modalita' di erogazione e scopri quale conviene nella tua situazione.
			</p>
			<PayoutSimulator />
		</TabItem>

		<!-- TAB 3: RITA -->
		<TabItem title="RITA">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				La RITA e' un reddito ponte tra il pensionamento FIRE e la pensione INPS.
			</p>
			<RITACalculator />
		</TabItem>

		<!-- TAB 4: Riscatto Laurea -->
		<TabItem title="Riscatto Laurea">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Valuta se conviene riscattare gli anni di laurea per anticipare la pensione.
			</p>
			<RiscattoLaurea />
		</TabItem>

		<!-- TAB 5: Ottimizzatore Contributi -->
		<TabItem title="Ottimizzatore Contributi">
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Trova il livello ottimale di contribuzione per massimizzare il risparmio fiscale.
			</p>
			<ContributionOptimizer />
		</TabItem>

	</Tabs>
</div>
