<script lang="ts">
	/** Auton tarkennussivu. */
	import ReviewSummarySection from '#lib/components/ui/ReviewSummarySection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const car = $derived(data.car);

	// Isompi esikatselukuva kuin autolistan CarCard.svelte:ssä (käyttäjän
	// pyyntö 11.10.2026: "I would like to get slightly bigger image on the
	// individual car page and smaller for the car list page") — toistaiseksi
	// SAMA PNG molemmissa paikoissa (kokoerot hoidetaan CSS:llä), kiinteä-
	// kokoiset webp-versiot tulossa myöhemmin (ks. mappers.ts:n
	// `Car.imageUrl`-kommentti). `imageFailed` samalla periaatteella kuin
	// CarCard.svelte:ssä — ylläpito ei ole latautunut kuvaa kaikille autoille.
	let imageFailed = $state(false);
	// Nollataan kun navigoidaan autosta toiseen SAMAN komponentti-instanssin
	// sisällä (SvelteKit ei purkaisi/luo komponenttia uudelleen pelkän route-
	// parametrin muuttuessa) — muuten edellisen auton 404 jäisi "jumiin"
	// seuraavalle autolle vaikka sillä olisi kuva.
	$effect(() => {
		car.id;
		imageFailed = false;
	});

	// Sama muotoiluperiaate kuin muualla sivustolla (fi-FI, Intl.DateTimeFormat).
	function formatDate(date: Date | undefined): string | undefined {
		if (!date) return undefined;
		return new Intl.DateTimeFormat('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}

	/**
	 * Simulaattoripilleri auton nimen vieressä (käyttäjän pyyntö 25.9.2026:
	 * "just make it a pill ... style them so each simulator has its own
	 * colors and they would be easily distinguishable" — pois aiemmasta
	 * isosta "Simulaattori: X" -rivistä `.car-facts`-laatikossa). Tunnetut
	 * lyhenteet saavat oman värinsä JA kokonaisen nimen (esim. "AC" ->
	 * "Assetto Corsa") — tuntematon/uusi lyhenne näytetään SELLAISENAAN
	 * neutraalilla värillä sen sijaan että arvattaisiin nimi tai piilotettaisiin
	 * koko pilleri, koska ylläpito voi lisätä uusia simulaattoreita
	 * autosanakirjaan milloin tahansa (`sim`-kenttä on vapaa merkkijono
	 * API:ssa, ei rajattu enumiin).
	 */
	const SIM_INFO: Record<string, { label: string; accent: 'success' | 'info' | 'special' | 'warning' | 'danger' }> = {
		AC: { label: 'Assetto Corsa', accent: 'success' },
		ACC: { label: 'Assetto Corsa Competizione', accent: 'info' },
		RF2: { label: 'rFactor 2', accent: 'special' },
		IRACING: { label: 'iRacing', accent: 'warning' },
		R3E: { label: 'RaceRoom', accent: 'danger' },
		AMS2: { label: 'Automobilista 2', accent: 'success' }
	};

	function simBadge(sim: string): { label: string; accent: 'success' | 'info' | 'special' | 'warning' | 'danger' } {
		return SIM_INFO[sim.toUpperCase()] ?? { label: sim, accent: 'info' };
	}

	// KORJAUS (11.10.2026, käyttäjän palaute): ensimmäinen versio tästä
	// uudelleensuunnittelusta laittoi luokan/kausimäärän omaan "Labeli: arvo"
	// -laatikkoon sivuun — käyttäjän mukaan laatikko näytti isolta tyhjältä
	// tilalta kahdella rivillä sisältöä ("the current huge box on the side
	// and 2 lines of content looks bad"). Luokka ja kausimäärä näytetään nyt
	// sen sijaan PIENINÄ PILLEREINÄ nimen alla ILMAN labeleita (sama "pilli"-
	// resepti kuin `car.sim`:llä, ks. `simBadge`/`.car-sim-badge`) — sivuun
	// jäänyt laatikko käytetään nyt `car.notes`-kuvaustekstille (ks. markup).
	// `seasonCountLabel` säilyy, `orFallback` poistettu (pillerit NÄYTETÄÄN
	// vain kun arvo on olemassa, ei enää "Ei tiedossa" -tekstiä labelittomassa
	// pillerissä — se näyttäisi oudolta tyhjänä tagina).
	function seasonCountLabel(count: number): string {
		return count === 1 ? '1 kausi' : `${count} kautta`;
	}
</script>

<svelte:head>
	<title>{car.name} — Autot — FISU</title>
	<meta name="description" content="{car.name} — auton tiedot, kaudet ja kilpailut." />
</svelte:head>

<section class="page-grid section">
	<!-- Käyttäjän pyyntö 26.10.2026 (TODO.md): "← Kaikki autot" poistettu —
	     duplikaatti Header-valikon "Autot"-linkin kanssa, ei tarvita erikseen. -->
	<!--
		Otsikkolohko — SAMA rakenne kuin radat/[trackid]/+page.svelte:n
		`.track-heading`:lla (käyttäjän pyyntö 11.10.2026: "make the structure
		of car detail page similar to track detail layout"): nimi+lisätieto
		VASEMMALLA omana tekstilohkonaan, erottuva "tunniste" (radalla maalippu,
		autolla simulaattoripilleri) OIKEASSA REUNASSA koko lohkon korkuisena.
	-->
	<div class="car-heading">
		<div class="car-heading__text">
			<h1 class="car-name">{car.name}</h1>
			{#if car.manufacturer}
				<p class="car-manufacturer">{car.manufacturer}</p>
			{/if}
			<!--
				Luokka + kausimäärä PIENINÄ PILLEREINÄ nimen alla, ILMAN labeleita
				(käyttäjän palaute 11.10.2026 — ks. script-lohkon kommentti).
				Kausipilleri näkyy VAIN jos autolla on vähintään yksi kausi
				historiassa (`0 kautta` -pilleri ei toisi mitään hyötyä, sama
				periaate kuin luokan puuttuessa — piilotetaan kokonaan sen sijaan
				että näytettäisiin tyhjä/arvoton tagi).
			-->
			{#if car.class || data.seasonHistory.length > 0}
				<div class="car-tags">
					{#if car.class}
						<span class="car-tag" data-accent="warning">{car.class}</span>
					{/if}
					{#if data.seasonHistory.length > 0}
						<span class="car-tag" data-accent="info">{seasonCountLabel(data.seasonHistory.length)}</span>
					{/if}
				</div>
			{/if}
		</div>
		{#if car.sim}
			{@const sim = simBadge(car.sim)}
			<span class="car-sim-badge" data-accent={sim.accent}>{sim.label}</span>
		{/if}
	</div>

	<!--
		Kuva + kuvauslaatikko rinnakkain — SAMA `.track-body`-periaate kuin
		radan tarkennussivulla: kapealla pinossa, riittävän leveällä kuva
		vasemmalla ja laatikko oikealla samankorkuisena (ks. tyylilohkon
		`.car-body`-kommentti). Kuva piilotetaan kokonaan jos se 404:ää (ks.
		`imageFailed`-kommentti script-lohkossa). Sivuun (tai mobiililla
		kuvan ALLE) jäänyt laatikko näyttää NYT `car.notes`-kuvaustekstin
		(käyttäjän palaute 11.10.2026 — aiempi erillinen luokka/kausi-sisältö
		siirrettiin pillereiksi yllä, joten laatikko ei ollut enää tyhjillään
		ilman tätä sisältöä). Jos autolla ei ole kuvaustekstiä, koko laatikko
		jätetään pois (ei näytetä tyhjää laatikkoa).
	-->
	<div class="car-body">
		{#if !imageFailed}
			<div class="car-image">
				<img src={car.imageUrl} alt="" loading="lazy" onerror={() => (imageFailed = true)} />
			</div>
		{/if}

		{#if car.notes}
			<div class="car-facts">
				<p class="car-facts__notes">{car.notes}</p>
			</div>
		{/if}
	</div>

	<!--
		PÄIVITYS (2.10.2026): käyttäjän 25.9.2026 mainitsema "tulossa"-ominaisuus
		(kuljettajapalautteeseen perustuva arviointi) ON NYT TOTEUTETTU — aiempi
		pelkkä maininta-kappale korvattu oikealla arvostelulohkolla alla. Itse
		arvostelun ANTAMINEN tapahtuu erillisellä /arvostelut-sivulla (vaatii
		kevyen SteamID+salasana-"kirjautumisen", ks. sen oma kommentti) — tämä
		sivu näyttää vain JULKISEN, jo kerätyn yhteenvedon.
	-->
	{#if data.reviews}
		<ReviewSummarySection
			title="Auton arvostelut"
			count={data.reviews.summary.count}
			average={data.reviews.summary.average}
			distribution={data.reviews.summary.distribution}
			notes={data.reviews.notes}
		/>
	{/if}

	<div class="season-history">
		<h2 class="season-history__title">Kaudet ja kilpailut</h2>
		{#if data.seasonHistory.length === 0}
			<p class="season-history__empty">
				Ei löydetty kausia joilla tämä auto olisi ollut käytössä.
			</p>
		{:else}
			<ul class="season-history__list">
				{#each data.seasonHistory as season (season.seasonId)}
					<li class="season-history__season">
						<a href="/kaudet/{season.seasonId}" class="link season-history__season-name">{season.seasonName}</a>
						{#if !season.exclusive && season.races.length === 0}
							<p class="season-history__note">
								Kaudella käytössä useampi auto — ei tiedossa mitkä kilpailut ajettiin juuri tällä autolla.
							</p>
						{:else if season.races.length > 0}
							<ul class="season-history__races">
								{#each season.races as race (race.raceId)}
									<li class="season-history__race">
										{#if race.finished}
											<a href="/kaudet/{season.seasonId}/kilpailut/{race.raceId}" class="link"
												>{race.trackName}</a
											>
										{:else}
											<span>{race.trackName}</span>
										{/if}
										{#if formatDate(race.date)}
											<span class="season-history__race-date">{formatDate(race.date)}</span>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<style>
	/* `container-type` tähän (ei `.car-heading`:iin itseensä) — elementti ei
	   voi @container-kysyä OMAA kokoaan, ks. radat/[trackid]/+page.svelte:n
	   `.section`-kommentti samasta periaatteesta. Auton nimen ja simulaattori-
	   pillerin fluidit koot alla viittaavat tähän. */
	.section {
		container-type: inline-size;
		padding-block: var(--space-12);
	}

	/*
	 * Otsikkolohko — SAMA rakenne/perustelu kuin radat/[trackid]/+page.svelte:n
	 * `.track-heading`:lla: tekstilohko (nimi+valmistaja) VASEMMALLA,
	 * simulaattoripilleri OIKEASSA REUNASSA koko lohkon (molempien rivien)
	 * korkuisena — `space-between` työntää pillerin ääriin, `align-items:
	 * center` keskittää sen pystysuunnassa tekstilohkon korkeutta vasten.
	 * UUDELLEENSUUNNITTELU 11.10.2026 (käyttäjän pyyntö, ks. script-lohkon
	 * kommentti): korvaa aiemman `align-items: baseline` -rivin jossa pilleri
	 * oli nimen VIERESSÄ samalla rivillä — track-sivun kaltainen asettelu
	 * toimii paremmin kun nimi+valmistaja ovat KAKSI riviä (track-sivulla
	 * nimi+sijainti), ei yksi.
	 */
	.car-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.car-name {
		/* Fluidi kokoa suhteessa `.section`:in leveyteen (cqi), sama periaate
		   kuin aiemmin — estää nimeä hyppäämästä tarpeettomasti kahdelle
		   riville kun ikkunaa kavennetaan. */
		font-size: clamp(1.4rem, 1.1rem + 2.4cqi, 2.25rem);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.car-manufacturer {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	/*
	 * Luokka + kausimäärä -pillerit (käyttäjän palaute 11.10.2026 — ks.
	 * script-lohkon kommentti) — `flex-wrap: wrap` sallii pudota useammalle
	 * riville jos tila loppuu kesken (ei realistista kahdella lyhyellä
	 * pillerillä, mutta sama turvaverkko kuin muuallakin sivustolla).
	 */
	.car-tags {
		margin-top: var(--space-2);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/*
	 * Sama "pilli, oma väri per arvo" -resepti kuin `.car-sim-badge`:lla
	 * (ja TrackCard.svelte:n `.track-card__stat`:lla) — VAIN pienempi, koska
	 * näitä on kaksi rinnakkain eikä niiden tarvitse kilpailla huomiosta
	 * simulaattoripillerin tai nimen kanssa.
	 */
	.car-tag {
		--accent: var(--color-info);

		display: inline-flex;
		align-items: center;
		padding: 0.2em 0.75em;
		border-radius: var(--radius-full);
		background: color-mix(in oklch, var(--accent) 16%, var(--color-surface));
		border: 1px solid color-mix(in oklch, var(--accent) 32%, transparent);
		color: var(--accent);
		font-size: clamp(0.68rem, 0.6rem + 0.4cqi, 0.8rem);
		font-weight: 700;
		white-space: nowrap;
	}

	.car-tag[data-accent='warning'] {
		--accent: var(--color-warning);
	}
	.car-tag[data-accent='info'] {
		--accent: var(--color-info);
	}

	/*
	 * Simulaattoripilleri — sama "pilli, oma väri per arvo" -resepti kuin
	 * TrackCard.svelte:n `.track-card__stat`:lla, sovellettuna `data-accent`:iin
	 * SIM_INFO-taulukon (script-lohko) antaman aksentin mukaan. `flex-shrink: 0`
	 * TÄRKEÄ nyt kun pilleri on `.car-heading`:n `space-between`-rivillä eikä
	 * enää samalla tekstirivillä nimen kanssa — ilman sitä se voisi puristua
	 * kapealla näytöllä.
	 */
	.car-sim-badge {
		--accent: var(--color-info);

		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		padding: 0.25em 0.85em;
		border-radius: var(--radius-full);
		background: color-mix(in oklch, var(--accent) 16%, var(--color-surface));
		border: 1px solid color-mix(in oklch, var(--accent) 32%, transparent);
		color: var(--accent);
		font-size: clamp(0.7rem, 0.62rem + 0.5cqi, 0.85rem);
		font-weight: 700;
		white-space: nowrap;
	}

	.car-sim-badge[data-accent='success'] {
		--accent: var(--color-success);
	}
	.car-sim-badge[data-accent='danger'] {
		--accent: var(--color-danger);
	}
	.car-sim-badge[data-accent='warning'] {
		--accent: var(--color-warning);
	}
	.car-sim-badge[data-accent='info'] {
		--accent: var(--color-info);
	}
	.car-sim-badge[data-accent='special'] {
		--accent: var(--color-special);
	}

	/*
	 * Kuva + tietolaatikko rinnakkain — SAMA `@container`-tekniikka ja
	 * perustelu kuin radat/[trackid]/+page.svelte:n `.track-body`:lla:
	 * `.section` (ei `.car-body` itse, ks. sen oma kommentti CSS:n alussa)
	 * on kokokyselyn container, kapealla pinossa pystysuunnassa, riittävän
	 * leveällä kuva vasemmalla ja `.car-facts` oikealla samankorkuisena
	 * (`align-items` oletuksessaan `stretch`, `.car-image`:lle oma
	 * `align-self: flex-start` VAIN leveässä kyselyssä pitämään sen neliönä).
	 */
	.car-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		margin-top: var(--space-6);
	}

	/*
	 * Esikatselukuva (käyttäjän pyyntö 11.10.2026) — sama "vaalea neliö"
	 * -tausta kuin CarCard.svelte:n `.car-card__media`:ssa ja radan
	 * `.track-map`:ssa, jotta tumma/valkoinen autokuva erottuu samalla
	 * tavalla kaikissa kolmessa paikassa. `object-fit: cover` + nollapadding
	 * (käyttäjän palaute 11.10.2026 — "the preview image is also zoomed out
	 * so the offwhite shows from behind"): täyttää koko neliön valkopohjaisella
	 * kuvalla, ettei tausta kurkista reunoilta läpi.
	 */
	.car-image {
		width: 100%;
		aspect-ratio: 1 / 1;
		border-radius: var(--radius-lg);
		background: color-mix(in oklch, white 96%, var(--color-bg));
		overflow: hidden;
	}

	.car-image img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/*
	 * Kuvauslaatikko (käyttäjän palaute 11.10.2026 — ks. script-lohkon ja
	 * markup-kommentin selitys): näyttää `car.notes`-vapaatekstin samalla
	 * laatikoinnilla kuin aiempi `.car-facts`/radan `.track-info`, mutta
	 * nyt `.car-body`:n TOISENA sarakkeena (kuvan vierellä leveällä,
	 * ALAPUOLELLA kapealla) sen sijaan että se olisi erillinen koko levyinen
	 * lohko — täyttää aiemmin tyhjäksi jääneen tilan kuvan vieressä.
	 */
	.car-facts {
		display: flex;
		align-items: center;
		padding: clamp(0.8rem, 0.5rem + 1.1cqi, 1.6rem);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.car-facts__notes {
		font-size: var(--font-size-base);
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	/* VAIHE: leveä layout — sama 640px-raja kuin radan tarkennussivulla. */
	@container (min-width: 640px) {
		.car-body {
			flex-direction: row;
		}

		.car-image {
			align-self: flex-start;
			flex-shrink: 0;
			width: clamp(15rem, 34cqi, 23rem);
		}

		.car-facts {
			flex: 1 1 auto;
			min-width: 0;
		}
	}

	.season-history {
		margin-top: var(--space-8);
	}

	.season-history__title {
		font-size: var(--font-size-lg);
		font-weight: 800;
		margin-bottom: var(--space-4);
	}

	.season-history__empty {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		max-width: 60ch;
	}

	/* `reset.css` nollaa vain marginaalin, ei `<ul>`:n oletuspaddingia/
	   pisteitä — sama tunnettu korjaus kuin muuallakin sivustolla. */
	.season-history__list,
	.season-history__races {
		list-style: none;
		padding: 0;
	}

	.season-history__list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.season-history__season {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.season-history__season-name {
		font-weight: 700;
	}

	.season-history__note {
		margin-top: var(--space-1);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	.season-history__races {
		margin-top: var(--space-2);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.season-history__race {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		padding-left: var(--space-3);
		font-size: var(--font-size-sm);
	}

	.season-history__race-date {
		color: var(--color-text-faint);
		font-variant-numeric: tabular-nums;
	}
</style>
