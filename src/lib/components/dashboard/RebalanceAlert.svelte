<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert, Button } from 'flowbite-svelte';
	import { ExclamationCircleSolid } from 'flowbite-svelte-icons';
	import {
		isReminderDue,
		markRebalanced,
		postpone,
		daysSinceLastRebalance
	} from '$lib/utils/reminders';
	import { t } from '$lib/i18n/store.svelte';

	let visible = $state(false);
	let daysSince = $state<number | null>(null);

	onMount(() => {
		visible = isReminderDue();
		daysSince = daysSinceLastRebalance();
	});

	function handleRebalanced() {
		markRebalanced();
		visible = false;
	}

	function handlePostpone() {
		postpone(7);
		visible = false;
	}
</script>

{#if visible}
	<Alert color="yellow" class="mb-6">
		<div class="flex flex-col gap-3">
			<div class="flex items-start gap-3">
				<ExclamationCircleSolid class="w-5 h-5 mt-0.5 flex-shrink-0" />
				<div>
					<h4 class="font-semibold text-lg text-yellow-800 dark:text-yellow-300">
						{t('rebalance.title')}
					</h4>
					<p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
						{#if daysSince !== null}
							{t('rebalance.daysSince', { days: daysSince })}
						{:else}
							{t('rebalance.never')}
						{/if}
						{t('rebalance.checkAllocation')}
					</p>
				</div>
			</div>
			<div class="flex flex-wrap gap-2 ml-8">
				<Button size="xs" color="yellow" onclick={handleRebalanced}>
					{t('rebalance.done')}
				</Button>
				<Button size="xs" outline color="yellow" onclick={handlePostpone}>
					{t('rebalance.later')}
				</Button>
				<Button size="xs" outline color="yellow" href="/impostazioni/">
					{t('rebalance.settings')}
				</Button>
			</div>
		</div>
	</Alert>
{/if}
