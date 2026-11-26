<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		Sidebar,
		SidebarWrapper,
		SidebarGroup,
		SidebarItem,
		SidebarButton,
		Navbar,
		NavBrand,
		DarkMode
	} from 'flowbite-svelte';
	import {
		HomeSolid,
		UserSolid,
		ChartMixedDollarSolid,
		ChartPieSolid,
		FolderSolid,
		ShieldCheckSolid,
		FileChartBarSolid,
		BookOpenSolid,
		CogSolid,
		FireSolid,
		ChartLineUpOutline,
		UsersGroupSolid,
		BuildingSolid,
		LandmarkOutline,
		ScaleBalancedOutline,
		UsersOutline,
		MessagesSolid,
		FileLinesSolid
	} from 'flowbite-svelte-icons';
	import favicon from '$lib/assets/favicon.svg';
	import { t } from '$lib/i18n/store.svelte';
	import NotificationBanner from '$lib/components/shared/NotificationBanner.svelte';
	import {
		startReminderChecks,
		stopReminderChecks,
		getNotificationPermission
	} from '$lib/utils/notifications';

	let { children } = $props();

	let sidebarOpen = $state(false);

	onMount(() => {
		if (getNotificationPermission() === 'granted') {
			startReminderChecks();
		}
		return () => stopReminderChecks();
	});

	const iconClass = 'w-5 h-5 text-gray-500 dark:text-gray-400';

	// Voci di navigazione raggruppate in sezioni logiche (issue C5 — discoverability).
	// Le sezioni sono sempre visibili (non collassabili) e vivono dentro l'unico
	// contenitore scrollabile della Sidebar, cosi' lo scroll a viewport bassi resta
	// funzionante (invariante issue #32).
	type NavItem = { labelKey: string; href: string; icon: typeof HomeSolid };
	type NavSection = { titleKey: string; items: NavItem[] };
	const navSections: NavSection[] = [
		{
			titleKey: 'nav.section.plan',
			items: [
				{ labelKey: 'nav.dashboard', href: '/', icon: HomeSolid },
				{ labelKey: 'nav.profile', href: '/profilo/', icon: UserSolid },
				{ labelKey: 'nav.calculator', href: '/calcolatore/', icon: ChartMixedDollarSolid }
			]
		},
		{
			titleKey: 'nav.section.simulate',
			items: [
				{ labelKey: 'nav.simulation', href: '/simulazione/', icon: ChartPieSolid },
				{ labelKey: 'nav.scenarios', href: '/scenari/', icon: FolderSolid },
				{ labelKey: 'nav.risks', href: '/rischi/', icon: ShieldCheckSolid },
				{ labelKey: 'nav.profileCompare', href: '/confronto-profili/', icon: UsersOutline }
			]
		},
		{
			titleKey: 'nav.section.taxPension',
			items: [
				{ labelKey: 'nav.containers', href: '/contenitori/', icon: ScaleBalancedOutline },
				{ labelKey: 'nav.pensionFund', href: '/fondo-pensione/', icon: BuildingSolid },
				{ labelKey: 'nav.inpsPension', href: '/pensione/', icon: LandmarkOutline }
			]
		},
		{
			titleKey: 'nav.section.tools',
			items: [
				{ labelKey: 'nav.performance', href: '/performance/', icon: ChartLineUpOutline },
				{ labelKey: 'nav.history', href: '/dati-storici/', icon: FileChartBarSolid },
				{ labelKey: 'nav.community', href: '/community/', icon: UsersGroupSolid },
				{ labelKey: 'nav.settings', href: '/impostazioni/', icon: CogSolid }
			]
		},
		{
			titleKey: 'nav.section.help',
			items: [
				{ labelKey: 'nav.guide', href: '/guida/', icon: BookOpenSolid },
				{ labelKey: 'nav.assistant', href: '/assistente/', icon: MessagesSolid },
				{ labelKey: 'nav.methodology', href: '/metodologia/', icon: FileLinesSolid }
			]
		}
	];

	function isActive(itemHref: string): boolean {
		const path = page.url.pathname;
		if (itemHref === '/') return path === '/';
		return path.startsWith(itemHref);
	}

	// Titolo per-pagina (browser tab + crawler che eseguono JS). I default OG e
	// la description statica vivono in app.html (per unfurler/no-JS, dato che
	// ssr=false). Qui niente OG per non duplicare i tag a runtime.
	const SITE_NAME = 'FIRE Planner';
	const seoByPath: Record<string, { title: string; description: string }> = {
		'/': {
			title: "FIRE Planner — Indipendenza finanziaria con fiscalita' italiana",
			description:
				'Pianificatore FIRE gratuito e privato per il contesto fiscale e previdenziale italiano.'
		},
		'/profilo': {
			title: 'Profilo finanziario — FIRE Planner',
			description:
				'Inserisci reddito, spese, patrimonio e pensione per calcolare il tuo percorso FIRE.'
		},
		'/calcolatore': {
			title: 'Calcolatore FIRE — FIRE Planner',
			description:
				'FIRE number, Coast FIRE, anni al FIRE e strategie di prelievo (4%, VPW, Guyton-Klinger, CAPE).'
		},
		'/simulazione': {
			title: 'Simulazione Monte Carlo — FIRE Planner',
			description:
				'Migliaia di simulazioni con dati storici reali e tasso di successo del piano FIRE.'
		},
		'/scenari': {
			title: 'Scenari — FIRE Planner',
			description: 'Crea e confronta scenari FIRE con parametri diversi.'
		},
		'/rischi': {
			title: 'Scenari di rischio (stress test) — FIRE Planner',
			description: "Metti alla prova il piano: crash, inflazione, sequenza rendimenti, longevita'."
		},
		'/dati-storici': {
			title: 'Dati storici dei mercati — FIRE Planner',
			description: 'Rendimenti, correlazioni e CAPE dal 1928 a oggi.'
		},
		'/pensione': {
			title: 'Pensione INPS — FIRE Planner',
			description: 'Stima della pensione contributiva e del gap pensionistico.'
		},
		'/fondo-pensione': {
			title: 'Fondo pensione e TFR — FIRE Planner',
			description: "Deducibilita', tassazione agevolata e rendita del fondo pensione."
		},
		'/contenitori': {
			title: 'Confronto contenitori fiscali — FIRE Planner',
			description: 'Conto titoli, fondo pensione, BTP: quale conviene per il decumulo.'
		},
		'/confronto-profili': {
			title: 'Confronto profili — FIRE Planner',
			description: 'Confronta piani e profili FIRE affiancati.'
		},
		'/performance': {
			title: 'Performance del portafoglio — FIRE Planner',
			description: 'Rendimento time-weighted e confronto col benchmark.'
		},
		'/guida': {
			title: 'Guida al FIRE in Italia — FIRE Planner',
			description: "Guida completa al FIRE con focus su fiscalita' e previdenza italiana."
		},
		'/impostazioni': {
			title: 'Impostazioni — FIRE Planner',
			description: 'Import/export, lingua, valuta, assistente AI e backup.'
		},
		'/community': {
			title: 'Benchmark e condivisione — FIRE Planner',
			description: 'Confronta il tuo piano tramite scenari condivisi via link.'
		}
	};
	const seo = $derived(seoByPath[page.url.pathname] ?? { title: SITE_NAME, description: '' });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{seo.title}</title>
</svelte:head>

<div class="flex h-screen flex-col">
	<!-- Top Navbar -->
	<Navbar class="z-30 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center gap-2">
			<SidebarButton onclick={() => (sidebarOpen = !sidebarOpen)} />
			<NavBrand href="/">
				<FireSolid class="text-primary-600 dark:text-primary-400 me-2 h-6 w-6" />
				<span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
					FIRE Planner
				</span>
			</NavBrand>
		</div>
		<div class="flex items-center gap-2">
			<DarkMode ariaLabel="Cambia tema chiaro/scuro" />
		</div>
	</Navbar>

	<!-- Sidebar + Content -->
	<div class="flex flex-1 overflow-hidden">
		<Sidebar
			isOpen={sidebarOpen}
			closeSidebar={() => (sidebarOpen = false)}
			activeUrl={page.url.pathname}
			class="top-16 z-20"
			divClass="max-h-[calc(100dvh-4rem)]"
		>
			<SidebarWrapper class="py-2">
				{#each navSections as section, i (section.titleKey)}
					<div class={i > 0 ? 'mt-3 border-t border-gray-200 pt-3 dark:border-gray-700' : ''}>
						<h3
							class="mb-1 px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500"
						>
							{t(section.titleKey)}
						</h3>
						<SidebarGroup>
							{#each section.items as item (item.href)}
								{@const Icon = item.icon}
								<SidebarItem
									label={t(item.labelKey)}
									href={item.href}
									active={isActive(item.href)}
									onclick={() => (sidebarOpen = false)}
								>
									{#snippet icon()}<Icon class={iconClass} />{/snippet}
								</SidebarItem>
							{/each}
						</SidebarGroup>
					</div>
				{/each}
			</SidebarWrapper>
		</Sidebar>

		<!-- Main Content Area -->
		<main class="flex-1 overflow-y-auto p-4 md:ml-64 md:p-6">
			<NotificationBanner />
			<!-- Error boundary: un errore in una sezione non deve azzerare l'intera app.
			     I dati restano in IndexedDB (sul dispositivo), quindi e' sicuro riprovare. -->
			<svelte:boundary>
				{@render children()}
				{#snippet failed(error, reset)}
					<div
						class="mx-auto mt-8 max-w-2xl rounded-lg border border-red-300 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950"
					>
						<h2 class="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
							Si è verificato un errore in questa sezione
						</h2>
						<p class="mb-4 text-sm text-red-700 dark:text-red-300">
							I tuoi dati sono al sicuro (restano nel browser). Puoi riprovare oppure ricaricare la
							pagina.
						</p>
						<p class="mb-4 text-xs break-words text-gray-500 dark:text-gray-400">
							{error instanceof Error ? error.message : String(error)}
						</p>
						<button
							class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
							onclick={reset}
						>
							Riprova
						</button>
					</div>
				{/snippet}
			</svelte:boundary>
		</main>
	</div>
</div>
