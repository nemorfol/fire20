import { describe, it, expect } from 'vitest';
import { pickBestOllamaModel } from './index';

describe('pickBestOllamaModel', () => {
	it('lista vuota -> stringa vuota', () => {
		expect(pickBestOllamaModel([])).toBe('');
	});

	it('scarta gli embedding', () => {
		expect(pickBestOllamaModel(['nomic-embed-text', 'qwen2.5:7b'])).toBe('qwen2.5:7b');
	});

	it('preferisce il modello piu' + " grande nella stessa famiglia", () => {
		expect(pickBestOllamaModel(['llama3.2:3b', 'llama3.1:8b'])).toBe('llama3.1:8b');
	});

	it('penalizza i modelli "code" per il Q&A', () => {
		expect(pickBestOllamaModel(['codellama:7b', 'mistral:7b'])).toBe('mistral:7b');
	});

	it('sceglie una famiglia recente multilingua', () => {
		const best = pickBestOllamaModel(['phi3:3.8b', 'qwen2.5:7b', 'gemma2:2b']);
		expect(best).toBe('qwen2.5:7b');
	});

	it('con un solo modello ritorna quello', () => {
		expect(pickBestOllamaModel(['gemma2:9b'])).toBe('gemma2:9b');
	});
});
