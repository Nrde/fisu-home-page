import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},
			adapter: adapter(),
			experimental: { remoteFunctions: true },
			/*
			 * Lighthouse-raportti (1.10.2026): "Avoid chaining critical requests"
			 * — SvelteKitin OLETUS `bundleStrategy: 'split'` tuotti ketjun
			 * kymmenistä pienistä per-komponentti-CSS-tiedostoista
			 * (SegmentedControl.css, StatTile.css, DriverCard.css, ...) joita
			 * selain lataa PERÄKKÄIN ennen renderöintiä, max-latenssi ~1,6s.
			 * HUOM: tätä EI voi ohjata suoraan Viten `build.cssCodeSplit`:lla
			 * — `svelte-check`/build varoittaa selvästi että SvelteKit
			 * ylikirjoittaa sen omalla logiikallaan (kokeiltu, varoitus tuli).
			 * Oikea, DOKUMENTOITU vipu on TÄMÄ `output.bundleStrategy`
			 * (ks. @sveltejs/kit:n types/index.d.ts) — `'single'` niputtaa
			 * KOKO sovelluksen JS:n JA CSS:n yhteen tiedostoon kumpaankin,
			 * jolloin selain lataa ne KERRAN ja selaimen oma HTTP-cache
			 * toimii kaikilla myöhemmillä sivuilla ilman uusia pyyntöjä —
			 * paremmin tälle kokoiselle, monisivuiselle sivustolle kuin
			 * oletus 'split' (joka optimoi SPA-tyyliseen "lataa vain tarvittu
			 * reitti" -navigointiin, mikä tuo tässä lähinnä pyyntöketjuja).
			 */
			output: {
				bundleStrategy: 'single'
			}
		})
	]
});
