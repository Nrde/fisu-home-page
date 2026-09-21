<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';

	/**
	 * Käyttäjän pyyntö 22.9.2026: kun mitään kautta ei ole käynnissä
	 * (`isOngoing === false` — normaalitila suurimman osan vuotta, ks.
	 * +page.server.ts:n/mappers.ts:n CurrentSeason.isOngoing-kommentti),
	 * "Käynnissä nyt" -badge, kauden nimi ja "Katso kausi"/"Kuljettajat"
	 * -napit eivät näytä oikealta viimeisimmän PÄÄTTYNEEN kauden päällä —
	 * ne on poistettu tältä (kompaktilta) tilalta kokonaan sen sijaan
	 * että näytettäisiin harhaanjohtavasti kuin jokin olisi meneillään.
	 * TULEVAISUUS (ei vielä toteutettu, käyttäjän oma huomio): kun
	 * `isOngoing === true`, tähän voi lisätä jotain kauteen liittyvää
	 * (badge/nimi/CTA:t) — `isOngoing`-prop on jo olemassa juuri tätä
	 * varten, vain sisältö `{#if data.currentSeason.isOngoing}`-lohkoon
	 * puuttuu vielä.
	 */
	let {
		seasonName,
		isOngoing = false,
		organiserName = 'Finnish Simracing United'
	}: {
		seasonName: string;
		isOngoing?: boolean;
		organiserName?: string;
	} = $props();
</script>

<section class="hero bleed" data-compact={!isOngoing}>
	<div class="hero__glow" aria-hidden="true"></div>
	<div class="hero__content">
		{#if isOngoing}
			<Badge accent="info">Käynnissä nyt</Badge>
		{/if}
		<h1 class="hero__title">
			{organiserName}
		</h1>
		{#if isOngoing}
			<p class="hero__subtitle">{seasonName}</p>
			<div class="hero__actions">
				<Button variant="primary" href="/kaudet">Katso kausi</Button>
				<Button variant="ghost" href="/kuljettajat">Kuljettajat</Button>
			</div>
		{/if}
	</div>
</section>

<style>
	.hero {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 70svh;
		padding-block: var(--space-16);
		overflow: clip;
		text-align: center;
	}

	/* 'compact' = ei käynnissä olevaa kautta (ks. script-kommentti) — vain
	   otsikko näkyy, joten koko hero-lohko voi olla paljon matalampi eikä
	   turhaan vie 70% näytön korkeudesta pelkälle otsikkoriville. Käyttäjän
	   pyyntö 22.9.2026: "main text... slightly less padding/margin" —
	   ja lisäpyyntö samana päivänä: tuo oli hieman LIIAN tiukka, joten
	   ylä-/alapaddingia lisätty hieman takaisin (space-10->space-12,
	   space-6->space-8) — silti selvästi kevyempi kuin ei-kompakti
	   70svh-tila, mutta otsikko ei ole enää liian tiiviisti kiinni
	   reunoissa. */
	.hero[data-compact='true'] {
		min-height: 0;
		padding-block: var(--space-12) var(--space-8);
	}

	.hero__glow {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(
				ellipse 60% 50% at 50% 0%,
				color-mix(in oklch, var(--color-info) 22%, transparent),
				transparent 70%
			),
			radial-gradient(
				ellipse 40% 40% at 85% 30%,
				color-mix(in oklch, var(--color-special) 14%, transparent),
				transparent 70%
			);
	}

	.hero__content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		max-width: 48rem;
	}

	.hero__title {
		font-size: var(--font-size-hero);
		font-weight: 900;
		letter-spacing: -0.02em;
		/* 0.95 leikkasi alamerkkejä (g, y) koska rivikorkeus jäi
		   kirjaimen todellista mittaa pienemmäksi — background-clip:
		   text noudattaa rivilaatikon rajoja tarkasti. 1.05 antaa
		   alamerkeille tilan ja pysyy silti visuaalisesti tiiviinä. */
		line-height: 1.05;
		padding-block-end: 0.08em;
		background: linear-gradient(160deg, var(--color-text) 30%, var(--color-info) 100%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.hero__subtitle {
		font-size: var(--font-size-lg);
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.hero__actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>
