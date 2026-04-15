<script lang="ts">
	import { Modal, Button } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

	let {
		open = $bindable(false),
		title = 'Conferma',
		message = 'Sei sicuro di voler procedere?',
		onConfirm = () => {}
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		onConfirm?: () => void;
	} = $props();

	function handleConfirm() {
		open = false;
		onConfirm();
	}

	function handleCancel() {
		open = false;
	}
</script>

<Modal bind:open size="sm" title={title}>
	<div class="text-center">
		<ExclamationCircleOutline class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-200" />
		<p class="mb-5 text-lg text-gray-500 dark:text-gray-400">{message}</p>
		<div class="flex justify-center gap-4">
			<Button color="red" onclick={handleConfirm}>Conferma</Button>
			<Button color="alternative" onclick={handleCancel}>Annulla</Button>
		</div>
	</div>
</Modal>
