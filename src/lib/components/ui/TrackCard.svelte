<script lang="ts">
	/**
	 * TrackCard — /radat-indeksisivun ratakortti. Koko kortti on yksi
	 * linkki radan tarkennussivulle (ks. UpcomingRaceCard.svelte:n
	 * tyylikonventiot, joita tämä mukailee) — ei erillistä "avaa"-nappia,
	 * koska koko kortin sisältö on samaa yhtä toimintoa ("näytä tämä
	 * rata") eikä mitään muuta klikattavaa ole kortin sisällä.
	 *
	 * UUDELLEENSUUNNITTELU (22.9.2026, käyttäjän palaute): aiempi versio
	 * varasi kartalle SUORAKAITEEN muotoisen tilan (kiinteä 96px korkeus,
	 * täysi leveys) vaikka itse ratakartat ovat lähes neliön muotoisia —
	 * kartat siis "hukkuivat" liian leveään/matalaan laatikkoon. Uusi
	 * layout: `.track-card__media` on AINA neliö (`aspect-ratio: 1 / 1`),
	 * riippumatta siitä onko kuva vai `.track-card__media-placeholder`.
	 *
	 * NELJÄS KIERROS (22.9.2026, käyttäjän palaute): kortilla oli aiemmin
	 * KAKSI layout-moodia — pystysuuntainen (kartta ylhäällä) ja
	 * rivimuotoinen (kartta vasemmalla, tiedot oikealla kapeassa
	 * sarakkeessa) — jotka vaihtuivat KORTTIRUUDUKON leveyden mukaan.
	 * Käyttäjä kokeili tätä livenä ja totesi rivimuoto ei parantanut
	 * ulkoasua: kapea sivusarake ei anna tarpeeksi tilaa tiedoille, ja
	 * lisää monimutkaisuutta ilman selvää hyötyä tällä INDEKSIKORTILLA
	 * (toisin kuin radan TARKENNUSSIVULLA, ks. radat/[trackid]/+page.svelte,
	 * jossa rivimuoto ON hyödyllinen koska sivulla on paljon enemmän
	 * leveyttä käytettävissä yhdelle kortille eikä koko ruudukolle).
	 *
	 * PÄÄTÖS: tämä kortti käyttää nyt AINA SAMAA pystysuuntaista layoutia
	 * riippumatta selainikkunan leveydestä — vain `.fluid-grid`:n
	 * sarakemäärä JA fonttien `cqi`-pohjainen fluidi koko (alla) mukautuvat
	 * käytettävissä olevaan tilaan. Aiempi kaksivaiheinen container query
	 * -mekanismi (`--track-layout`, nimetty `track-grid`-kokokysely,
	 * `@container style(...)`-lohko) on siksi POISTETTU kokonaan tästä
	 * komponentista JA radat/+page.svelte:n ruudukosta — yksinkertaisempi
	 * koodi kun toista layoutia ei enää tarvita. TEKNIIKKA ITSESSÄÄN (ks.
	 * ListRow.svelte:n `--density` ja radan tarkennussivun uusi layout)
	 * on edelleen käytössä muualla koodikannassa eikä ole hylätty — vain
	 * TÄLLÄ kortilla ei ole enää tarvetta sille juuri nyt. Käyttäjä mainitsi
	 * että yksittäisille radoille voi jatkossa tulla ERI layoutteja (esim.
	 * pitkän nimen radoille), mutta se on ERI, MYÖHEMPI ominaisuus johon
	 * palataan tarvittaessa — ei toteuteta nyt.
	 *
	 * Ongelmallisin yksittäinen tapaus (erittäin pitkä ratanimi, esim.
	 * Monza) ratkaistaan käyttäjän mukaan ERI KEINOLLA: lyhyempi/järkevämpi
	 * nimi tietokannassa, ei kortin layoutilla — joten nimen `cqi`-clamp
	 * riittää tavalliselle vaihtelulle, eikä poikkeustapausta varten
	 * tarvitse enää rakentaa erillistä rivimuotoa.
	 */
	let {
		id,
		name,
		location,
		length,
		turns,
		built,
		imageUrl
	}: {
		id: string;
		name: string;
		location: string;
		length?: string;
		turns?: number;
		built?: string;
		imageUrl?: string;
	} = $props();

	let imageFailed = $state(false);
</script>

<a class="track-card" href="/radat/{id}">
	<div class="track-card__heading">
		<h3 class="track-card__name">{name}</h3>
		<p class="track-card__location">{location}</p>
	</div>
	<div class="track-card__frame">
		<div class="track-card__media">
			{#if imageUrl && !imageFailed}
				<img src={imageUrl} alt="" loading="lazy" onerror={() => (imageFailed = true)} />
			{:else}
				<!--
					Käyttäjän pyyntö 22.9.2026: EI huomiota herättävä (ei isoa
					kuvaketta/väriä), mutta ylläpitäjän pitää huomata että tältä
					radalta PUUTTUU kartta — pelkkä hillitty tekstiplaceholder
					riittää (käyttäjän oma valinta kahdesta ehdotetusta
					vaihtoehdosta: tekstipohjainen, ei kuvake).
				-->
				<div class="track-card__media-placeholder">
					<span>Ratakarttaa<br />ei vielä lisätty</span>
				</div>
			{/if}
		</div>
		{#if length !== undefined || turns !== undefined || built !== undefined}
			<div class="track-card__stats">
				{#if length !== undefined}<span class="track-card__stat" data-stat="length">{length}</span>{/if}
				{#if turns !== undefined}<span class="track-card__stat" data-stat="turns">{turns} mutkaa</span>{/if}
				{#if built !== undefined}<span class="track-card__stat" data-stat="built">v. {built}</span>{/if}
			</div>
		{/if}
	</div>
</a>

<style>
	.track-card {
		display: block;
		container-type: inline-size;
		container-name: track-card;
		border-radius: var(--radius-lg);
		overflow: clip;
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	/*
	 * Käyttäjän palaute 22.9.2026 (kolmas kierros): "hover over a card
	 * makes it shift content" — nosto-transform poistettu, jäljellä pelkkä
	 * reunaväri, samoin kuin SeasonCard.svelte:ssä ja DriverListCard.svelte:ssä.
	 */
	.track-card:hover {
		border-color: var(--color-info);
	}

	.track-card__frame {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.track-card__media {
		flex-shrink: 0;
		width: 100%;
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in oklch, white 96%, var(--color-bg));
	}

	.track-card__media img {
		display: block;
		width: 100%;
		height: 100%;
		padding: var(--space-3);
		box-sizing: border-box;
		object-fit: contain;
	}

	.track-card__media-placeholder {
		padding: var(--space-3);
		text-align: center;
		color: var(--color-text-faint);
		font-size: clamp(0.7rem, 0.6rem + 0.8cqi, 0.8rem);
		font-weight: 600;
		line-height: 1.4;
	}

	/*
	 * Kiinteä vähimmäiskorkeus nimi+sijainti-lohkolle — käyttäjän pyyntö
	 * 22.9.2026: kaikkien korttien statsit alkavat samalta korkeudelta
	 * (2 riviä nimeä + 1 rivi sijaintia riippumatta siitä onko nimi lyhyt
	 * vai pitkä). `min-height` (ei `height`) TARKOITUKSELLA — poikkeuksellisen
	 * pitkä nimi saa silti kasvattaa lohkoa tarvittaessa sen sijaan että se
	 * katkeaisi, mutta LYHYET nimet eivät enää tee korteista epätasaisen
	 * korkuisia. `.track-grid`:n `align-items: stretch` (ks. radat/
	 * +page.svelte) tasaa lopun matkan SAMAN RIVIN korteille jos joku nimi
	 * silti karkaa yli varatun tilan.
	 */
	.track-card__heading {
		padding: var(--space-3) var(--space-4) 0;
		min-height: 3.2rem;
	}

	.track-card__name {
		/* Fluidi fonttikoko suhteessa KORTIN OMAAN leveyteen (cqi, ks.
		   `.track-card`:n container-type yllä) — sama periaate kuin
		   ListRow.svelte:n `.list-row__name`:ssä. Nimi asuu koko kortin
		   leveydellä, joten tämä cqi-clamp viittaa oikeaan käytettävissä
		   olevaan tilaan. */
		font-size: clamp(0.85rem, 0.72rem + 1cqi, 1.05rem);
		font-weight: 800;
		line-height: 1.2;
	}

	.track-card__location {
		margin-top: 0.15em;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: clamp(0.78rem, 0.68rem + 0.6cqi, 0.85rem);
		line-height: 1.3;
	}

	/*
	 * Radan tiedot — käyttäjän pyyntö 22.9.2026 ("hieman värikkäämpiä tai
	 * isompia"): pieni väripohjainen "pilleri" per tilasto (oma aksenttiväri
	 * per kenttä) sen sijaan että kaikki olisi samaa hillittyä harmaata
	 * pistein eroteltua tekstiä kuten aiemmin. `--accent` asetetaan
	 * `data-stat`:in mukaan alla — sama "yksi custom property, monta
	 * käyttöpaikkaa" -periaate kuin `.list-row__position[data-accent]`:ssä.
	 */
	.track-card__stats {
		display: flex;
		flex-wrap: wrap;
		/* Statsit "justified" — tasaisesti levitettyinä koko kortin
		   leveydelle sen sijaan että ne kasautuisivat vasempaan reunaan.
		   `space-between` toimii tähän suoraan: 2-3 kohteen rivi levittyy
		   tasaisesti ensimmäisestä VIIMEISEEN kohteeseen. */
		justify-content: space-between;
		gap: var(--space-1) var(--space-2);
		padding: 0 var(--space-4) var(--space-3);
	}

	.track-card__stat {
		--accent: var(--color-info);

		padding: 0.2em 0.65em;
		border-radius: var(--radius-full);
		background: color-mix(in oklch, var(--accent) 16%, var(--color-surface));
		border: 1px solid color-mix(in oklch, var(--accent) 32%, transparent);
		color: var(--accent);
		font-size: clamp(0.78rem, 0.68rem + 0.6cqi, 0.9rem);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.track-card__stat[data-stat='turns'] {
		--accent: var(--color-special);
	}

	.track-card__stat[data-stat='built'] {
		--accent: var(--color-success);
	}
</style>
