import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: {
				name: 'FIRE Planner',
				short_name: 'FIRE Planner',
				description: 'Pianificatore FIRE per l\'indipendenza finanziaria - Contesto fiscale italiano',
				theme_color: '#1e3a8a',
				background_color: '#111827',
				display: 'standalone',
				orientation: 'portrait',
				categories: ['finance', 'productivity'],
				lang: 'it',
				icons: [
					{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
					{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
			}
		})
	]
});
