<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from 'flowbite-svelte';
	import {
		fetchMultipleQuotes,
		DEFAULT_WATCHLIST,
		type MarketQuote
	} from '$lib/utils/market-data';
	import { t } from '$lib/i18n/store.svelte';

	let quotes = $state<MarketQuote[]>([]);
	let loading = $state(true);
	let error = $state('');
	let lastRefresh = $state('');

	const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minuti

	async function loadQuotes() {
		try {
			const symbols = DEFAULT_WATCHLIST.map((w) => w.symbol);
			const results = await fetchMultipleQuotes(symbols);

			if (results.length > 0) {
				quotes = results;
				error = '';
				lastRefresh = new Intl.DateTimeFormat('it-IT', {
					hour: '2-digit',
					minute: '2-digit'
				}).format(new Date());
			} else {
				error = t('market.unavailable');
			}
		} catch (err) {
			error = t('market.loadError');
			console.warn('[MarketTicker]', err);
		} finally {
			loading = false;
		}
	}

	function formatPrice(quote: MarketQuote): string {
		const decimals = quote.symbol.includes('=X') ? 4 : 2;
		return new Intl.NumberFormat('it-IT', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(quote.price);
	}

	function formatChange(quote: MarketQuote): string {
		const sign = quote.change >= 0 ? '+' : '';
		return `${sign}${quote.changePercent.toFixed(2).replace('.', ',')}%`;
	}

	onMount(() => {
		loadQuotes();
		const interval = setInterval(loadQuotes, REFRESH_INTERVAL);
		return () => clearInterval(interval);
	});
</script>

<div class="w-full overflow-hidden bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
	{#if loading}
		<div class="flex items-center justify-center py-3 px-4">
			<div class="animate-pulse flex gap-8">
				{#each Array(6) as _}
					<div class="flex gap-2 items-center">
						<div class="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
						<div class="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
					</div>
				{/each}
			</div>
		</div>
	{:else if error && quotes.length === 0}
		<div class="py-2 px-4 text-center">
			<p class="text-xs text-gray-400 dark:text-gray-500">{error}</p>
		</div>
	{:else}
		<div class="flex items-center">
			<!-- Label -->
			<div class="flex-shrink-0 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600">
				<span class="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('market.tickerLabel')}</span>
				{#if lastRefresh}
					<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">{lastRefresh}</span>
				{/if}
			</div>

			<!-- Scrolling ticker -->
			<div class="overflow-x-auto flex-1">
				<div class="flex items-center gap-5 px-4 py-2 animate-ticker whitespace-nowrap min-w-max">
					{#each quotes as quote}
						<div class="flex items-center gap-2 text-sm">
							<span class="font-medium text-gray-700 dark:text-gray-300">{quote.name}</span>
							<span class="font-semibold text-gray-900 dark:text-white">{formatPrice(quote)}</span>
							<Badge
								color={quote.change >= 0 ? 'green' : 'red'}
								class="text-xs"
							>
								{formatChange(quote)}
							</Badge>
						</div>
					{/each}
				</div>
			</div>
		</div>

		{#if error}
			<div class="px-4 pb-1">
				<p class="text-xs text-yellow-500">{error}</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.animate-ticker {
		animation: ticker-scroll 30s linear infinite;
	}

	.animate-ticker:hover {
		animation-play-state: paused;
	}

	@keyframes ticker-scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
