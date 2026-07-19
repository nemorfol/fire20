<script lang="ts">
	import { Heading, Breadcrumb, BreadcrumbItem, Tabs, TabItem, Badge } from 'flowbite-svelte';
	import { InfoCircleSolid } from 'flowbite-svelte-icons';

	import PayoutSimulator from '$lib/components/fondo-pensione/PayoutSimulator.svelte';
	import RITACalculator from '$lib/components/fondo-pensione/RITACalculator.svelte';
	import RiscattoLaurea from '$lib/components/fondo-pensione/RiscattoLaurea.svelte';
	import ContributionOptimizer from '$lib/components/fondo-pensione/ContributionOptimizer.svelte';
</script>

<svelte:head>
	<title>Fondo Pensione - FIRE Planner</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
		<BreadcrumbItem>Fondo Pensione</BreadcrumbItem>
	</Breadcrumb>

	<div class="mb-4 flex items-center gap-3">
		<Heading tag="h1">Gestione Fondo Pensione</Heading>
		<Badge color="blue" large>Riforma 2026</Badge>
	</div>
	<p class="mb-5 text-gray-500 dark:text-gray-400">
		Analisi completa del fondo pensione complementare con le nuove regole della Legge di Bilancio
		2026.
	</p>

	<!-- Tutto gestito a Tabs -->
	<Tabs tabStyle="pill" classes={{ content: 'mt-4' }}>
		<!-- TAB 1: Panoramica Riforma -->
		<TabItem open title="Panoramica 2026">
			<div class="space-y-6">
				<!-- Intro -->
				<div
					class="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 flex items-start gap-3 rounded-xl border p-4"
				>
					<InfoCircleSolid class="text-primary-500 mt-0.5 h-6 w-6 shrink-0" />
					<div>
						<p class="text-sm text-gray-700 dark:text-gray-300">
							La Legge di Bilancio 2026 (in vigore dal <strong>1 luglio 2026</strong>) introduce
							nuove modalita' di erogazione piu' flessibili. Prima esistevano solo rendita vitalizia
							e capitale (max 50%). Ora le opzioni sono <strong>5</strong>, con il capitale alzato
							al <strong>60%</strong>.
						</p>
					</div>
				</div>

				<!-- Le 5 strategie -->
				<h3 class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
					5 Modalita' di Erogazione
				</h3>
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div
						class="flex gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-200 text-lg dark:bg-purple-800"
						>
							&#9854;
						</div>
						<div>
							<h4 class="font-semibold text-purple-700 dark:text-purple-300">Rendita Vitalizia</h4>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Assegno mensile a vita. Capitale trasferito all'assicurazione. Tax: <strong
									>15% → 9%</strong
								>.
							</p>
						</div>
					</div>
					<div
						class="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-200 text-lg dark:bg-blue-800"
						>
							&#128197;
						</div>
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<h4 class="font-semibold text-blue-700 dark:text-blue-300">
									Rendita a Durata Definita
								</h4>
								<Badge color="blue">Nuovo</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Capitale resta nel fondo. Rata ricalcolata annualmente (ISTAT). <strong
									>Eredi ricevono il residuo</strong
								>. Tax: <strong>15% → 9%</strong>.
							</p>
						</div>
					</div>
					<div
						class="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-200 text-lg dark:bg-green-800"
						>
							&#128176;
						</div>
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<h4 class="font-semibold text-green-700 dark:text-green-300">Prelievi Liberi</h4>
								<Badge color="green">Nuovo</Badge>
								<Badge color="yellow">Ideale FIRE</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Prelevi quando vuoi. Tetto = rendita virtuale maturata. Tax: <strong
									>15% → 9%</strong
								>.
							</p>
						</div>
					</div>
					<div
						class="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-200 text-lg dark:bg-red-800"
						>
							&#128467;
						</div>
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<h4 class="font-semibold text-red-700 dark:text-red-300">Erogazione Frazionata</h4>
								<Badge color="red">Nuovo</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Rate fisse, min 5 anni. Tax piu' alta: <strong>20% → 15%</strong>. Meno vantaggiosa.
							</p>
						</div>
					</div>
				</div>

				<!-- Altre novita' -->
				<h3 class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Altre Novita'
				</h3>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div
						class="flex gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-200 text-lg dark:bg-yellow-800"
						>
							&#128184;
						</div>
						<div>
							<h4 class="font-semibold text-yellow-700 dark:text-yellow-300">
								Capitale fino al 60%
							</h4>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Era 50%, ora 60%. 100% capitale se rendita sotto ~267 EUR/mese.
							</p>
						</div>
					</div>
					<div
						class="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/30"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-lg dark:bg-gray-600"
						>
							&#128200;
						</div>
						<div>
							<h4 class="font-semibold text-gray-700 dark:text-gray-300">
								Deducibilita' Aumentata
							</h4>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Ordinaria <strong>5.300 EUR</strong>. Extra post-2007: <strong>+2.650 EUR</strong> (max
								7.950).
							</p>
						</div>
					</div>
				</div>
			</div>
		</TabItem>

		<!-- TAB 2: Simulatore Prestazioni -->
		<TabItem title="Simulatore Prestazioni">
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				Confronta le 5 modalita' di erogazione e scopri quale conviene nella tua situazione.
			</p>
			<PayoutSimulator />
		</TabItem>

		<!-- TAB 3: RITA -->
		<TabItem title="RITA">
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				La RITA e' un reddito ponte tra il pensionamento FIRE e la pensione INPS.
			</p>
			<RITACalculator />
		</TabItem>

		<!-- TAB 4: Riscatto Laurea -->
		<TabItem title="Riscatto Laurea">
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				Valuta se conviene riscattare gli anni di laurea per anticipare la pensione.
			</p>
			<RiscattoLaurea />
		</TabItem>

		<!-- TAB 5: Ottimizzatore Contributi -->
		<TabItem title="Ottimizzatore Contributi">
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				Trova il livello ottimale di contribuzione per massimizzare il risparmio fiscale.
			</p>
			<ContributionOptimizer />
		</TabItem>
	</Tabs>
</div>
