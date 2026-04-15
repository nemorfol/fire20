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
						E' il momento di ribilanciare il tuo portafoglio!
					</h4>
					<p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
						{#if daysSince !== null}
							Sono passati <strong>{daysSince} giorni</strong> dall'ultimo ribilanciamento.
						{:else}
							Non hai ancora registrato un ribilanciamento.
						{/if}
						Controlla che l'allocazione del tuo portafoglio sia in linea con i tuoi obiettivi.
					</p>
				</div>
			</div>
			<div class="flex flex-wrap gap-2 ml-8">
				<Button size="xs" color="yellow" onclick={handleRebalanced}>
					Ho ribilanciato
				</Button>
				<Button size="xs" outline color="yellow" onclick={handlePostpone}>
					Ricordamelo dopo
				</Button>
				<Button size="xs" outline color="yellow" href="/impostazioni/">
					Impostazioni
				</Button>
			</div>
		</div>
	</Alert>
{/if}
