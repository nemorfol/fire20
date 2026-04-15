<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Badge,
		Toggle
	} from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		ArrowRightOutline,
		BookOpenSolid
	} from 'flowbite-svelte-icons';
	import { getStepById, getAdjacentSteps, guideSteps } from '$lib/guida/steps';

	const STORAGE_KEY = 'fire-guida-completed';

	let stepId: string = $derived(page.params.step ?? '');
	let step = $derived(getStepById(stepId));
	let adjacent = $derived(getAdjacentSteps(stepId));
	let headings = $derived.by(() => {
		if (!step) return [];
		const regex = /<h3>(.*?)<\/h3>/g;
		const matches: string[] = [];
		let match;
		while ((match = regex.exec(step.content)) !== null) {
			matches.push(match[1]);
		}
		return matches;
	});

	let completedSteps = $state<Set<string>>(new Set());
	let isCompleted = $derived(stepId ? completedSteps.has(stepId) : false);

	onMount(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				completedSteps = new Set(JSON.parse(saved));
			}
		} catch {
			// ignore
		}
	});

	function toggleCompleted() {
		const updated = new Set(completedSteps);
		if (updated.has(stepId)) {
			updated.delete(stepId);
		} else {
			updated.add(stepId);
		}
		completedSteps = updated;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]));
		} catch {
			// ignore
		}
	}

	function scrollToHeading(text: string) {
		const contentEl = document.querySelector('.guide-content');
		if (!contentEl) return;
		const headings = contentEl.querySelectorAll('h3');
		for (const h of headings) {
			if (h.textContent?.trim() === text) {
				h.scrollIntoView({ behavior: 'smooth', block: 'start' });
				break;
			}
		}
	}
</script>

<svelte:head>
	{#if step}
		<title>{step.title} - Guida - FIRE Planner</title>
	{:else}
		<title>Passo non trovato - Guida - FIRE Planner</title>
	{/if}
</svelte:head>

{#if !step}
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
		<BreadcrumbItem href="/guida/">Guida</BreadcrumbItem>
		<BreadcrumbItem>Non trovato</BreadcrumbItem>
	</Breadcrumb>
	<div class="text-center py-12">
		<p class="text-xl text-gray-500 dark:text-gray-400 mb-4">Passo non trovato</p>
		<Button href="/guida/">Torna alla Guida</Button>
	</div>
{:else}
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
		<BreadcrumbItem href="/guida/">Guida</BreadcrumbItem>
		<BreadcrumbItem>{step.title}</BreadcrumbItem>
	</Breadcrumb>

	<!-- Step progress indicator -->
	<div class="flex items-center gap-2 mb-4">
		<div class="flex gap-1">
			{#each guideSteps as s}
				<a
					href="/guida/{s.id}/"
					class="w-3 h-3 rounded-full transition-colors {s.id === stepId
						? 'bg-primary-600 dark:bg-primary-400 ring-2 ring-primary-300 dark:ring-primary-600'
						: completedSteps.has(s.id)
							? 'bg-green-400 dark:bg-green-600'
							: 'bg-gray-200 dark:bg-gray-700'}"
					title="{s.number}. {s.title}"
				></a>
			{/each}
		</div>
		<span class="text-sm text-gray-500 dark:text-gray-400">
			Passo {step.number} di {guideSteps.length}
		</span>
	</div>

	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
		<div class="flex items-center gap-3">
			<span class="text-3xl">{step.icon}</span>
			<div>
				<Badge color="gray" class="mb-1">{step.category}</Badge>
				<Heading tag="h1" class="text-2xl">{step.title}</Heading>
			</div>
		</div>
		<div class="flex items-center gap-3">
			<Toggle checked={isCompleted} onchange={toggleCompleted} color="green">
				{isCompleted ? 'Completato' : 'Segna come completato'}
			</Toggle>
		</div>
	</div>

	<!-- Main layout: content + sidebar TOC -->
	<div class="flex gap-8">
		<!-- Content -->
		<div class="flex-1 min-w-0">
			<div
				class="guide-content prose prose-gray dark:prose-invert max-w-none
					prose-h3:text-lg prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-3
					prose-p:mb-4 prose-p:leading-relaxed
					prose-ul:mb-4 prose-li:mb-1
					prose-strong:text-gray-900 dark:prose-strong:text-white"
			>
				{@html step.content}
			</div>

			<!-- App link -->
			{#if step.appLink}
				<div
					class="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
				>
					<BookOpenSolid class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
					<div class="flex-1">
						<p class="text-sm font-medium text-primary-800 dark:text-primary-200">
							Metti in pratica quanto appreso
						</p>
						<p class="text-sm text-primary-600 dark:text-primary-400">
							Usa la sezione dedicata dell'app per applicare questi concetti al tuo piano.
						</p>
					</div>
					<Button href={step.appLink} color="blue" size="sm">
						{step.appLinkLabel ?? 'Vai alla sezione'}
					</Button>
				</div>
			{/if}

			<!-- Navigation -->
			<div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
				{#if adjacent.prev}
					<a
						href="/guida/{adjacent.prev.id}/"
						class="flex items-center gap-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
					>
						<ArrowLeftOutline class="w-4 h-4" />
						<div class="text-left">
							<div class="text-xs text-gray-500 dark:text-gray-400">Precedente</div>
							<div class="text-sm font-medium">{adjacent.prev.title}</div>
						</div>
					</a>
				{:else}
					<span></span>
				{/if}
				{#if adjacent.next}
					<a
						href="/guida/{adjacent.next.id}/"
						class="flex items-center gap-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors text-right"
					>
						<div>
							<div class="text-xs text-gray-500 dark:text-gray-400">Successivo</div>
							<div class="text-sm font-medium">{adjacent.next.title}</div>
						</div>
						<ArrowRightOutline class="w-4 h-4" />
					</a>
				{:else}
					<a
						href="/guida/"
						class="flex items-center gap-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
					>
						<div class="text-sm font-medium">Torna all'indice</div>
						<ArrowRightOutline class="w-4 h-4" />
					</a>
				{/if}
			</div>
		</div>

		<!-- Sidebar TOC (desktop only) -->
		{#if headings.length > 0}
			<aside class="hidden lg:block w-64 flex-shrink-0">
				<div class="sticky top-4">
					<h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
						In questa pagina
					</h4>
					<nav class="space-y-1">
						{#each headings as heading}
							<button
								class="block w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 py-1 px-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 truncate"
								onclick={() => scrollToHeading(heading)}
								title={heading}
							>
								{heading}
							</button>
						{/each}
					</nav>

					<!-- Quick step list -->
					<div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
						<h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
							Tutti i passi
						</h4>
						<nav class="space-y-0.5 max-h-64 overflow-y-auto">
							{#each guideSteps as s}
								<a
									href="/guida/{s.id}/"
									class="block text-xs py-1 px-2 rounded truncate transition-colors
										{s.id === stepId
										? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-medium'
										: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}"
									title="{s.number}. {s.title}"
								>
									{s.number}. {s.title}
								</a>
							{/each}
						</nav>
					</div>
				</div>
			</aside>
		{/if}
	</div>
{/if}

<style>
	:global(.guide-content .tip) {
		background-color: rgb(219 234 254);
		border-left: 4px solid rgb(59 130 246);
		padding: 1rem 1.25rem;
		border-radius: 0 0.5rem 0.5rem 0;
		margin: 1.5rem 0;
	}
	:global(.dark .guide-content .tip) {
		background-color: rgb(30 58 138 / 0.3);
		border-left-color: rgb(96 165 250);
	}

	:global(.guide-content .example) {
		background-color: rgb(243 244 246);
		border-left: 4px solid rgb(107 114 128);
		padding: 1rem 1.25rem;
		border-radius: 0 0.5rem 0.5rem 0;
		margin: 1.5rem 0;
		font-size: 0.925rem;
	}
	:global(.dark .guide-content .example) {
		background-color: rgb(55 65 81 / 0.4);
		border-left-color: rgb(156 163 175);
	}

	:global(.guide-content .warning) {
		background-color: rgb(254 243 199);
		border-left: 4px solid rgb(245 158 11);
		padding: 1rem 1.25rem;
		border-radius: 0 0.5rem 0.5rem 0;
		margin: 1.5rem 0;
	}
	:global(.dark .guide-content .warning) {
		background-color: rgb(120 53 15 / 0.3);
		border-left-color: rgb(251 191 36);
	}

	:global(.guide-content h3) {
		color: rgb(17 24 39);
		font-size: 1.125rem;
		font-weight: 700;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
	}
	:global(.dark .guide-content h3) {
		color: rgb(243 244 246);
	}

	:global(.guide-content p) {
		margin-bottom: 1rem;
		line-height: 1.75;
		color: rgb(55 65 81);
	}
	:global(.dark .guide-content p) {
		color: rgb(209 213 219);
	}

	:global(.guide-content ul, .guide-content ol) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}
	:global(.guide-content ul) {
		list-style-type: disc;
	}
	:global(.guide-content ol) {
		list-style-type: decimal;
	}
	:global(.guide-content li) {
		margin-bottom: 0.375rem;
		line-height: 1.625;
		color: rgb(55 65 81);
	}
	:global(.dark .guide-content li) {
		color: rgb(209 213 219);
	}

	:global(.guide-content strong) {
		color: rgb(17 24 39);
		font-weight: 600;
	}
	:global(.dark .guide-content strong) {
		color: rgb(243 244 246);
	}
</style>
