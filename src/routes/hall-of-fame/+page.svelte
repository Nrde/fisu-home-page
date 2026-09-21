<script lang="ts">
	/**
	 * Hall of Fame -sivu: ylläpidon käsin valitsemat kuljettajat, kukin
	 * lyhyellä "haastattelunomaisella" nostolla. Ks. +page.server.ts:n
	 * kommentti koko konseptista: VAIN se mitä data ei kerro (lainaus,
	 * "väliotsikko", huomio ensimmäisestä kaudesta, JA NYT MYÖS sivun
	 * johdantoteksti) on ylläpidon käsin kirjoittamaa — itse URATILASTOT
	 * tulevat `/halloffame`-endpointilta SAMASTA funktiosta kuin
	 * kuljettajan oma profiilisivu (API-kenttäkartta 22.9.2026), ei
	 * erillisestä kopiosta.
	 *
	 * `entry.statsError === true`: backendin YKSITTÄISEN kuljettajan
	 * statshaku epäonnistui (esim. simracing.fi hetkellisesti poissa) —
	 * `driverName`/`stats` ovat tällöin `undefined`. Kortti näytetään
	 * SILTI (editoriaalinen sisältö on aina läsnä), mutta nimen paikalla
	 * on driverId ja lukemien sijaan pieni virheteksti — parempi kuin
	 * pudottaa koko kortti pois tai kaataa koko sivu yhden kuljettajan takia.
	 *
	 * `data.intro`: PÄIVITYS 22.9.2026 — johdantokappale tulee nyt
	 * API:sta (ylläpidon muokattavissa, ei enää kovakoodattu tänne).
	 * `DEFAULT_INTRO` on VARATEKSTI VAIN siltä varalta ettei ylläpito ole
	 * vielä asettanut arvoa (`intro: null` API-vastauksessa) — sivu ei
	 * saa näyttää tyhjältä otsikon jälkeen sen takia. Sisältää käyttäjän
	 * valitseman vaihtoehdon A tekstin (22.9.2026).
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const DEFAULT_INTRO =
		'Tälle listalle ei pääse ihan kuka tahansa. Hall of Fame kokoaa yhteen kuljettajat, jotka ovat nousseet FISU:n kärkeen kauden toisensa jälkeen — muutama isompi kala muiden joukossa.';

	// Sama suomen partitiivi-periaate kuin kuljettajaprofiilisivulla
	// (ks. kuljettajat/[driverId]/+page.svelte:n statLabel-kommentti) —
	// 1 X (nominatiivi) mutta 0/2/3... X (partitiivi), sanakohtainen pääte.
	function statLabel(count: number, singular: string, plural: string): string {
		return count === 1 ? singular : plural;
	}
</script>

<svelte:head>
	<title>Hall of Fame — FISU</title>
	<meta name="description" content="FISU-yhteisön Hall of Fame: ylläpidon valitsemia kuljettajia ja heidän tarinoitaan." />
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Hall of Fame</h1>
	<p class="section__intro">{data.intro ?? DEFAULT_INTRO}</p>

	{#if data.isMockData}
		<p class="mock-notice">⚠ Kehitystila: uratilastojen API-yhteys epäonnistui, näytetään esimerkkidataa.</p>
	{/if}

	<div class="fluid-grid" data-minsize="320px" data-gap="4">
		{#each data.entries as entry (entry.driverId)}
			<article class="entry-card">
				<a class="entry-card__name" href="/kuljettajat/{entry.driverId}">
					{entry.driverName ?? `Kuljettaja ${entry.driverId}`}
				</a>
				<p class="entry-card__tagline">{entry.tagline}</p>
				<blockquote class="entry-card__quote">{entry.quote}</blockquote>
				<p class="entry-card__note">{entry.firstSeason}</p>

				{#if entry.stats}
					<p class="entry-card__stats">
						{entry.stats.racesEntered}
						{statLabel(entry.stats.racesEntered, 'kilpailu', 'kilpailua')} · {entry.stats.wins}
						{statLabel(entry.stats.wins, 'voitto', 'voittoa')} · {entry.stats.podiums}
						{statLabel(entry.stats.podiums, 'palkintosija', 'palkintosijaa')}
						{#if entry.stats.bestResult !== undefined}
							· paras sijoitus {entry.stats.bestResult}
						{/if}
					</p>
				{:else if entry.statsError}
					<p class="entry-card__stats-error">⚠ Uratilastoja ei juuri nyt saatavilla.</p>
				{/if}
			</article>
		{/each}
	</div>
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
	}

	.section__intro {
		margin-top: var(--space-2);
		max-width: 40rem;
		color: var(--color-text-muted);
	}

	.mock-notice {
		margin-top: var(--space-4);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: color-mix(in oklch, var(--color-warning) 15%, var(--color-bg));
		border: 1px solid color-mix(in oklch, var(--color-warning) 40%, transparent);
		color: var(--color-warning);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.fluid-grid {
		margin-top: var(--space-6);
	}

	.entry-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.entry-card__name {
		font-size: var(--font-size-lg);
		font-weight: 800;
		color: inherit;
		text-decoration: none;
	}

	.entry-card__name:hover {
		color: var(--color-info);
	}

	.entry-card__tagline {
		color: var(--color-special);
		font-weight: 700;
		font-size: var(--font-size-sm);
	}

	.entry-card__quote {
		margin-top: var(--space-2);
		padding-left: var(--space-4);
		border-left: 3px solid var(--color-surface-border);
		color: var(--color-text-muted);
		font-style: italic;
		line-height: var(--line-height-base);
	}

	.entry-card__note {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	/* Uradata — samasta lähteestä kuin kuljettajaprofiilisivun StatTilet
	   (ks. +page.server.ts), mutta esitetty tiiviinä tekstirivinä koska
	   kortin tila on rajallisempi kuin omalla profiilisivulla. */
	.entry-card__stats {
		margin-top: auto;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-surface-border);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	/* `statsError === true` — sama sijainti kortissa kuin .entry-card__stats
	   (aina alimmaisena `margin-top: auto`:lla), mutta varoitusväri kertoo
	   heti ettei kyse ole "0 kilpailua" vaan puuttuvasta datasta. */
	.entry-card__stats-error {
		margin-top: auto;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-surface-border);
		color: var(--color-warning);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}
</style>
