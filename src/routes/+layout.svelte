<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
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
		ChartLineUpOutline
	} from 'flowbite-svelte-icons';
	import favicon from '$lib/assets/favicon.svg';
	import { t } from '$lib/i18n/store.svelte';

	let { children } = $props();

	let sidebarOpen = $state(false);

	const iconClass = 'w-5 h-5 text-gray-500 dark:text-gray-400';

	function isActive(itemHref: string): boolean {
		const path = page.url.pathname;
		if (itemHref === '/') return path === '/';
		return path.startsWith(itemHref);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>FIRE Planner</title>
</svelte:head>

<div class="flex flex-col h-screen">
	<!-- Top Navbar -->
	<Navbar class="border-b border-gray-200 dark:border-gray-700 z-30">
		<div class="flex items-center gap-2">
			<SidebarButton onclick={() => (sidebarOpen = !sidebarOpen)} />
			<NavBrand href="/">
				<FireSolid class="w-6 h-6 text-primary-600 dark:text-primary-400 me-2" />
				<span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
					FIRE Planner
				</span>
			</NavBrand>
		</div>
		<div class="flex items-center gap-2">
			<DarkMode />
		</div>
	</Navbar>

	<!-- Sidebar + Content -->
	<div class="flex flex-1 overflow-hidden">
		<Sidebar
			isOpen={sidebarOpen}
			closeSidebar={() => (sidebarOpen = false)}
			activeUrl={page.url.pathname}
			class="z-20"
		>
			<SidebarWrapper class="py-2">
				<SidebarGroup>
					<SidebarItem label={t('nav.dashboard')} href="/" active={isActive('/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<HomeSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.profile')} href="/profilo/" active={isActive('/profilo/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<UserSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.calculator')} href="/calcolatore/" active={isActive('/calcolatore/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<ChartMixedDollarSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.simulation')} href="/simulazione/" active={isActive('/simulazione/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<ChartPieSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.scenarios')} href="/scenari/" active={isActive('/scenari/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<FolderSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.risks')} href="/rischi/" active={isActive('/rischi/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<ShieldCheckSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.performance')} href="/performance/" active={isActive('/performance/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<ChartLineUpOutline class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.history')} href="/dati-storici/" active={isActive('/dati-storici/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<FileChartBarSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.guide')} href="/guida/" active={isActive('/guida/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<BookOpenSolid class={iconClass} />{/snippet}
					</SidebarItem>
					<SidebarItem label={t('nav.settings')} href="/impostazioni/" active={isActive('/impostazioni/')} onclick={() => (sidebarOpen = false)}>
						{#snippet icon()}<CogSolid class={iconClass} />{/snippet}
					</SidebarItem>
				</SidebarGroup>
			</SidebarWrapper>
		</Sidebar>

		<!-- Main Content Area -->
		<main class="flex-1 overflow-y-auto p-4 md:p-6 md:ml-64">
			{@render children()}
		</main>
	</div>
</div>
