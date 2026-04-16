<script lang="ts">
	import { Alert, Button } from 'flowbite-svelte';
	import { BellOutline } from 'flowbite-svelte-icons';
	import {
		isNotificationSupported,
		getNotificationPermission,
		requestNotificationPermission,
		isBannerDismissed,
		dismissBanner,
		startReminderChecks
	} from '$lib/utils/notifications';

	let visible = $state(false);
	let permission = $state<NotificationPermission | 'unsupported'>('unsupported');

	$effect(() => {
		if (typeof window === 'undefined') return;
		permission = getNotificationPermission();
		// Mostra il banner solo se:
		// - Le notifiche sono supportate
		// - Il permesso non e ancora stato richiesto (default)
		// - Il banner non e stato chiuso in questa sessione
		visible = isNotificationSupported() && permission === 'default' && !isBannerDismissed();
	});

	async function handleEnable() {
		const granted = await requestNotificationPermission();
		if (granted) {
			startReminderChecks();
		}
		visible = false;
		dismissBanner();
	}

	function handleDismiss() {
		visible = false;
		dismissBanner();
	}
</script>

{#if visible}
	<div class="mb-4">
		<Alert color="blue">
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
				<BellOutline class="w-5 h-5 flex-shrink-0" />
				<div class="flex-1">
					<p class="font-medium">Attiva le notifiche</p>
					<p class="text-sm">Ricevi promemoria per il ribilanciamento del portafoglio e altri avvisi importanti.</p>
				</div>
				<div class="flex gap-2 flex-shrink-0">
					<Button size="sm" color="blue" onclick={handleEnable}>
						Attiva notifiche
					</Button>
					<Button size="sm" color="alternative" onclick={handleDismiss}>
						Non ora
					</Button>
				</div>
			</div>
		</Alert>
	</div>
{/if}
