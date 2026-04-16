<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Card,
		Button,
		Progressbar,
		Badge,
		Input
	} from 'flowbite-svelte';
	import { SearchOutline } from 'flowbite-svelte-icons';
	import { guideSteps, categories, getStepsByCategory } from '$lib/guida/steps';

	const STORAGE_KEY = 'fire-guida-completed';

	let completedSteps = $state<Set<string>>(new Set());
	let searchQuery = $state('');
	let selectedCategory = $state<string | null>(null);

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

	let progressPercent = $derived(
		Math.round((completedSteps.size / guideSteps.length) * 100)
	);

	let filteredSteps = $derived.by(() => {
		let steps = guideSteps;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			steps = steps.filter(
				(s) =>
					s.title.toLowerCase().includes(q) ||
					s.summary.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q)
			);
		}
		if (selectedCategory) {
			steps = steps.filter((s) => s.category === selectedCategory);
		}
		return steps;
	});

	let groupedSteps = $derived.by(() => {
		const groups: { category: string; steps: typeof guideSteps }[] = [];
		for (const cat of categories) {
			const catSteps = filteredSteps.filter((s) => s.category === cat);
			if (catSteps.length > 0) {
				groups.push({ category: cat, steps: catSteps });
			}
		}
		return groups;
	});

	function toggleCategory(cat: string) {
		selectedCategory = selectedCategory === cat ? null : cat;
	}
</script>

<svelte:head>
	<title>Guida Interattiva - FIRE Planner</title>
	<meta
		name="description"
		content="Guida completa in 20 passi alla pianificazione FIRE per investitori italiani."
	/>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Guida</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Guida Interattiva</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-6">
	20 passi per raggiungere l'indipendenza finanziaria in Italia. Una guida completa che copre
	tutto: dai fondamenti del FIRE alla fiscalità italiana, dalle simulazioni alla checklist finale.
</p>

<!-- Progress -->
<div class="mb-6">
	<div class="flex items-center justify-between mb-2">
		<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
			Progresso: {completedSteps.size} di {guideSteps.length} completati
		</span>
		<span class="text-sm font-medium text-primary-600 dark:text-primary-400">
			{progressPercent}%
		</span>
	</div>
	<Progressbar progress={progressPercent} size="h-3" color="blue" />
</div>

<!-- Search & Filters -->
<div class="flex flex-col sm:flex-row gap-3 mb-6">
	<div class="relative flex-1">
		<div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
			<SearchOutline class="w-4 h-4 text-gray-500" />
		</div>
		<Input
			type="text"
			placeholder="Cerca nella guida..."
			class="ps-10"
			bind:value={searchQuery}
		/>
	</div>
	<div class="flex flex-wrap gap-2">
		{#each categories as cat}
			<button
				class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
					{selectedCategory === cat
					? 'bg-primary-600 text-white border-primary-600 dark:bg-primary-500 dark:border-primary-500'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'}"
				onclick={() => toggleCategory(cat)}
			>
				{cat}
			</button>
		{/each}
	</div>
</div>

<!-- Steps grouped by category -->
{#if filteredSteps.length === 0}
	<div class="text-center py-12">
		<p class="text-gray-500 dark:text-gray-400 text-lg">
			Nessun risultato per "{searchQuery}"
		</p>
		<Button color="alternative" class="mt-4" onclick={() => { searchQuery = ''; selectedCategory = null; }}>
			Cancella filtri
		</Button>
	</div>
{:else}
	{#each groupedSteps as group}
		<div class="mb-8">
			<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
				{#if group.category === 'Fondamenti'}
					<span>📚</span>
				{:else if group.category === 'Calcoli e Simulazioni'}
					<span>🔬</span>
				{:else if group.category === 'Fiscalità Italiana'}
					<span>🇮🇹</span>
				{:else if group.category === 'Strategie Avanzate'}
					<span>🎓</span>
				{:else}
					<span>🏁</span>
				{/if}
				{group.category}
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each group.steps as step}
					<a
						href="/guida/{step.id}/"
						class="block group"
					>
						<Card
							class="h-full transition-shadow hover:shadow-lg {completedSteps.has(step.id)
								? 'border-green-300 dark:border-green-700'
								: ''}"
						>
							<div class="flex items-start gap-3">
								<div
									class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
										{completedSteps.has(step.id)
										? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
										: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'}"
								>
									{#if completedSteps.has(step.id)}
										✓
									{:else}
										{step.number}
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="text-lg">{step.icon}</span>
										<h3
											class="text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate"
										>
											{step.title}
										</h3>
									</div>
									<p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
										{step.summary}
									</p>
									{#if step.appLink}
										<Badge color="blue" class="mt-2">Ha sezione nell'app</Badge>
									{/if}
								</div>
							</div>
						</Card>
					</a>
				{/each}
			</div>
		</div>
	{/each}
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
