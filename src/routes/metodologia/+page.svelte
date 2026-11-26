<script lang="ts">
	import { Heading, Breadcrumb, BreadcrumbItem, Card, Alert, Badge } from 'flowbite-svelte';
	import { DEFAULT_2026 } from '$lib/engine/assumptions';
	import {
		SERIES_IT_DEFAULT,
		SERIES_IT_WORLD,
		SERIES_US_CLASSIC,
		ALLWORLD_US_WEIGHT_DEFAULT,
		alignHistory
	} from '$lib/data/default-series';
	import { ITL_PER_EUR } from '$lib/data/fx';

	const a = DEFAULT_2026;
	const pct = (x: number) => (x * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + '%';
	const eur = (x: number) => x.toLocaleString('it-IT') + ' €';
	const win = (ys: number[]) => `${ys[0]}-${ys[ys.length - 1]}`;
	const winIT = win(alignHistory(SERIES_IT_DEFAULT, ['stocks', 'bonds']).years);
	const winWorld = win(alignHistory(SERIES_IT_WORLD, ['stocks', 'bonds']).years);
	const winUS = win(alignHistory(SERIES_US_CLASSIC, ['stocks', 'bonds']).years);

	// Ogni voce: valore usato dal motore + fonte normativa. I valori sono letti
	// da DEFAULT_2026 cosi' restano allineati al motore.
	const voci: { voce: string; valore: string; fonte: string }[] = [
		{
			voce: 'IRPEF 2026 (scaglioni)',
			valore: '23% fino a 28.000 · 33% da 28.000 a 50.000 · 43% oltre',
			fonte: 'Legge di Bilancio 2026 (riduzione della 2ª aliquota dal 35% al 33%)'
		},
		{
			voce: 'Detrazioni lavoro dipendente',
			valore: 'art.13 TUIR (1.955 fino a 15k, decrescente) + cuneo 2026',
			fonte:
				'Art.13 co.1 TUIR; riduzione cuneo fiscale resa strutturale (Legge di Bilancio 2025/2026)'
		},
		{
			voce: 'Capital gain',
			valore: `${pct(a.capital.stocksAndEtf)} azioni/ETF · ${pct(a.capital.governmentBonds)} titoli di stato`,
			fonte: 'TUIR; aliquota agevolata 12,5% su titoli di Stato ed equiparati (white list)'
		},
		{
			voce: 'Bollo titoli / IVAFE',
			valore: `${pct(a.capital.stampDuty)} annuo`,
			fonte: 'Imposta di bollo su prodotti finanziari / IVAFE su attività estere'
		},
		{
			voce: 'Cedolare secca affitti',
			valore: pct(a.capital.cedolareSecca),
			fonte: 'Regime sostitutivo canone libero (21%)'
		},
		{
			voce: 'INPS lavoratore dipendente',
			valore: `${pct(a.inps.employeeBase)} fino alla prima fascia (${eur(a.inps.primaFascia)}), +1% oltre, 0 sopra il massimale`,
			fonte: 'L.335/1995 (massimale post-1995); addizionale 1% L.438/1992'
		},
		{
			voce: 'Massimale contributivo 2026',
			valore: eur(a.inps.massimale),
			fonte: 'INPS, circolare n.6 del 30/01/2026 (rivalutazione ISTAT)'
		},
		{
			voce: 'Coefficienti di trasformazione',
			valore: 'biennio 2025-2026 (es. 5,608% a 67 anni)',
			fonte: 'Decreto Direttoriale Ministero del Lavoro/MEF del 20/11/2024'
		},
		{
			voce: 'Fondo pensione',
			valore: `deduzione ${eur(a.pensionFund.maxDeduction)} (+${eur(a.pensionFund.extraDeduction)} nuovi iscritti) · rendimenti ${pct(a.pensionFund.returnTaxRate)} · prestazione ${pct(a.pensionFund.benefitTaxBase)}→${pct(a.pensionFund.benefitTaxFloor)}`,
			fonte: 'D.Lgs. 252/2005; deduzione 5.300€ (Legge di Bilancio 2026)'
		},
		{
			voce: 'TFR',
			valore: `accantonamento stipendio/${a.tfr.divisor} · rivalutazione ${pct(a.tfr.revaluationFixed)} + ${pct(a.tfr.revaluationInflationQuota)} dell'inflazione`,
			fonte: 'Art.2120 c.c.'
		},
		{
			voce: 'Addizionali IRPEF (media)',
			valore: `regionale ${pct(a.surtaxes.regional)} · comunale ${pct(a.surtaxes.municipal)}`,
			fonte: 'Medie nazionali indicative (variano per regione/comune)'
		},
		{
			voce: 'Serie storiche Monte Carlo (preset MSCI World, predefinito)',
			valore: `azioni MSCI World (rendimento lordo, pesi per capitalizzazione: peso USA storico di ogni anno), convertite in lire/EUR coi cambi storici; prima del 31/03/1986 back-test MSCI · BTP, oro, ISTAT come sotto · finestra azioni+BTP ${winWorld}`,
			fonte:
				'MSCI World Index factsheet (USD, gross, 30/10/2026) per 2012-2025; Wikipedia "MSCI World" (Gross Annual Return) per 1970-2011, coerente con i factsheet MSCI'
		},
		{
			voce: 'Titoli di Stato italiani (BTP ~10 anni)',
			valore: '1970-2020 rendimento totale MISURATO (JST bond_tr, Italia; anni \'80 titoli a 3-5 anni) · 2021 stima da yield e duration · 2022-2025 proxy ETF BTP 10Y + TER',
			fonte:
				'Jordà-Schularick-Taylor Macrohistory Database R6 (CC BY-NC-SA 4.0); Jordà et al. (2019), QJE 134(3); justETF (LU1598691217)'
		},
		{
			voce: 'Serie storiche Monte Carlo (preset mix a peso fisso)',
			valore: `azioni a peso fisso ${Math.round(ALLWORLD_US_WEIGHT_DEFAULT * 100)}% S&P 500 / ${100 - Math.round(ALLWORLD_US_WEIGHT_DEFAULT * 100)}% MSCI World ex-USA, ribilanciate ogni anno, tutto convertito in lire/EUR; BTP, ISTAT come il preset IT · peso USA di oggi applicato al passato: stima tendenzialmente ottimista`,
			fonte:
				'Peso USA: factsheet MSCI World (USD 30/06/2026: 72,45%; EUR 27/02/2026: 70,11%); S&P 500: NYU Stern (Damodaran)'
		},
		{
			voce: 'Serie storiche Monte Carlo (preset IT ex-USA)',
			valore: `tutto in lire/EUR: MSCI World ex-USA (net) e oro convertiti da USD coi cambi storici, BTP ~10 anni, inflazione ISTAT · finestra azioni+BTP ${winIT}`,
			fonte: 'MSCI (total return net USD; 2024-2025 factsheet 30/10/2026); inflazione World Bank FP.CPI.TOTL.ZG / ISTAT NIC (2024 +1,0%, 2025 +1,5%); oro: Damodaran'
		},
		{
			voce: 'Cambi storici (conversione USD → EUR)',
			valore: `media di dicembre ITL/USD (1969-70: parità 625) e USD/EUR; lire → euro a ${ITL_PER_EUR.toLocaleString('it-IT')}`,
			fonte: 'Federal Reserve H.10/G.5 via FRED (EXITUS, EXUSEU); Reg. CE 2866/98'
		},
		{
			voce: 'Serie storiche Monte Carlo (preset USA)',
			valore: `tutto in USD: S&P 500, Treasury 10y, CPI USA · finestra ${winUS}`,
			fonte: 'NYU Stern (Damodaran, histretSP del 5/1/2026); BLS CPI-U'
		},
		{
			voce: 'Campionamento storico',
			valore:
				'congiunto per anno: azioni, obbligazioni, oro e inflazione dello stesso anno storico (block bootstrap: blocchi di 5 anni consecutivi, circolare)',
			fonte: 'Bootstrap / circular block bootstrap (Politis-Romano, 1992)'
		}
	];
</script>

<svelte:head>
	<title>Metodologia e Fonti — FIRE Planner</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/">Dashboard</BreadcrumbItem>
	<BreadcrumbItem>Metodologia e Fonti</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2">Metodologia e Fonti</Heading>
<p class="mb-4 text-gray-600 dark:text-gray-400">
	FIRE Planner non è una "scatola nera": ogni aliquota, soglia e coefficiente usati dal motore è un
	numero reale e verificabile. Qui trovi i valori applicati e la relativa fonte normativa.
</p>

<Alert color="blue" class="mb-6">
	<span class="font-medium">Aggiornato a giugno 2026.</span> I valori sono allineati al motore di
	calcolo (preset «Normativa 2026»). Le aliquote possono cambiare: verifica sempre presso le fonti
	ufficiali. Strumento educativo, <strong>non è consulenza finanziaria</strong>.
</Alert>

<Card class="max-w-none">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
				<tr>
					<th class="py-2 pr-4 font-semibold">Voce</th>
					<th class="py-2 pr-4 font-semibold">Valore usato</th>
					<th class="py-2 font-semibold">Fonte</th>
				</tr>
			</thead>
			<tbody>
				{#each voci as v (v.voce)}
					<tr class="border-b border-gray-100 align-top dark:border-gray-800">
						<td class="py-3 pr-4 font-medium text-gray-900 dark:text-white">{v.voce}</td>
						<td class="py-3 pr-4 text-gray-700 dark:text-gray-300">{v.valore}</td>
						<td class="py-3 text-gray-500 dark:text-gray-400">{v.fonte}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>

<p class="mt-6 text-sm text-gray-500 dark:text-gray-400">
	Puoi personalizzare le ipotesi (aliquote, SWR, rendimenti) nei pannelli del calcolatore: il preset
	di default riflette la normativa 2026, ma ogni numero è modificabile e ricalcola tutto.
</p>
