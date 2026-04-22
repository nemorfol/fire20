<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Heading,
		Breadcrumb,
		BreadcrumbItem,
		Alert,
		Spinner,
		Card,
		Label,
		Select,
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Badge
	} from 'flowbite-svelte';
	import {
		ExclamationCircleOutline,
		ArrowRightOutline,
		UsersGroupOutline
	} from 'flowbite-svelte-icons';
	import type { Profile } from '$lib/db/index';
	import { getAllProfiles } from '$lib/db/profiles';
	import {
		calculateFireNumber,
		calculateFireNumberWithPension,
		calculateYearsToFire,
		calculateSavingsRate,
		calculateNetWorth,
		calculateLiquidNetWorth,
		calculateIlliquidNetWorth,
		projectPortfolio,
		type ProjectionParams,
		type YearlyProjection
	} from '$lib/engine/fire-calculator';
	import { childTotalRemainingCost } from '$lib/engine/family';
	import EChart from '$lib/components/simulazione/EChart.svelte';
	import { formatCurrency, formatCompact, formatPercent } from '$lib/utils/format';

	// === Stato ===
	let loading = $state(true);
	let profiles = $state<Profile[]>([]);

	// Id dei profili selezionati (A e B)
	let selectedIdA = $state<number | undefined>(undefined);
	let selectedIdB = $state<number | undefined>(undefined);

	let currentYear = new Date().getFullYear();

	// Profili derivati dalla selezione
	let profileA = $derived(profiles.find((p) => p.id === selectedIdA));
	let profileB = $derived(profiles.find((p) => p.id === selectedIdB));

	// Opzioni Select (flowbite-svelte richiede {value, name})
	let profileOptions = $derived(
		profiles.map((p) => ({ value: p.id, name: p.name || `Profilo ${p.id}` }))
	);

	// === Helper: costruisce ProjectionParams per un profilo ===
	function buildProjectionParams(p: Profile): ProjectionParams {
		const totalContributions = Object.values(p.monthlyContributions).reduce(
			(s, v) => s + (v || 0),
			0
		);
		return {
			initialPortfolio: calculateLiquidNetWorth(
				p.portfolio as unknown as Record<string, number>
			),
			annualContribution: totalContributions * 12,
			annualExpenses: p.fireExpenses,
			expectedReturn: p.simulation.expectedReturn,
			inflationRate: p.simulation.inflationRate,
			taxRate: 0.26,
			withdrawalRate: p.simulation.withdrawalRate,
			annualPension: (p.pension.estimatedMonthly || 0) * 13,
			pensionAge: p.pension.pensionAge,
			otherIncome: p.otherIncome,
			otherIncomeEndAge: p.otherIncomeEndAge ?? p.lifeExpectancy,
			currentAge: currentYear - p.birthYear,
			retirementAge: p.retirementAge,
			lifeExpectancy: p.lifeExpectancy,
			startYear: currentYear,
			children: p.children,
			mortgage: p.mortgage
		};
	}

	// === Metriche per singolo profilo ===
	type ProfileMetrics = {
		fireNumber: number;
		fireNumberClassic: number;
		netWorth: number;
		liquidNetWorth: number;
		illiquidNetWorth: number;
		yearsToFire: number;
		savingsRate: number;
		retirementAge: number;
		pensionAge: number;
		monthlyPension: number;
		childrenCount: number;
		childrenTotalCost: number;
		hasMortgage: boolean;
		mortgageBalance: number;
		annualExpenses: number;
		fireExpenses: number;
	};

	function computeMetrics(p: Profile): ProfileMetrics {
		const port = p.portfolio as unknown as Record<string, number>;
		const liquid = calculateLiquidNetWorth(port);
		const swr = p.simulation.withdrawalRate || 0.04;
		const expectedReturn = p.simulation.expectedReturn || 0.07;
		const inflationRate = p.simulation.inflationRate || 0.02;
		const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;
		const annualPension = (p.pension.estimatedMonthly || 0) * 13;
		const currentAge = currentYear - p.birthYear;

		const fireNumber = calculateFireNumberWithPension({
			annualExpenses: p.fireExpenses,
			withdrawalRate: swr,
			annualPension,
			retirementAge: p.retirementAge,
			pensionAge: p.pension.pensionAge,
			lifeExpectancy: p.lifeExpectancy,
			realReturn,
			otherIncome: p.otherIncome,
			otherIncomeEndAge: p.otherIncomeEndAge ?? p.lifeExpectancy,
			children: p.children,
			mortgage: p.mortgage,
			baseYear: currentYear,
			currentAge
		});

		const totalContributions = Object.values(p.monthlyContributions).reduce(
			(s, v) => s + (v || 0),
			0
		);
		const annualSavings = totalContributions * 12;

		const yearsToFire = calculateYearsToFire(
			liquid,
			annualSavings,
			expectedReturn,
			fireNumber,
			inflationRate
		);

		const income = (p.annualIncome || 0) + (p.otherIncome || 0);
		const savingsRate = calculateSavingsRate(income, p.annualExpenses);

		const childrenCount = p.children?.length ?? 0;
		const childrenTotalCost =
			p.children?.reduce((s, c) => s + childTotalRemainingCost(c, currentYear), 0) ?? 0;

		return {
			fireNumber,
			fireNumberClassic: calculateFireNumber(p.fireExpenses, swr),
			netWorth: calculateNetWorth(port),
			liquidNetWorth: liquid,
			illiquidNetWorth: calculateIlliquidNetWorth(port),
			yearsToFire,
			savingsRate,
			retirementAge: p.retirementAge,
			pensionAge: p.pension.pensionAge,
			monthlyPension: p.pension.estimatedMonthly || 0,
			childrenCount,
			childrenTotalCost,
			hasMortgage: !!p.mortgage,
			mortgageBalance: p.mortgage?.balance ?? 0,
			annualExpenses: p.annualExpenses,
			fireExpenses: p.fireExpenses
		};
	}

	let metricsA = $derived(profileA ? computeMetrics(profileA) : undefined);
	let metricsB = $derived(profileB ? computeMetrics(profileB) : undefined);

	// === Proiezioni per il grafico overlay ===
	let projectionsA = $derived<YearlyProjection[]>(
		profileA ? projectPortfolio(buildProjectionParams(profileA)) : []
	);
	let projectionsB = $derived<YearlyProjection[]>(
		profileB ? projectPortfolio(buildProjectionParams(profileB)) : []
	);

	// === Definizione righe della tabella confronto ===
	// direction: 'higher-better' | 'lower-better' | 'neutral'
	// format: come formattare i valori numerici per la UI
	type Direction = 'higher-better' | 'lower-better' | 'neutral';
	type Row = {
		label: string;
		valueA: number | string | boolean;
		valueB: number | string | boolean;
		direction: Direction;
		format: 'currency' | 'years' | 'percent' | 'count' | 'boolean' | 'age' | 'monthly';
	};

	let rows = $derived<Row[]>(
		metricsA && metricsB
			? [
					{
						label: 'FIRE Number',
						valueA: metricsA.fireNumber,
						valueB: metricsB.fireNumber,
						direction: 'lower-better',
						format: 'currency'
					},
					{
						label: 'FIRE Number classico (4%)',
						valueA: metricsA.fireNumberClassic,
						valueB: metricsB.fireNumberClassic,
						direction: 'lower-better',
						format: 'currency'
					},
					{
						label: 'Patrimonio netto totale',
						valueA: metricsA.netWorth,
						valueB: metricsB.netWorth,
						direction: 'higher-better',
						format: 'currency'
					},
					{
						label: 'Patrimonio liquido',
						valueA: metricsA.liquidNetWorth,
						valueB: metricsB.liquidNetWorth,
						direction: 'higher-better',
						format: 'currency'
					},
					{
						label: 'Patrimonio illiquido',
						valueA: metricsA.illiquidNetWorth,
						valueB: metricsB.illiquidNetWorth,
						direction: 'neutral',
						format: 'currency'
					},
					{
						label: 'Anni al FIRE',
						valueA: metricsA.yearsToFire,
						valueB: metricsB.yearsToFire,
						direction: 'lower-better',
						format: 'years'
					},
					{
						label: 'Tasso di risparmio',
						valueA: metricsA.savingsRate,
						valueB: metricsB.savingsRate,
						direction: 'higher-better',
						format: 'percent'
					},
					{
						label: 'Eta FIRE target',
						valueA: metricsA.retirementAge,
						valueB: metricsB.retirementAge,
						direction: 'lower-better',
						format: 'age'
					},
					{
						label: 'Eta pensione INPS',
						valueA: metricsA.pensionAge,
						valueB: metricsB.pensionAge,
						direction: 'neutral',
						format: 'age'
					},
					{
						label: 'Pensione INPS stimata mensile',
						valueA: metricsA.monthlyPension,
						valueB: metricsB.monthlyPension,
						direction: 'higher-better',
						format: 'monthly'
					},
					{
						label: 'Numero di figli',
						valueA: metricsA.childrenCount,
						valueB: metricsB.childrenCount,
						direction: 'neutral',
						format: 'count'
					},
					{
						label: 'Costo totale figli',
						valueA: metricsA.childrenTotalCost,
						valueB: metricsB.childrenTotalCost,
						direction: 'lower-better',
						format: 'currency'
					},
					{
						label: 'Mutuo attivo',
						valueA: metricsA.hasMortgage,
						valueB: metricsB.hasMortgage,
						direction: 'neutral',
						format: 'boolean'
					},
					{
						label: 'Capitale residuo mutuo',
						valueA: metricsA.mortgageBalance,
						valueB: metricsB.mortgageBalance,
						direction: 'lower-better',
						format: 'currency'
					},
					{
						label: 'Spese annuali',
						valueA: metricsA.annualExpenses,
						valueB: metricsB.annualExpenses,
						direction: 'lower-better',
						format: 'currency'
					},
					{
						label: 'Spese in FIRE',
						valueA: metricsA.fireExpenses,
						valueB: metricsB.fireExpenses,
						direction: 'lower-better',
						format: 'currency'
					}
				]
			: []
	);

	// === Formattazione cella ===
	function formatValue(v: number | string | boolean, fmt: Row['format']): string {
		if (typeof v === 'boolean') return v ? 'Si' : 'No';
		if (typeof v === 'string') return v;
		switch (fmt) {
			case 'currency':
				return formatCurrency(v);
			case 'years':
				if (!isFinite(v)) return '—';
				return `${Math.round(v)} anni`;
			case 'percent':
				// calculateSavingsRate restituisce una frazione 0..1
				return formatPercent(v, false);
			case 'count':
				return String(Math.round(v));
			case 'age':
				return `${Math.round(v)} anni`;
			case 'monthly':
				return `${formatCurrency(v)}/mese`;
			case 'boolean':
				return v ? 'Si' : 'No';
			default:
				return String(v);
		}
	}

	// === Calcolo delta + colore badge ===
	type Delta = { text: string; color: 'green' | 'red' | 'gray' };

	function computeDelta(row: Row): Delta | undefined {
		// Numerico puro
		if (typeof row.valueA === 'boolean' || typeof row.valueB === 'boolean') {
			if (row.valueA === row.valueB) return { text: 'Uguale', color: 'gray' };
			return { text: row.valueA ? 'Solo A' : 'Solo B', color: 'gray' };
		}
		if (typeof row.valueA !== 'number' || typeof row.valueB !== 'number') return undefined;

		const a = row.valueA;
		const b = row.valueB;
		if (!isFinite(a) || !isFinite(b)) return { text: '—', color: 'gray' };

		const diff = a - b;
		if (diff === 0) return { text: 'Uguale', color: 'gray' };

		// Testo del delta formattato in base al formato della riga
		let text: string;
		switch (row.format) {
			case 'currency':
			case 'monthly': {
				const sign = diff > 0 ? '+' : '-';
				text = `${sign}${formatCompact(Math.abs(diff))}`;
				break;
			}
			case 'percent': {
				const sign = diff > 0 ? '+' : '-';
				// diff e' una differenza tra frazioni 0..1 → punti percentuali
				text = `${sign}${(Math.abs(diff) * 100).toFixed(1)}pp`;
				break;
			}
			case 'years':
			case 'age': {
				const sign = diff > 0 ? '+' : '-';
				const abs = Math.abs(Math.round(diff));
				text = `${sign}${abs} ${abs === 1 ? 'anno' : 'anni'}`;
				break;
			}
			case 'count': {
				const sign = diff > 0 ? '+' : '-';
				text = `${sign}${Math.abs(Math.round(diff))}`;
				break;
			}
			default:
				text = String(diff);
		}

		// Colore: dal punto di vista del Profilo A
		// higher-better: A > B → verde; A < B → rosso
		// lower-better:  A < B → verde; A > B → rosso
		// neutral:       grigio
		if (row.direction === 'neutral') return { text, color: 'gray' };
		const aBetter =
			row.direction === 'higher-better' ? diff > 0 : diff < 0;
		return { text, color: aBetter ? 'green' : 'red' };
	}

	// === Differenze chiave (top 3 per scostamento relativo su metriche numeriche) ===
	type KeyDiff = {
		label: string;
		description: string;
		color: 'green' | 'red' | 'gray';
	};

	let keyDifferences = $derived<KeyDiff[]>(
		rows.length > 0
			? rows
					.filter(
						(r) =>
							typeof r.valueA === 'number' &&
							typeof r.valueB === 'number' &&
							isFinite(r.valueA) &&
							isFinite(r.valueB) &&
							r.direction !== 'neutral' &&
							r.valueA !== r.valueB
					)
					.map((r) => {
						const a = r.valueA as number;
						const b = r.valueB as number;
						const denom = Math.max(Math.abs(a), Math.abs(b), 1);
						const rel = Math.abs(a - b) / denom;
						return { row: r, rel };
					})
					.sort((x, y) => y.rel - x.rel)
					.slice(0, 3)
					.map(({ row }) => {
						const a = row.valueA as number;
						const b = row.valueB as number;
						const diff = a - b;
						const aBetter =
							row.direction === 'higher-better' ? diff > 0 : diff < 0;
						const who = aBetter ? 'Profilo A' : 'Profilo B';
						const loser = aBetter ? 'Profilo B' : 'Profilo A';
						const absDiff = Math.abs(diff);

						let description: string;
						if (row.format === 'currency' || row.format === 'monthly') {
							description = `${who} e' avanti di ${formatCompact(absDiff)} € rispetto a ${loser}`;
						} else if (row.format === 'percent') {
							description = `${who} e' avanti di ${(absDiff * 100).toFixed(1)} punti percentuali`;
						} else if (row.format === 'years' || row.format === 'age') {
							const n = Math.round(absDiff);
							description = `${who} e' avanti di ${n} ${n === 1 ? 'anno' : 'anni'}`;
						} else if (row.format === 'count') {
							description = `${who} ha ${Math.round(absDiff)} in meno`;
						} else {
							description = `${who} e' meglio posizionato`;
						}

						return {
							label: row.label,
							description,
							color: aBetter ? 'green' : 'red'
						} satisfies KeyDiff;
					})
			: []
	);

	// === Grafico overlay ECharts ===
	let chartOptions = $derived(buildChartOptions(projectionsA, projectionsB, profileA, profileB));

	function buildChartOptions(
		dataA: YearlyProjection[],
		dataB: YearlyProjection[],
		pA: Profile | undefined,
		pB: Profile | undefined
	) {
		if (!dataA.length && !dataB.length) return {};
		// Usiamo l'anno come asse X, unendo gli anni di entrambe le serie.
		const yearsSet = new Set<number>();
		dataA.forEach((d) => yearsSet.add(d.year));
		dataB.forEach((d) => yearsSet.add(d.year));
		const years = Array.from(yearsSet).sort((a, b) => a - b);

		const mapA = new Map(dataA.map((d) => [d.year, d.portfolio]));
		const mapB = new Map(dataB.map((d) => [d.year, d.portfolio]));

		const seriesA = years.map((y) => (mapA.has(y) ? (mapA.get(y) as number) : null));
		const seriesB = years.map((y) => (mapB.has(y) ? (mapB.get(y) as number) : null));

		const nameA = pA?.name || 'Profilo A';
		const nameB = pB?.name || 'Profilo B';

		return {
			tooltip: {
				trigger: 'axis',
				formatter: (params: unknown) => {
					const arr = Array.isArray(params) ? params : [params];
					let html = '';
					arr.forEach((p: { axisValue?: number | string; seriesName?: string; value?: number; color?: string }) => {
						if (p.value == null) return;
						if (!html) html = `<div class="font-semibold">${p.axisValue}</div>`;
						html += `<div><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:50%;margin-right:4px;"></span>${p.seriesName}: <strong>${formatCurrency(p.value as number)}</strong></div>`;
					});
					return html;
				}
			},
			legend: {
				data: [nameA, nameB],
				bottom: 0,
				textStyle: { color: '#9ca3af' }
			},
			grid: {
				left: 80,
				right: 40,
				top: 30,
				bottom: 60,
				containLabel: false
			},
			xAxis: {
				type: 'category',
				data: years,
				axisLabel: { color: '#9ca3af' },
				axisLine: { lineStyle: { color: '#4b5563' } }
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					color: '#9ca3af',
					formatter: (v: number) => formatCompact(v)
				},
				axisLine: { lineStyle: { color: '#4b5563' } },
				splitLine: { lineStyle: { color: 'rgba(156,163,175,0.2)' } }
			},
			series: [
				{
					name: nameA,
					type: 'line',
					data: seriesA,
					smooth: true,
					showSymbol: false,
					connectNulls: true,
					lineStyle: { width: 3, color: '#3b82f6' },
					itemStyle: { color: '#3b82f6' },
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(59,130,246,0.3)' },
								{ offset: 1, color: 'rgba(59,130,246,0)' }
							]
						}
					}
				},
				{
					name: nameB,
					type: 'line',
					data: seriesB,
					smooth: true,
					showSymbol: false,
					connectNulls: true,
					lineStyle: { width: 3, color: '#ef4444' },
					itemStyle: { color: '#ef4444' },
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(239,68,68,0.25)' },
								{ offset: 1, color: 'rgba(239,68,68,0)' }
							]
						}
					}
				}
			]
		};
	}

	// === Caricamento profili ===
	onMount(async () => {
		try {
			profiles = await getAllProfiles();
			if (profiles.length >= 2) {
				selectedIdA = profiles[0].id;
				selectedIdB = profiles[1].id;
			}
		} catch (e) {
			console.error('Errore caricamento profili:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Confronto profili - FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Confronto profili</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Confronto profili</Heading>
<p class="text-gray-600 dark:text-gray-400 mb-6">
	Seleziona due profili finanziari per confrontarli fianco a fianco: FIRE Number, patrimonio,
	proiezione, spese familiari, pensione INPS. Utile per scenari tipo 'single vs coppia con figli'
	o per confrontare te oggi con la tua situazione a 40 anni.
</p>

{#if loading}
	<div class="flex items-center justify-center py-20">
		<Spinner size="8" />
		<span class="ml-3 text-gray-500 dark:text-gray-400">Caricamento profili...</span>
	</div>
{:else if profiles.length < 2}
	<Alert color="yellow">
		{#snippet icon()}
			<ExclamationCircleOutline class="w-5 h-5" />
		{/snippet}
		<span class="font-medium">Servono almeno 2 profili per il confronto.</span>
		Crea un secondo profilo dalla pagina Profilo.
		<a
			href="/profilo/"
			class="ml-2 inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-300 underline font-medium"
		>
			Vai al Profilo <ArrowRightOutline class="w-3 h-3" />
		</a>
	</Alert>
{:else}
	<!-- Selettore profili -->
	<Card class="max-w-none mb-6">
		<Heading tag="h4" class="text-lg mb-4 flex items-center gap-2">
			<UsersGroupOutline class="w-5 h-5" />
			Seleziona profili
		</Heading>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label for="sel-a" class="mb-2">Profilo A (blu)</Label>
				<Select id="sel-a" items={profileOptions} bind:value={selectedIdA} />
			</div>
			<div>
				<Label for="sel-b" class="mb-2">Profilo B (rosso)</Label>
				<Select id="sel-b" items={profileOptions} bind:value={selectedIdB} />
			</div>
		</div>
		{#if selectedIdA === selectedIdB}
			<Alert color="yellow" class="mt-4">
				{#snippet icon()}
					<ExclamationCircleOutline class="w-4 h-4" />
				{/snippet}
				Stai confrontando lo stesso profilo con se stesso. Scegli due profili diversi.
			</Alert>
		{/if}
	</Card>

	{#if profileA && profileB}
		<!-- Tabella confronto metriche -->
		<Card class="max-w-none mb-6">
			<Heading tag="h4" class="text-lg mb-4">Confronto metrica per metrica</Heading>
			<Table striped={true} class="text-sm">
				<TableHead>
					<TableHeadCell>Metrica</TableHeadCell>
					<TableHeadCell class="text-right">{profileA.name || 'Profilo A'}</TableHeadCell>
					<TableHeadCell class="text-right">{profileB.name || 'Profilo B'}</TableHeadCell>
					<TableHeadCell class="text-right">Δ</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each rows as row (row.label)}
						{@const delta = computeDelta(row)}
						<TableBodyRow>
							<TableBodyCell class="font-medium">{row.label}</TableBodyCell>
							<TableBodyCell class="text-right font-mono">
								{formatValue(row.valueA, row.format)}
							</TableBodyCell>
							<TableBodyCell class="text-right font-mono">
								{formatValue(row.valueB, row.format)}
							</TableBodyCell>
							<TableBodyCell class="text-right">
								{#if delta}
									<Badge color={delta.color}>{delta.text}</Badge>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
				Δ colorato dal punto di vista del Profilo A: verde = A e' meglio posizionato,
				rosso = B e' meglio posizionato, grigio = metrica neutra.
			</p>
		</Card>

		<!-- Grafico overlay proiezione portafoglio -->
		<Card class="max-w-none mb-6">
			<Heading tag="h4" class="text-lg mb-4">Proiezione del portafoglio (overlay)</Heading>
			<EChart options={chartOptions} height="420px" />
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
				Evoluzione del portafoglio liquido anno per anno per entrambi i profili, con i
				rispettivi parametri (contributi, spese in FIRE, rendimento atteso, inflazione,
				pensione INPS, figli e mutuo).
			</p>
		</Card>

		<!-- Differenze chiave -->
		{#if keyDifferences.length > 0}
			<Card class="max-w-none mb-6">
				<Heading tag="h4" class="text-lg mb-4">Differenze chiave</Heading>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					{#each keyDifferences as diff (diff.label)}
						<div
							class="p-4 rounded-lg border"
							class:border-green-300={diff.color === 'green'}
							class:bg-green-50={diff.color === 'green'}
							class:dark:bg-green-900={diff.color === 'green'}
							class:dark:bg-opacity-20={diff.color === 'green'}
							class:border-red-300={diff.color === 'red'}
							class:bg-red-50={diff.color === 'red'}
							class:dark:bg-red-900={diff.color === 'red'}
							class:border-gray-200={diff.color === 'gray'}
							class:bg-gray-50={diff.color === 'gray'}
							class:dark:bg-gray-800={diff.color === 'gray'}
						>
							<div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
								{diff.label}
							</div>
							<div class="text-base font-semibold text-gray-900 dark:text-white">
								{diff.description}
							</div>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	{/if}
{/if}
