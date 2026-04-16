<script lang="ts">
	import StatCard from '$lib/components/shared/StatCard.svelte';
	import { formatCurrency, formatPercent } from '$lib/utils/format';
	import {
		FireSolid,
		CalendarMonthSolid,
		ChartPieSolid,
		WalletSolid,
		ShieldCheckSolid,
		ArrowUpRightFromSquareOutline
	} from 'flowbite-svelte-icons';

	let {
		fireNumber = 0,
		yearsToFire = 0,
		savingsRate = 0,
		netWorth = 0,
		liquidNetWorth = 0,
		illiquidNetWorth = 0,
		coastFireNumber = 0,
		gap = 0
	}: {
		fireNumber?: number;
		yearsToFire?: number;
		savingsRate?: number;
		netWorth?: number;
		liquidNetWorth?: number;
		illiquidNetWorth?: number;
		coastFireNumber?: number;
		gap?: number;
	} = $props();

	let yearsLabel = $derived(
		yearsToFire === 0
			? 'Raggiunto!'
			: yearsToFire < 0
				? 'Irraggiungibile'
				: `${yearsToFire} anni`
	);

	let yearsTrend = $derived<'up' | 'down' | 'neutral'>(
		yearsToFire === 0 ? 'up' : yearsToFire < 0 ? 'down' : 'neutral'
	);

	let gapTrend = $derived<'up' | 'down' | 'neutral'>(
		gap <= 0 ? 'up' : 'down'
	);
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
	<StatCard
		title="FIRE Number"
		value={formatCurrency(fireNumber)}
		subtitle="Patrimonio obiettivo"
		icon={FireSolid}
		color="red"
	/>
	<StatCard
		title="Anni al FIRE"
		value={yearsLabel}
		subtitle={yearsToFire > 0 ? `FIRE nel ${new Date().getFullYear() + yearsToFire}` : ''}
		icon={CalendarMonthSolid}
		trend={yearsTrend}
		color="blue"
	/>
	<StatCard
		title="Tasso di Risparmio"
		value={formatPercent(savingsRate * 100)}
		subtitle="Del reddito annuale"
		icon={ChartPieSolid}
		trend={savingsRate >= 0.5 ? 'up' : savingsRate >= 0.2 ? 'neutral' : 'down'}
		color="green"
	/>
	<StatCard
		title="Patrimonio Liquido"
		value={formatCurrency(liquidNetWorth || netWorth)}
		subtitle={illiquidNetWorth > 0
			? `Totale ${formatCurrency(netWorth)} (di cui ${formatCurrency(illiquidNetWorth)} illiquidi: immobili/TFR)`
			: 'Azioni, obbligazioni, cash, ETF, fondo pensione'}
		icon={WalletSolid}
		color="primary"
	/>
	<StatCard
		title="Coast FIRE Number"
		value={formatCurrency(coastFireNumber)}
		subtitle={(liquidNetWorth || netWorth) >= coastFireNumber ? 'Coast FIRE raggiunto!' : 'Soglia per smettere di contribuire'}
		icon={ShieldCheckSolid}
		trend={(liquidNetWorth || netWorth) >= coastFireNumber ? 'up' : 'neutral'}
		color="yellow"
	/>
	<StatCard
		title="Gap da Colmare"
		value={formatCurrency(Math.max(0, gap))}
		subtitle={gap <= 0 ? 'Obiettivo superato!' : 'FIRE Number - Patrimonio attuale'}
		icon={ArrowUpRightFromSquareOutline}
		trend={gapTrend}
		color={gap <= 0 ? 'green' : 'red'}
	/>
</div>
