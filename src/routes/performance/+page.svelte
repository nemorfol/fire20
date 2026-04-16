<script lang="ts">
	import { Heading, Breadcrumb, BreadcrumbItem, Card, ButtonGroup, Button } from 'flowbite-svelte';
	import { db, type PortfolioSnapshotRecord, type CashFlowRecord } from '$lib/db/index';
	import { liveQuery } from 'dexie';
	import type { PortfolioSnapshot, CashFlow } from '$lib/engine/twr-calculator';
	import SnapshotForm from '$lib/components/performance/SnapshotForm.svelte';
	import CashFlowForm from '$lib/components/performance/CashFlowForm.svelte';
	import PerformanceChart from '$lib/components/performance/PerformanceChart.svelte';
	import PerformanceMetrics from '$lib/components/performance/PerformanceMetrics.svelte';

	const profileId = 1;

	// Periodo selezionato
	let selectedPeriod = $state<'YTD' | '1A' | '3A' | '5A' | 'Max'>('Max');

	// Dati reattivi dal DB
	let allSnapshots = $state<PortfolioSnapshotRecord[]>([]);
	let allCashFlows = $state<CashFlowRecord[]>([]);
	let refreshKey = $state(0);

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		refreshKey;
		const subSnap = liveQuery(() =>
			db.portfolio_snapshots.where('profileId').equals(profileId).sortBy('date')
		).subscribe((result) => {
			allSnapshots = result;
		});
		const subCf = liveQuery(() =>
			db.cash_flows.where('profileId').equals(profileId).sortBy('date')
		).subscribe((result) => {
			allCashFlows = result;
		});
		return () => {
			subSnap.unsubscribe();
			subCf.unsubscribe();
		};
	});

	// Filtra per periodo
	function getPeriodStart(period: string): Date | null {
		const now = new Date();
		switch (period) {
			case 'YTD':
				return new Date(now.getFullYear(), 0, 1);
			case '1A':
				return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
			case '3A':
				return new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
			case '5A':
				return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
			default:
				return null;
		}
	}

	const filteredSnapshots = $derived.by((): PortfolioSnapshot[] => {
		const periodStart = getPeriodStart(selectedPeriod);
		const filtered = periodStart
			? allSnapshots.filter((s) => new Date(s.date).getTime() >= periodStart.getTime())
			: allSnapshots;

		return filtered.map((s) => ({
			date: new Date(s.date),
			totalValue: s.totalValue,
			allocation: s.allocation
		}));
	});

	const filteredCashFlows = $derived.by((): CashFlow[] => {
		const periodStart = getPeriodStart(selectedPeriod);
		const filtered = periodStart
			? allCashFlows.filter((cf) => new Date(cf.date).getTime() >= periodStart.getTime())
			: allCashFlows;

		return filtered.map((cf) => ({
			date: new Date(cf.date),
			amount: cf.amount,
			type: cf.type
		}));
	});

	function handleDataChanged() {
		refreshKey++;
	}

	const periods: { label: string; value: 'YTD' | '1A' | '3A' | '5A' | 'Max' }[] = [
		{ label: 'YTD', value: 'YTD' },
		{ label: '1A', value: '1A' },
		{ label: '3A', value: '3A' },
		{ label: '5A', value: '5A' },
		{ label: 'Max', value: 'Max' }
	];
</script>

<svelte:head>
	<title>Performance - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Performance</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Performance del Portafoglio</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-6">
	Traccia il rendimento reale del tuo portafoglio con il metodo TWR (Time-Weighted Return)
	e confrontalo con il benchmark S&P 500.
</p>

<!-- Metriche di Performance -->
<div class="mb-6">
	<PerformanceMetrics snapshots={filteredSnapshots} cashFlows={filteredCashFlows} />
</div>

<!-- Selettore periodo + Grafico -->
<Card class="max-w-none mb-6">
	<div class="flex items-center justify-between mb-4">
		<Heading tag="h3">Confronto con Benchmark</Heading>
		<ButtonGroup>
			{#each periods as p}
				<Button
					size="sm"
					color={selectedPeriod === p.value ? 'primary' : 'alternative'}
					onclick={() => (selectedPeriod = p.value)}
				>
					{p.label}
				</Button>
			{/each}
		</ButtonGroup>
	</div>
	<PerformanceChart snapshots={filteredSnapshots} cashFlows={filteredCashFlows} />
</Card>

<!-- Input sections side by side on larger screens -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<Card class="max-w-none">
		<SnapshotForm {profileId} onsnapshatsChanged={handleDataChanged} />
	</Card>
	<Card class="max-w-none">
		<CashFlowForm {profileId} onCashFlowsChanged={handleDataChanged} />
	</Card>
</div>
