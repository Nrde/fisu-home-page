<script lang="ts">
	/**
	 * CarCard — /autot-indeksisivun autokortti. Sama "koko kortti on yksi
	 * linkki" -periaate kuin TrackCard/DriverListCard/SeasonCard, ja sama
	 * "arvo isolla + pieni versaalilabel alla" -tilastoruudukko kuin
	 * DriverListCard.svelte:ssä (käyttäjän pyyntö 25.9.2026: "use similar
	 * type for the card as driver") — KIINTEÄ 3 saraketta (valmistaja/
	 * luokka/simulaattori), puuttuva arvo näkyy "–":na SAMALLA periaatteella
	 * kuin DriverListCard:ssa, ei piilotettuna solu, jotta kortit pysyvät
	 * saman muotoisina riippumatta siitä kuinka täydellisesti ylläpito on
	 * ehtinyt täyttää kunkin auton tiedot.
	 *
	 * Media-alue (yläreuna, neliö) on VALMISTELTU valmistajan logoa varten
	 * (käyttäjän pyyntö: "prepare the card having either manufacturer logo
	 * or something similar") SAMALLA periaatteella kuin TrackCard.svelte:n
	 * ratakartta-alue: jos `logoUrl` joskus saadaan (API:lla ei ole tätä
	 * kenttää TÄLLÄ HETKELLÄ ollenkaan — tämä on siis valmiiksi rakennettu
	 * "kun se joskus tulee" -varten, ei näytä mitään väärää dataa nyt),
	 * näytetään kuva; muuten hillitty tekstiplaceholder, sama ratkaisu kuin
	 * TrackCardilla puuttuvalle ratakartalle.
	 */
	import ReviewBadge from './ReviewBadge.svelte';

	let {
		id,
		name,
		manufacturer,
		carClass,
		sim,
		logoUrl,
		reviewAverage,
		reviewCount
	}: {
		id: number;
		name: string;
		manufacturer?: string;
		/** Nimetty `carClass`, ei `class` — `class` on varattu HTML/Svelte-attribuutille. */
		carClass?: string;
		sim?: string;
		/** Ks. yllä oleva komponenttikommentti — aina `undefined` toistaiseksi, ei API-kenttää vielä olemassa. */
		logoUrl?: string;
		/**
		 * Arvostelujen keskiarvo/määrä — UUSI 2.10.2026, käyttäjän pyyntö
		 * ("Then that info will be presented with the basic non dynamic
		 * data on the UI"). `reviewAverage: undefined` + `reviewCount: 0`
		 * näyttää "Ei arvosteluja" -badgen (ks. ReviewBadge.svelte), EI
		 * piilota koko badgea — ero "ei arvioitu vielä" ja "puuttuva tieto"
		 * välillä on tarkoituksella näkyvä.
		 */
		reviewAverage?: number;
		reviewCount?: number;
	} = $props();

	let imageFailed = $state(false);
</script>

<a class="car-card" href="/autot/{id}">
	<div class="car-card__media">
		{#if logoUrl && !imageFailed}
			<img src={logoUrl} alt="" loading="lazy" onerror={() => (imageFailed = true)} />
		{:else}
			<div class="car-card__media-placeholder">
				<span>Logoa<br />ei vielä lisätty</span>
			</div>
		{/if}
	</div>

	<h3 class="car-card__name">{name}</h3>

	<div class="car-card__review">
		<ReviewBadge average={reviewAverage} count={reviewCount ?? 0} />
	</div>

	<div class="car-card__stats">
		<div class="stat" data-accent="info">
			<span class="stat__value">{manufacturer ?? '–'}</span>
			<span class="stat__label">valmistaja</span>
		</div>
		<div class="stat" data-accent="warning">
			<span class="stat__value">{carClass ?? '–'}</span>
			<span class="stat__label">luokka</span>
		</div>
		<div class="stat" data-accent="special">
			<span class="stat__value">{sim ?? '–'}</span>
			<span class="stat__label">simulaattori</span>
		</div>
	</div>
</a>

<style>
	.car-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	/* Sama periaate kuin muillakin sivuston korteilla — VAIN reunaväri
	   hoverissa, ei nostoa (ks. TrackCard.svelte:n kommentti). */
	.car-card:hover {
		border-color: var(--color-info);
	}

	.car-card__media {
		width: 100%;
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: color-mix(in oklch, white 96%, var(--color-bg));
	}

	.car-card__media img {
		display: block;
		width: 100%;
		height: 100%;
		padding: var(--space-4);
		box-sizing: border-box;
		object-fit: contain;
	}

	.car-card__media-placeholder {
		padding: var(--space-3);
		text-align: center;
		color: var(--color-text-faint);
		font-size: clamp(0.7rem, 0.6rem + 0.8cqi, 0.8rem);
		font-weight: 600;
		line-height: 1.4;
	}

	.car-card__name {
		font-size: var(--font-size-lg);
		font-weight: 800;
		text-align: center;
	}

	.car-card__review {
		display: flex;
		justify-content: center;
	}

	/* KIINTEÄ 3 saraketta, sama tekniikka ja perustelu kuin
	   DriverListCard.svelte:n `.driver-card__stats`:ssa. */
	.car-card__stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-1);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-surface-border);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1em;
		min-width: 0;
		text-align: center;
	}

	.stat__value {
		font-size: var(--font-size-base);
		font-weight: 800;
		line-height: 1.2;
		overflow-wrap: normal;
	}

	.stat[data-accent='info'] .stat__value {
		color: var(--color-info);
	}
	.stat[data-accent='warning'] .stat__value {
		color: var(--color-warning);
	}
	.stat[data-accent='special'] .stat__value {
		color: var(--color-special);
	}

	.stat__label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-faint);
	}
</style>
