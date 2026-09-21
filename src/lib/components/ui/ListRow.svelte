<script lang="ts">
	/**
	 * ListRow — geneerinen "sijoitus + nimi + tilastoluku" -rivi.
	 *
	 * Tämä EI tiedä mitään pisteistä, aikaeroista tai muusta
	 * domain-spesifisestä datasta. Se antaa vain rungon (sijoitus
	 * vasemmalla, nimi keskellä, mielivaltainen sisältö oikealla +
	 * valinnainen badge) ja kutsuja täyttää loput kahdella snippetillä.
	 * Näin sama rivipohja kelpaa sekä kauden sarjataulukkoon
	 * (ks. DriverCard.svelte) että yksittäisen kisan tuloksiin
	 * (ks. RaceResultRow.svelte) — ja jatkossa vaikka ratakohtaiseen
	 * ennätyslistaan — ilman että mitään kopioitaisiin.
	 *
	 * TS-huomio: `Snippet` on Svelte 5:n tyyppi lapsisisällölle. Tässä
	 * käytetään KAHTA nimettyä snippet-proppia (`meta`, `badge`) yhden
	 * `children`-propin sijaan, koska kutsujan pitää pystyä sijoittamaan
	 * sisältöä kahteen eri kohtaan riviä (oikea tilastoteksti vs. sen
	 * alle/viereen tuleva badge) — nimetyt snippetit ovat Svelte 5:n
	 * tapa tehdä tämä (vastaa React:in "named slots" -kikkaa).
	 */
	import type { Snippet } from 'svelte';

	let {
		position,
		positionLabel,
		positionAccent = 'default',
		name,
		featured = false,
		meta,
		metaAccent = 'muted',
		metaSecondary,
		metaSecondaryAccent = 'muted',
		badge,
		nameTrailing
	}: {
		position: number;
		/**
		 * Ylikirjoittaa vasemman laidan oletusmuodon "P{position}" —
		 * käytetään mm. tasapelin merkitsemiseen ("=" edellisen rivin
		 * kanssa jaetulle sijoitukselle), ks. mappers.ts:n
		 * `computeDisplayPositions`. Jos jätetään pois, näytetään
		 * `P{position}` kuten ennenkin.
		 */
		positionLabel?: string;
		/**
		 * Sijoituslohkon taustaväri — 'highlight' erottaa lohkon selvästi
		 * muista (esim. kisan nopeimman kierroksen ajaneelle kuljettajalle).
		 * Käyttäjän ehdotus 20.9.2026 ("mahdollisesti nopeimman kierroksen
		 * ajanut kuljettaja saa eri värisen taustan sijoitusnumerolle").
		 * 'danger' lisätty 21.9.2026 DNF-kuljettajille (käyttäjän valitsema
		 * ratkaisu: punertava korostus laatikolle, ks. RaceResultRow.svelte).
		 */
		positionAccent?: 'default' | 'highlight' | 'danger';
		name: string;
		/** Nostaa rivin isommaksi "hero"-riviksi (esim. sarjajohtaja, kisan voittaja) */
		featured?: boolean;
		/** Nimen kanssa SAMALLE RIVILLE, oikeaan reunaan tasattu tilastoteksti, esim. "362 pistettä" tai "+2.341" */
		meta?: Snippet;
		/** `meta`-tekstin väri — 'warning' korostaa esim. "jäljessä"-eroa */
		metaAccent?: 'muted' | 'warning';
		/** OMALLE RIVILLEEN, `meta`:n kanssa samaan oikeaan reunaan tasattu toinen tilastoteksti, esim. "PB: 1:27.480" */
		metaSecondary?: Snippet;
		/** `metaSecondary`-tekstin korostus — 'highlight' = oma väripohja, esim. koko kisan nopeimmalle kierrokselle */
		metaSecondaryAccent?: 'muted' | 'highlight';
		/** Valinnainen badge nimen alle, esim. "Nopein kierros" */
		badge?: Snippet;
		/**
		 * Valinnainen sisältö NIMEN KANSSA SAMALLE riville, oikeaan reunaan
		 * tasattuna (`margin-left: auto` työntää sen aina rivin loppuun,
		 * ei tarvitse erillistä `:has()`-vartijaa kuten meta-rivillä, koska
		 * tätä on aina vain yksi kappale). Käyttäjän pyyntö 21.9.2026:
		 * RaceResultRow käyttää tätä sijoitusmuutos-ilmaisimeen (▲/▼/─).
		 */
		nameTrailing?: Snippet;
	} = $props();
</script>

<article class="list-row" data-featured={featured}>
	<div class="list-row__position" data-accent={positionAccent}>
		<span class="list-row__position-text">{positionLabel ?? String(position)}</span>
	</div>
	<div class="list-row__content">
		<div class="list-row__body">
			<div class="list-row__row">
				<h3 class="list-row__name">{name}</h3>
				{#if nameTrailing}
					<span class="list-row__name-trailing">{@render nameTrailing()}</span>
				{/if}
			</div>
			{#if meta || metaSecondary}
				<div class="list-row__row list-row__row--secondary">
					{#if meta}
						<span class="list-row__meta" data-accent={metaAccent}>{@render meta()}</span>
					{/if}
					{#if metaSecondary}
						<span class="list-row__meta-secondary" data-accent={metaSecondaryAccent}>
							{@render metaSecondary()}
						</span>
					{/if}
				</div>
			{/if}
		</div>
		{#if badge}
			{@render badge()}
		{/if}
	</div>
</article>

<style>
	@layer components {
		.list-row {
			--density-scale: 1;

			/*
			 * Kortti on kokosäiliö (`container-type: inline-size`) OMILLE
			 * lapsilleen (nimi, aikaero, PB) — niiden fonttikoko skaalautuu
			 * `cqi`-yksiköillä TÄMÄN kortin leveyteen, ei selainikkunan
			 * leveyteen. Näin sama kortti näyttää yhtenäiseltä oli se sitten
			 * yksin leveällä rivillä tai ahtaassa 3-sarakkeisessa
			 * ruudukossa. Ks. https://blog.master.dev/using-container-query-units-relative-to-an-outer-container/
			 * — käyttäjän 21.9.2026 jakama tekniikka.
			 */
			container-type: inline-size;
			container-name: list-row-card;

			display: flex;
			align-items: stretch;
			/*
			 * HUOM (käyttäjän palaute 20.9.2026): sijoituslohko
			 * (.list-row__position) ulottuu nyt kortin reunaan asti omalla
			 * taustavärillään ("osa laatikkoa" eikä vain viereen aseteltu
			 * teksti). `overflow: clip` yhdessä `.list-row`:n
			 * border-radiuksen kanssa leikkaa lohkon suorat kulmat kortin
			 * pyöristettyyn muotoon — ei tarvetta laskea pyöristystä
			 * lohkolle erikseen. Itse rivin oma padding on siirretty
			 * `.list-row__content`:lle, jotta sijoituslohko voi täyttää
			 * korkeuden ja vasemman reunan ilman negatiivisia marginaaleja.
			 */
			overflow: clip;
			border-radius: var(--radius-md);
			background: var(--color-surface);
			border: 1px solid var(--color-surface-border);
			transition: border-color var(--duration-fast) var(--ease-out-quart);
		}

		.list-row:hover {
			border-color: var(--color-info);
		}

		/*
		 * HUOM (bugi löydetty 21.9.2026): tässä oli aiemmin myös
		 * `.list-row__name { font-size: var(--font-size-sm); }` —
		 * pakotti nimen kiinteään pieneen kokoon compact-tiheydessä,
		 * JUURI siinä tiheydessä jossa tulokset/sarjataulukko näytetään
		 * (ks. +page.svelte:n `data-density="compact"`). Tämä ylikirjoitti
		 * fluidin cqi-pohjaisen fonttikoon KOKONAAN käytännössä aina —
		 * teksti näytti siis aina pienemmältä kuin sen olisi tarvinnut.
		 * Poistettu: --density-scale vaikuttaa nyt VAIN paddingiin
		 * (tiiviimpi/väljempi tila kortin sisällä), ei enää fonttikokoon
		 * — fontit skaalautuvat puhtaasti kortin omasta cqi-leveydestä,
		 * jotta teksti on aina niin iso kuin tilaan mahtuu (käyttäjän
		 * pyyntö 21.9.2026: "tekstit mahdollisimman isolla").
		 */
		@container style(--density: compact) {
			.list-row {
				--density-scale: 0.65;
			}
		}
		@container style(--density: spacious) {
			.list-row {
				--density-scale: 1.3;
			}
		}
	}

	.list-row__position {
		--skew: 0.7em;

		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		/*
		 * HUOM (käyttäjän palaute 21.9.2026, neljäs kierros): "P1", "P2"
		 * jne. -> PELKKÄ NUMERO (tai "="), ja lohkon leveyden PITÄÄ olla
		 * VAKIO kaikilla riveillä — käyttäjä huomasi että pelkkä
		 * `min-width` EI riittänyt (flex-laatikko kutistui silti
		 * lyhyempien numeroiden kohdalla, koska min-width on vain
		 * ALARAJA, ei kiinteä arvo). `width: 2ch` PAKOTTAA saman
		 * leveyden joka riville — kaksi merkkiä ("22" käyttäjän
		 * antamana esimerkkinä) riittää FISU:n osallistujamääriin asti
		 * 99:ään; `ch` on numeron "0" leveys tässä fontissa, ja
		 * `tabular-nums` alla varmistaa että JOKAINEN numero on
		 * TÄSMÄLLEEN saman levyinen, joten `ch`-arvio on tarkka.
		 * Yksinumeroiset sijoitukset (ja "=") keskittyvät tämän saman
		 * levyisen alueen SISÄLLÄ `justify-content: center`:llä.
		 */
		width: 2ch;
		/* HUOM: projektin globaali reset asettaa `box-sizing: border-box`
		   kaikkialle, jolloin `width: 2ch` sisältäisi myös paddingin ja
		   itse numerolle jäisi paddingin verran vähemmän tilaa kuin
		   tarkoitus — tässä nimenomaan halutaan `content-box`, jotta
		   `width: 2ch` tarkoittaa AINA kahden merkin levyistä TEKSTI-
		   aluetta ja padding tulee sen PÄÄLLE. */
		box-sizing: content-box;
		/*
		 * Viiston kompensaatio (ks. `.list-row__position-text` alla):
		 * lisä-padding oikealle siirtää CENTER-kohdan (joka lasketaan
		 * paddingin SISÄPUOLISESTA content-boxista) visuaalisesti
		 * vasemmalle sen verran kuin viisto syö tilaa pystysuoran
		 * keskikohdan tasalla — sama laskelma kuin ennenkin, nyt vain
		 * yhdistettynä `center`:iin kiinteän `min-width`:n kanssa.
		 */
		padding-inline: calc(var(--space-3) * var(--density-scale))
			calc(var(--space-3) * var(--density-scale) + (var(--skew) / 2));
		font-size: clamp(1rem, 0.85rem + 1.5cqi, 1.35rem);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		background: color-mix(in oklch, var(--color-surface) 100%, white 6%);
		/* Viisto oikea reuna — sama visuaalinen idea kuin kilpa-ajan
		   lähtöruutumerkinnöissä, tekee lohkosta "osan laatikkoa" eikä
		   vain suorakulmaista täytettä. Käyttäjän kuva 20.9.2026. */
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--skew)) 100%, 0 100%);
	}

	/* 'highlight' = tämän rivin kuljettaja ajoi KOKO KISAN nopeimman
	   kierroksen — sijoitusnumero saa oman, selvästi erottuvan
	   taustavärin muiden rivien joukosta silmäiltäessä. Käyttäjän
	   ehdotus 20.9.2026. */
	.list-row__position[data-accent='highlight'] {
		background: color-mix(in oklch, var(--color-special) 38%, var(--color-surface));
		color: var(--color-text);
	}

	/* 'danger' = DNF (ei maaliin) — käyttäjän valitsema ratkaisu 21.9.2026,
	   sama mekanismi kuin 'highlight' mutta --color-danger-pohjaisena. */
	.list-row__position[data-accent='danger'] {
		background: color-mix(in oklch, var(--color-danger) 32%, var(--color-surface));
		color: var(--color-text);
	}

	.list-row__content {
		flex: 1 1 auto;
		/*
		 * flex-wrap: wrap tässä tärkeä yhdessä .list-row__bodyn
		 * min-widthin kanssa (ks. alempana). Ilman näitä badge
		 * (esim. "Nopein kierros") ei koskaan suostu kutistumaan
		 * pienemmäksi kuin oma tekstisisältönsä vaatii — se söi
		 * lähes koko rivin tilan ja jätti nimelle niin vähän tilaa
		 * että "Hyytiäinen" katkesi rumasti kesken sanan. Nyt badge
		 * tippuu tarvittaessa omalle rivilleen sen sijaan että
		 * puristaisi nimeä.
		 */
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		row-gap: var(--space-1);
		gap: var(--space-3);
		padding: calc(var(--space-3) * var(--density-scale)) calc(var(--space-4) * var(--density-scale));
	}

	.list-row__body {
		flex: 1 1 auto;
		/*
		 * HUOM (käyttäjän palaute 21.9.2026, kolmas kierros — "vaihtoehto
		 * B" käyttäjän vertailukuvista): NIMI on nyt AINA yksin omalla
		 * rivillään, ja aikaero+PB ovat YHDESSÄ omalla rivillään nimen
		 * ALLA (aikaero vasemmassa reunassa, PB oikeassa). Kun jokainen
		 * kenttä saa oman "sarakkeensa" sen sijaan että ne kilpailisivat
		 * tilasta samalla rivillä, kaikki kolme voivat olla selvästi
		 * isompia (ks. fonttikoot alla) — käyttäjän oma vertailu totesi
		 * tämän parhaaksi ("tuo kuvakaappaus oli muuten hyvä").
		 */
		display: flex;
		flex-direction: column;
		row-gap: var(--space-1);
	}

	.list-row__row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: var(--space-3);
	}

	/*
	 * Aikaero+PB-rivi: OLETUKSENA (vain toinen läsnä, esim. voittajalla
	 * ei ole aikaeroa, tai sarjataulukon pelkät pisteet) yksittäinen arvo
	 * tasataan OIKEAAN reunaan `flex-end`:illä. VASTA kun MOLEMMAT
	 * aikaero JA PB ovat läsnä JA sisällöllisiä (`:not(:empty)`) —
	 * `space-between` erottaa ne vastakkaisiin reunoihin (aikaero
	 * vasemmalle, PB oikealle). HUOM: pelkkä `:has(metaSecondary)` ei
	 * riittäisi, koska Svelten snippet-propsit ovat TOTUUSARVOLTAAN aina
	 * totta vaikka niiden SISÄLTÖ olisi tyhjä (esim. voittajan
	 * `gapDisplay` on `undefined` mutta `meta`-snippet on silti annettu)
	 * — siksi tarkistetaan sisällön tyhjyys `:not(:empty)`:llä, ei
	 * pelkkää elementin olemassaoloa.
	 */
	.list-row__row--secondary {
		justify-content: flex-end;
	}
	.list-row__row--secondary:has(.list-row__meta:not(:empty)):has(.list-row__meta-secondary:not(:empty)) {
		justify-content: space-between;
	}

	.list-row__name {
		/*
		 * EI min-width: 0 eikä mitään kiinteää em-arvoa tarkoituksella.
		 * Flex-lapsen OLETUS min-width on "auto" = sisällön min-content-
		 * leveys, eli PISIMMÄN KATKEAMATTOMAN SANAN leveys (koska nimi ei
		 * salli sanan sisäistä katkaisua, ks. alla) — tämä suojaa nimeä
		 * automaattisesti jokaiselle kuljettajalle erikseen ilman
		 * kiinteää arvausta.
		 */
		flex: 0 1 auto;
		/* Fluidi fonttikoko SUHTEESSA KORTIN OMAAN leveyteen (cqi =
		   container query inline-size -yksikkö, suhteessa `.list-row`:n
		   containeriin, ks. sen kommentti), ei näyttöleveyteen. HUOM
		   (21.9.2026, kolmas kierros): kasvatettu ISOMMAKSI kuin
		   edellisessä versiossa, koska nimellä on NYT oma rivinsä
		   yksinään eikä sen tarvitse enää jakaa tilaa aikaeron kanssa
		   samalla rivillä. */
		font-size: clamp(1.05rem, 0.88rem + 2.3cqi, 1.35rem);
		font-weight: 700;
		/* HUOM: EI overflow-wrap: break-word. Se nimenomaan SALLISI
		   katkaisun kesken sanan ("Hyytiäi-" / "nen") jos tilaa on
		   niukasti — juuri se mitä ei haluta. Ilman sitä selain rivittää
		   vain sanavälien kohdalta, ja .list-row__bodyn automaattinen
		   min-content-leveys (ks. yllä) varmistaa ettei body koskaan
		   kutistu pisintä sanaa kapeammaksi. */
	}

	/* Työntää sisällön (esim. sijoitusmuutos-ilmaisimen) nimirivin
	   OIKEAAN reunaan riippumatta nimen pituudesta — `flex-shrink: 0`
	   ettei se koskaan kutistu itse tekstiään pienemmäksi. */
	.list-row__name-trailing {
		margin-left: auto;
		flex-shrink: 0;
	}
	/* Sama tyhjän piilotus kuin meta/metaSecondaryssa (ks. alempana) —
	   RaceResultRow'n nameTrailing-snippet on aina "totta" propsina vaikka
	   positionChange puuttuisi. */
	.list-row__name-trailing:empty {
		display: none;
	}

	.list-row__meta {
		flex-shrink: 0;
		/* HUOM (21.9.2026, kolmas kierros): kasvatettu — aikaerolla on
		   nyt oma "sarakkeensa" PB:n vieressä, ei enää ahtaudu nimen
		   kanssa samalle riville. */
		font-size: clamp(0.85rem, 0.72rem + 1.4cqi, 1.05rem);
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* Jos `meta`-snippet on annettu mutta sen sisältö on tyhjä (esim.
	   RaceResultRow'n voittajarivi, jolla ei ole gapDisplay-arvoa),
	   piilotetaan tyhjä <span> kokonaan sen sijaan että se jättäisi
	   tyhjän tilan näkyviin. */
	.list-row__meta:empty {
		display: none;
	}

	.list-row__meta[data-accent='warning'] {
		color: var(--color-warning);
		font-weight: 700;
	}

	/* Toinen tilastoteksti (esim. oma paras kierrosaika, "PB: ...") —
	   HUOM (käyttäjän palaute 21.9.2026, kolmas kierros): OLETUSVÄRI on
	   nyt hillitty/neutraali (sama kuin `meta`), EI enää `--color-special`
	   kaikille — erikoisväri on varattu YKSINOMAAN `[data-accent=
	   'highlight']`:lle (koko kisan nopein kierros), jotta se OIKEASTI
	   erottuu muiden PB-lukujen joukosta sen sijaan että kaikki olisivat
	   samaa väriä. */
	.list-row__meta-secondary {
		/* HUOM (21.9.2026, kolmas kierros): kasvatettu edelleen — PB
		   jakaa rivin vain aikaeron kanssa, ei enää nimen, joten
		   molemmille jää enemmän tilaa. */
		font-size: clamp(0.85rem, 0.72rem + 1.4cqi, 1.05rem);
		color: var(--color-text-muted);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* Sama tyhjän piilotus kuin `.list-row__meta:empty`:ssä (ks. yllä) —
	   RaceResultRow'n metaSecondary-snippet on aina "totta" propsina
	   vaikka bestLapTime puuttuisi, jolloin span jäisi tyhjäksi ilman
	   tätä. */
	.list-row__meta-secondary:empty {
		display: none;
	}

	/* 'highlight' = tämän rivin kuljettaja ajoi KOKO KISAN nopeimman
	   kierroksen. HUOM (käyttäjän palaute 21.9.2026, kolmas kierros):
	   aiempi väripohja-"pilli" + badge poistettu turhana kaksinkertaisena
	   korostuksena (badge poistui kokonaan, ks. RaceResultRow.svelte) —
	   jäljellä on VAIN eri väri (--color-special) + lihavampi paino,
	   yhdessä sijoituslohkon oman taustavärin kanssa (ks.
	   .list-row__position[data-accent='highlight']) riittää erottamaan
	   rivin ilman ylimääräistä visuaalista painoa. */
	.list-row__meta-secondary[data-accent='highlight'] {
		color: var(--color-special);
		font-weight: 800;
	}

	/* data-featured="true" -rivi nostetaan esiin gridin sisällä —
	   ks. suunnitelman luku 3.4.4. Vaikuttaa vain kun rivi on
	   suoraan gridin lapsi (esim. .fluid-grid), ei muuten. */
	.list-row[data-featured='true'] {
		border-color: var(--color-warning);
		box-shadow: 0 0 0 1px color-mix(in oklch, var(--color-warning) 40%, transparent);
	}
</style>
