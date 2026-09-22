<script lang="ts">
	/**
	 * SeasonCard — /kaudet-indeksisivun kausikortti. Sama "koko kortti on
	 * yksi linkki" -periaate kuin TrackCard.svelte:ssä.
	 */
	let {
		id,
		name,
		driversCount,
		leaderName,
		leaderPoints,
		isOver
	}: {
		id: number;
		name: string;
		driversCount: number;
		leaderName?: string;
		leaderPoints?: number;
		/** Ks. `SeasonListEntry.isOver`:in kommentti mappers.ts:ssä. */
		isOver: boolean;
	} = $props();

	// Käyttäjän pyyntö 22.9.2026: käynnissä olevalla kaudella "Sarjajohtaja"
	// (kärjessä juuri nyt, ei vielä lopullinen), PÄÄTTYNEELLÄ kaudella
	// "Voittaja" (johtaja ON lopullinen, kausi ei enää muutu).
	const leaderLabel = $derived(isOver ? 'Voittaja' : 'Sarjajohtaja');

	// Käyttäjän pyyntö 22.9.2026: jos kausi on PÄÄTTYNYT ja johtajalla/
	// voittajalla on 0 pistettä, data on todennäköisesti puutteellinen tai
	// kausi on peruttu — koko johtaja/voittaja-osio jätetään NÄYTTÄMÄTTÄ
	// sen sijaan että näytettäisiin harhaanjohtava "Voittaja: X, 0 pistettä".
	// Käynnissä olevalla kaudella 0 pistettä on sen sijaan ihan validi tila
	// (kausi juuri alkanut, ei vielä tuloksia) eikä sitä piiloteta.
	const hideLeader = $derived(isOver && leaderPoints === 0);
</script>

<a class="season-card" href="/kaudet/{id}">
	<h3 class="season-card__name">{name}</h3>
	<p class="season-card__meta">{driversCount} {driversCount === 1 ? 'kuljettaja' : 'kuljettajaa'}</p>
	{#if leaderName !== undefined && !hideLeader}
		<div class="season-card__leader">
			<span class="season-card__leader-label">{leaderLabel}</span>
			<span class="season-card__leader-name">{leaderName}</span>
			{#if leaderPoints !== undefined}
				<span class="season-card__leader-points">{leaderPoints} pistettä</span>
			{/if}
		</div>
	{/if}
</a>

<style>
	.season-card {
		/* Käyttäjän pyyntö 22.9.2026: `.season-card__name` fluidiksi kortin
		   OMAN leveyden (ei koko sivun/gridin) mukaan — kortti on itse
		   `cqi`-viittauskehys lapsilleen (`container-type: inline-size`),
		   tämä on turvallista koska VAIN JÄLKELÄISET (`.season-card__name`
		   jne.) käyttävät `cqi`:tä, ei kortti itse omissa ominaisuuksissaan
		   (ks. radan tarkennussivun `.section`-kommentti CSS:n itseensä
		   kohdistuvan kokokyselyn rajoituksesta — sama varovaisuus tässä). */
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		/* Käyttäjän pyyntö 22.9.2026: pienempi kuin ennen (oli `var(--space-4)
		   var(--space-6)`). */
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	/*
	 * Käyttäjän palaute 22.9.2026 (TrackCard.svelte:n yhteydessä, mutta
	 * käyttäjä koki saman kaikilla kortti-tyyppisillä komponenteilla):
	 * `translateY(-2px)`-nosto hoverissa poistettu — jäljellä pelkkä
	 * reunaväri, ks. TrackCard.svelte:n vastaava kommentti perusteluineen.
	 */
	.season-card:hover {
		border-color: var(--color-info);
	}

	.season-card__name {
		/* Käyttäjän pyyntö 22.9.2026: fluidi kortin OMAN leveyden mukaan
		   (oli kiinteä `var(--font-size-lg)`, 1.35rem) — skaalautuu
		   sulavasti riippumatta kortin senhetkisestä ruudukkoleveydestä. */
		font-size: clamp(1.05rem, 0.92rem + 1.4cqi, 1.4rem);
		font-weight: 800;
	}

	.season-card__meta {
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.season-card__leader {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-surface-border);
	}

	.season-card__leader-label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-faint);
		flex-basis: 100%;
	}

	.season-card__leader-name {
		font-weight: 800;
	}

	.season-card__leader-points {
		color: var(--color-warning);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
</style>
