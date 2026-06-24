/**
 * Renderer Markdown MINIMALE e sicuro per le risposte dell'assistente AI.
 * Gli LLM rispondono in markdown (**grassetto**, liste, `codice`): mostrarlo
 * grezzo fa apparire asterischi senza senso. Qui lo convertiamo in HTML.
 *
 * SICUREZZA: l'escaping dell'HTML avviene PRIMA di applicare la formattazione,
 * quindi eventuale HTML nel testo diventa testo (niente XSS), e usiamo {@html}
 * solo su output generato da qui.
 */

export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function inline(s: string): string {
	return s
		.replace(/`([^`]+)`/g, '<code class="rounded bg-black/10 px-1 dark:bg-white/10">$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * Converte markdown minimale (grassetto, corsivo, codice inline, liste puntate,
 * a capo) in HTML sicuro. Le righe di testo sono unite con <br>, i gruppi di
 * bullet diventano <ul>.
 */
export function renderMarkdown(src: string): string {
	if (!src) return '';
	const lines = escapeHtml(src).split('\n');
	const out: string[] = [];
	let listOpen = false;
	let textBuf: string[] = [];
	const flushText = () => {
		if (textBuf.length) {
			out.push(textBuf.join('<br>'));
			textBuf = [];
		}
	};
	for (const line of lines) {
		const bullet = line.match(/^\s*[-*]\s+(.*)$/);
		if (bullet) {
			flushText();
			if (!listOpen) {
				out.push('<ul class="my-1 ml-5 list-disc space-y-0.5">');
				listOpen = true;
			}
			out.push(`<li>${inline(bullet[1])}</li>`);
		} else {
			if (listOpen) {
				out.push('</ul>');
				listOpen = false;
			}
			textBuf.push(inline(line));
		}
	}
	if (listOpen) out.push('</ul>');
	flushText();
	return out.join('');
}

/** Rimuove la sintassi markdown per la lettura vocale (TTS non deve dire "asterisco"). */
export function stripMarkdown(s: string): string {
	return s
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // link [testo](url) -> testo
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/^#{1,6}\s*/gm, '')
		.replace(/^\s*[-*]\s+/gm, '')
		.replace(/[*`#]/g, ''); // residui (es. ** non chiusi durante lo streaming)
}
