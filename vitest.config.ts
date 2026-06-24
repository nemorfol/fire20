import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Config Vitest minimale e indipendente dal plugin SvelteKit: il motore
// (src/lib/engine) e' TS puro e va testato in isolamento. Manteniamo solo
// l'alias $lib per poter importare come nel resto del progetto.
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node'
	}
});
