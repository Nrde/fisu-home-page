/**
 * Svelte-action joka kutsuu annettua callbackia kerran, kun elementti
 * ensimmäisen kerran vierähtää näkyviin. Käytetään esim. StatTile.svelten
 * numerolaskurin käynnistämiseen (ks. suunnitelman luku 7).
 *
 * TS-huomio: tämä tiedosto ei ole .svelte-komponentti vaan tavallinen
 * .ts-moduuli — Svelte-actionit ovat vain funktioita joilla on tietty
 * kutsurajapinta (elementti sisään, valinnainen `{ destroy }`-objekti
 * ulos), ei mitään Svelte-erikoissyntaksia. `Action`-tyyppi tulee
 * Sveltestä ja kuvaa juuri tämän rajapinnan.
 */
import type { Action } from 'svelte/action';

export const inView: Action<HTMLElement, () => void> = (node, onEnter) => {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					onEnter();
					observer.disconnect(); // vain kerran — ei toisteta scrollatessa edestakaisin
				}
			}
		},
		{ threshold: 0.3 }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
