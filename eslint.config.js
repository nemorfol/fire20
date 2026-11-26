import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

// Flat config: typescript-eslint + eslint-plugin-svelte con regole "recommended"
// (non type-checked, per restare leggeri e non invasivi). eslint-config-prettier
// disattiva le regole stilistiche che confliggono con Prettier.
export default ts.config(
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'coverage/', 'node_modules/', 'static/']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// TypeScript + svelte-check coprono gia' i riferimenti non definiti; il
			// core no-undef non conosce i tipi DOM lib (es. NotificationPermission).
			'no-undef': 'off',
			// Nel repo esistono any intenzionali (API browser SpeechRecognition,
			// import di backup JSON, override dinamici degli scenari): li segnaliamo
			// come warning invece di bloccare la CI.
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
			],
			// La guida e alcuni componenti renderizzano HTML fidato prodotto in casa.
			'svelte/no-at-html-tags': 'off',
			// Introduzione non invasiva: le seguenti regole segnalano miglioramenti
			// (chiavi negli each, resolve() nei link, SvelteSet, dead assignment,
			// escape/const superflui) senza bloccare la CI. Vanno smaltite nel tempo.
			'prefer-const': 'warn',
			'no-useless-escape': 'warn',
			'no-useless-assignment': 'warn',
			'svelte/require-each-key': 'warn',
			'svelte/no-navigation-without-resolve': 'warn',
			'svelte/prefer-svelte-reactivity': 'warn',
			'svelte/prefer-writable-derived': 'warn',
			'svelte/no-useless-mustaches': 'warn'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: false,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			// In runes mode le dichiarazioni $state/$derived/$props usano `let` per
			// design: prefer-const qui e' un falso positivo, va spento.
			'prefer-const': 'off'
		}
	}
);
