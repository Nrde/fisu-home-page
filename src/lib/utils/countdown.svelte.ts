/**
 * createCountdown — pieni jaettu logiikkapala "aikaa jäljellä"
 * -näytöille (ks. projektiohjeen kohta reusable logic in .svelte.ts
 * files). Tätä voi käyttää missä tahansa komponentissa joka haluaa
 * näyttää laskurin tulevaan ajankohtaan (esim. UpcomingRaceCard,
 * mutta yhtä lailla vaikka rekisteröitymisen määräaika jne.).
 *
 * TS/Runes-huomio tälle tiedostolle (.svelte.ts, EI .ts):
 * ainoastaan .svelte.ts-päätteiset moduulit saavat käyttää runeja
 * ($state, $derived, $effect) Svelte-komponenttien ULKOPUOLELLA.
 * $effect toimii silti vain kun tämä funktio kutsutaan komponentin
 * alustuksen aikana (esim. suoraan komponentin <script>-lohkon
 * ylätasolla) — se sitoo aikavälin komponentin elinkaareen ja
 * siivoaa `clearInterval`illa kun komponentti tuhoutuu.
 *
 * HUOM paluuarvosta: palautetaan objekti JOSSA ON GETTERIT
 * (`get days() {...}`), ei suoria arvoja (`{ days: days }`).
 * Jos palauttaisimme suoria arvoja, ne "jähmettyisivät" kutsuhetken
 * arvoihinsa eivätkä päivittyisi — getterit sen sijaan lukevat
 * $derived-arvon joka kerta uudelleen, jolloin reaktiivisuus säilyy
 * myös tämän funktion rajan yli.
 */
export function createCountdown(target: () => Date) {
	let now = $state(Date.now());

	$effect(() => {
		// Päivitys kerran minuutissa riittää — ei tarvita sekuntikelloa
		// päivämäärään asti tarkalle laskurille, ja säästää turhia
		// re-renderöintejä.
		const id = setInterval(() => {
			now = Date.now();
		}, 60_000);

		return () => clearInterval(id);
	});

	const remainingMs = $derived(Math.max(0, target().getTime() - now));
	const totalMinutes = $derived(Math.floor(remainingMs / 60_000));
	const days = $derived(Math.floor(totalMinutes / (60 * 24)));
	const hours = $derived(Math.floor((totalMinutes % (60 * 24)) / 60));
	const minutes = $derived(totalMinutes % 60);
	const isPast = $derived(remainingMs <= 0);

	return {
		get days() {
			return days;
		},
		get hours() {
			return hours;
		},
		get minutes() {
			return minutes;
		},
		get isPast() {
			return isPast;
		}
	};
}
