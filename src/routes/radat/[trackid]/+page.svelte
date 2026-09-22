<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const track = $derived(data.track);

	// Sama muotoiluperiaate kuin UpcomingRaceCard.svelte:ssä (fi-FI,
	// Intl.DateTimeFormat) — tässä ilman viikonpäivää/kellonaikaa, koska
	// kisahistoria-listassa pelkkä päivämäärä riittää tunnistamaan rivin.
	function formatDate(date: Date | undefined): string | undefined {
		if (!date) return undefined;
		return new Intl.DateTimeFormat('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}

	// Ratakartta ladataan SUORAAN selaimesta simu.fi:stä (ei tämän
	// sivuston kautta, ks. mappers.ts:n TRACK_IMAGE_BASE_URL-kommentti).
	// Kaikilla radoilla ei ole karttaa (`imageUrl` on `undefined` jos
	// API ei antanut `trackimage`:a) — ja jos kuva itse epäonnistuu
	// lataamaan (esim. tuntematon tiedostonimi), piilotetaan koko
	// kuvalohko sen sijaan että näytettäisiin rikkinäinen kuvakuvake.
	let imageFailed = $state(false);

	// Käyttäjän pyyntö 22.9.2026 (kuudes kierros): "Korkeusero" näytti
	// joskus tekstin "ei" sellaisenaan (API antaa joillekin radoille
	// kirjaimellisen merkkijonon "ei" korkeuseron sijaan, ei tyhjää
	// merkkijonoa jonka `cleanOptionalText` normalisoisi `undefined`:ksi,
	// ks. mappers.ts) — käyttäjälle näkyi hämmentävä "Korkeusero: ei".
	// Tämä normalisoi SEKÄ puuttuvan ETTÄ kirjaimellisen "ei"-arvon
	// samaksi, ihmisluettavaksi selitteeksi. Muillekin kentille
	// (pituus/mutkat/rakennusvuosi) käytetään yleisempää "Ei tiedossa"
	// -selitettä jos ne joskus puuttuvat — rivi näytetään AINA (ei enää
	// ehdollisesti piiloteta kokonaan puuttuvaa tietoa, käyttäjän pyyntö).
	function elevationDisplay(elevation: string | undefined): string {
		if (!elevation || elevation.trim().toLocaleLowerCase('fi') === 'ei') return 'Ei mitattu';
		return elevation;
	}

	function orFallback(value: string | number | undefined): string {
		return value === undefined || value === '' ? 'Ei tiedossa' : String(value);
	}

	// Käyttäjän pyyntö 22.9.2026: "Kisahistoria: N kilpailua" -rivi samaan
	// laatikkoon, laskettuna TÄLLÄ SIVULLA jo olevasta `data.raceHistory`-
	// listasta (ei uutta API-kutsua) — oikea suomen kielen yksikkö/monikko
	// (1 kilpailu, 0/2+ kilpailua).
	function raceCountLabel(count: number): string {
		return count === 1 ? '1 kilpailu' : `${count} kilpailua`;
	}

	// Käyttäjän pyyntö 22.9.2026: maalippu radan nimen riville, pääteltynä
	// `location`-kentän VIIMEISESTÄ pilkulla erotetusta osasta (esim.
	// "Monza, Italia" -> "Italia"). Taulukko kattaa FISU:n kisahistoriassa
	// tyypillisesti esiintyvät maat suomenkielisillä nimillä — tuntematon
	// maa jättää lipun kokonaan pois (ei arvausta, ei virhettä).
	const COUNTRY_FLAG_CODES: Record<string, string> = {
		suomi: 'FI',
		ruotsi: 'SE',
		norja: 'NO',
		tanska: 'DK',
		islanti: 'IS',
		viro: 'EE',
		latvia: 'LV',
		liettua: 'LT',
		venäjä: 'RU',
		saksa: 'DE',
		ranska: 'FR',
		italia: 'IT',
		espanja: 'ES',
		portugali: 'PT',
		'iso-britannia': 'GB',
		britannia: 'GB',
		englanti: 'GB',
		'yhdistynyt kuningaskunta': 'GB',
		alankomaat: 'NL',
		hollanti: 'NL',
		belgia: 'BE',
		itävalta: 'AT',
		sveitsi: 'CH',
		puola: 'PL',
		tšekki: 'CZ',
		unkari: 'HU',
		kroatia: 'HR',
		slovenia: 'SI',
		slovakia: 'SK',
		romania: 'RO',
		bulgaria: 'BG',
		kreikka: 'GR',
		turkki: 'TR',
		irlanti: 'IE',
		yhdysvallat: 'US',
		kanada: 'CA',
		meksiko: 'MX',
		brasilia: 'BR',
		argentiina: 'AR',
		japani: 'JP',
		kiina: 'CN',
		'etelä-korea': 'KR',
		intia: 'IN',
		australia: 'AU',
		'uusi-seelanti': 'NZ',
		'etelä-afrikka': 'ZA',
		'yhdistyneet arabiemiirikunnat': 'AE',
		qatar: 'QA',
		bahrain: 'BH',
		'saudi-arabia': 'SA',
		singapore: 'SG',
		malesia: 'MY',
		thaimaa: 'TH',
		indonesia: 'ID'
	};

	function flagEmoji(isoCode: string): string {
		return [...isoCode.toUpperCase()].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');
	}

	function countryFlag(location: string): string | undefined {
		const country = location.split(',').at(-1)?.trim().toLocaleLowerCase('fi');
		const code = country ? COUNTRY_FLAG_CODES[country] : undefined;
		return code ? flagEmoji(code) : undefined;
	}

	const trackFlag = $derived(countryFlag(track.location));
</script>

<svelte:head>
	<title>{track.name} — Radat — FISU</title>
	<meta name="description" content="{track.name}, {track.location} — ratatiedot ja FISU:n kisahistoria." />
</svelte:head>

<section class="page-grid section">
	<a href="/radat" class="link back-link">← Kaikki radat</a>

	<!--
		Käyttäjän pyyntö 22.9.2026 (kuudes kierros): maalippu nimi+sijainti-
		rivin oikeaan reunaan, koko lohkon korkuisena (ks. tyylilohkon
		`.track-heading`-kommentti). `aria-hidden` koska lippu on puhtaasti
		koristeellinen lisä — `track.location`-teksti kertoo maan jo
		ruudunlukijalle sanallisesti.
	-->
	<div class="track-heading">
		<div class="track-heading__text">
			<h1 class="track-name">{track.name}</h1>
			<p class="track-location">{track.location}</p>
		</div>
		{#if trackFlag}
			<span class="track-heading__flag" aria-hidden="true">{trackFlag}</span>
		{/if}
	</div>

	<!--
		UUDELLEENSUUNNITTELU (22.9.2026, käyttäjän palaute): kartan +
		teknisten tietojen kääre vaihtaa layoutia yhdellä koon mukaisella
		`@container`-kyselyllä alla, joka kuuntelee `.section`:in leveyttä
		(HUOM: EI `.track-body`:n OMAA leveyttä — CSS ei salli elementin
		kysyä itseään, ks. `.section`:in kommentti tyylilohkossa): kapealla
		kartta + tekniset tiedot pinossa allekkain, riittävän leveällä
		kartta VASEMMALLA ja tekniset tiedot (NYT MYÖS rataennätys samassa
		laatikossa, ks. alla) OIKEALLA.

		NELJÄS KIERROS (22.9.2026, käyttäjän palaute): `.lap-record` ei enää
		ole oma erillinen laatikkonsa `.track-side`:n sisällä — käyttäjä
		koki sen näyttävän huonolta sivussa omana laatikkonaan. Se on nyt
		YHDISTETTY `.track-facts`-laatikkoon omaksi, erotinviivalla
		erotelluksi "rivikseen" (ks. tyylilohkon `.track-facts__record`).
		Tämän ansiosta `.track-side`-kääre-elementti tuli tarpeettomaksi
		(vain YKSI laatikko enää, ei kahta pinottua) ja on poistettu —
		`.track-map` ja `.track-facts` ovat nyt suoraan `.track-body`:n
		lapsia.
	-->
	<div class="track-body">
		{#if track.imageUrl && !imageFailed}
			<div class="track-map">
				<img
					src={track.imageUrl}
					alt="{track.name} — ratakartta"
					loading="lazy"
					onerror={() => (imageFailed = true)}
				/>
			</div>
		{/if}

		<div class="track-facts">
			<!--
				SEITSEMÄS KIERROS (22.9.2026, käyttäjän palaute): 2x2-ruudukko
				vaihdettu YHDEKSI pystysuuntaiseksi listaksi, "Labeli: arvo"
				per rivi (ei enää labeli arvon YLÄPUOLELLA kahdella rivillä) —
				ks. tyylilohkon `.track-facts__list`-kommentti perusteluineen.
				Jokainen rivi näytetään NYT AINA (ei enää `{#if x !== undefined}`
				-ehtoa yksittäisen kentän ympärillä) — puuttuva tieto näkyy
				selkeänä "Ei tiedossa/Ei mitattu" -tekstinä sen sijaan että koko
				rivi katoaisi, käyttäjän pyynnöstä.
			-->
			<div class="track-facts__list">
				<!--
					KAHDEKSAS KIERROS (22.9.2026, käyttäjän palaute): käyttäjä
					halusi ERI labelitekstit kapealle ja leveälle layoutille
					kolmelle kentälle (pituus/rakennusvuosi/kisahistoria) —
					kapealla layoutilla kaikki viisi tietoa yritetään mahduttaa
					YHDELLE riville vierekkäin, joten labeleiden pitää olla
					lyhyempiä siellä ("Pituus", "Rakennettu", "Kilpailut"),
					leveällä layoutilla (oma pystyrivinsä per tieto, enemmän
					tilaa) käytetään pidempiä, kuvaavampia labeleita ("Radan
					pituus", "Rakennusvuosi", "Kisahistoria"). Kaksi span:ia +
					CSS `display`-vaihto per layout (ks. tyylilohkon
					`.track-facts__label-short/-long`) — sama tekniikka kuin
					aiemmin ListRow/TrackCard:ssa, vain `display:none/inline`
					eikä erillistä container-nimeä tarvita koska molemmat
					reagoivat samaan `.section`-containeriin kuin muukin tässä
					layoutissa.
				-->
				<p class="track-facts__item">
					<span class="track-facts__label"
						><span class="track-facts__label-short">Pituus</span><span class="track-facts__label-long"
							>Radan pituus</span
						></span
					>
					<span class="track-facts__value">{orFallback(track.length)}</span>
				</p>
				<p class="track-facts__item">
					<span class="track-facts__label">Mutkia</span>
					<span class="track-facts__value">{orFallback(track.turns)}</span>
				</p>
				<p class="track-facts__item">
					<span class="track-facts__label">Korkeusero</span>
					<span class="track-facts__value">{elevationDisplay(track.elevation)}</span>
				</p>
				<p class="track-facts__item">
					<span class="track-facts__label"
						><span class="track-facts__label-short">Rakennettu</span><span class="track-facts__label-long"
							>Rakennusvuosi</span
						></span
					>
					<span class="track-facts__value"
						>{orFallback(track.built)}{#if track.builtExtra}<span class="track-facts__extra"
								>(rataversio {track.builtExtra})</span
							>{/if}</span
					>
				</p>
				<!--
					Käyttäjän pyyntö 22.9.2026: "jos/kun tietoloosalla on
					pystytilaa, sitä voi käyttää kisahistorian määrälle" —
					LASKETTU tällä sivulla jo olevasta `data.raceHistory`-
					listasta (ei uutta API-kutsua), ks. `raceCountLabel`.
				-->
				<p class="track-facts__item">
					<span class="track-facts__label"
						><span class="track-facts__label-short">Kilpailut</span><span class="track-facts__label-long"
							>Kisahistoria</span
						></span
					>
					<span class="track-facts__value">{raceCountLabel(data.raceHistory.length)}</span>
				</p>
			</div>

			<!--
				KAHDEKSAS KIERROS (22.9.2026, käyttäjän palaute): rataennätys
				pysyy OMANA, korostettuna lohkonaan (kartta VS. laatikko -
				korkeusongelma EI koske kapeaa pinottua layoutia, koska
				laatikolla on silloin vapaasti tilaa allaan) sekä leveällä
				layoutilla KUN laatikolla on jo reilusti tilaa (kartta iso).
				Vain sillä KAPEALLA "juuri rivimuotoon vaihdettu" -välillä,
				jossa laatikko uhkaa venyä karttaa korkeammaksi, koko
				rataennätys-lohko MUUTTUU CSS:llä näyttämään tavalliselta
				"Labeli: arvo" -riviltä (kuljettaja+auto piilotetaan
				kokonaan) — ks. tyylilohkon kolme `.track-facts__record`-tilaa
				(oletus/kapea, leveä-tiukka, leveä-tilava) SAMASTA
				muuttumattomasta markupista, ei kahta kopiota tiedosta.
			-->
			{#if track.lapRecord}
				<div class="track-facts__record">
					<p class="track-facts__record-label">Kierrosennätys</p>
					<div class="track-facts__record-row">
						<span class="track-facts__record-time">{track.lapRecord}</span>
						{#if track.lapRecordDriver || track.lapRecordCar}
							<span class="track-facts__record-driver">
								{track.lapRecordDriver}{#if track.lapRecordCar}{' '}<span
										class="track-facts__record-car">— {track.lapRecordCar}</span
									>{/if}
							</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if track.info}
		<p class="track-info">{track.info}</p>
	{/if}

	<div class="race-history">
		<h2 class="race-history__title">FISU:n kisahistoria tällä radalla</h2>
		{#if data.raceHistory.length === 0}
			<p class="race-history__empty">
				Ei löydetty FISU-kisoja tältä radalta. Tämä voi tarkoittaa ettei rataa ole vielä ajettu, tai ettei tätä
				rataa ole tunnistettu kisojen radaksi (ks. tunnetut puutteet ratatietokannassa).
			</p>
		{:else}
			<ul class="race-history__list">
				{#each data.raceHistory as entry (entry.raceId)}
					<li class="race-history__item">
						<a href="/kaudet/{entry.seasonId}/kilpailut/{entry.raceId}" class="link">{entry.seasonName}</a>
						{#if formatDate(entry.date)}
							<span class="race-history__date">{formatDate(entry.date)}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<style>
	/*
	 * `.section` on `.track-body`:n KOKOKYSELYN container (ks. alempana) —
	 * TARKOITUKSELLA EI `.track-body` itse: CSS-spesifikaatio ei salli
	 * elementin kysyä OMAA kokoaan tyylittääkseen ITSEÄÄN (kehämäinen
	 * riippuvuus layoutin laskennassa) — `@container`-kyselyn kohde on aina
	 * KYSELYN MÄÄRITTÄVÄN containerin JÄLKELÄINEN, ei container itse.
	 * `.section` on jo valmiiksi `.track-body`:n vanhempi eikä tarvitse
	 * ylimääräistä wrapper-elementtiä. Se on myös `cqi`-fonttikokojen
	 * (track-name, track-facts) viittauskehys alla.
	 */
	.section {
		container-type: inline-size;
		padding-block: var(--space-12);
	}

	.back-link {
		display: inline-block;
		margin-bottom: var(--space-6);
	}

	/*
	 * Käyttäjän pyyntö 22.9.2026 (kuudes kierros): maalippu nimi+sijainti-
	 * lohkon OIKEAAN REUNAAN, koko lohkon (molemman rivin) korkuisena —
	 * `space-between` työntää lipun ääriin, `align-items: center` keskittää
	 * sen pystysuunnassa nimen+sijainnin YHTEISTÄ korkeutta vasten.
	 */
	.track-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.track-heading__flag {
		flex-shrink: 0;
		font-size: clamp(2rem, 1.4rem + 3cqi, 3.25rem);
		line-height: 1;
	}

	/*
	 * Käyttäjän pyyntö 22.9.2026 (neljäs kierros): otsikon fonttikoko
	 * fluidiksi `.section`:in leveyden (`cqi`) mukaan — tarkoitus EI ole
	 * kasvattaa nimeä leveällä desktopilla, vaan ESTÄÄ nimeä hyppäämästä
	 * tarpeettomasti kahdelle riville kun ikkunaa kavennetaan (pienempi
	 * fontti kapealla = sama rivimäärä pysyy pidempään). `clamp`:in
	 * ala-arvo (mobiili) pidetty tarpeeksi isona ettei nimi käy liian
	 * pieneksi/vaikealukuiseksi pienillä näytöillä.
	 */
	.track-name {
		font-size: clamp(1.5rem, 1.15rem + 2.2cqi, 2.5rem);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.track-location {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	/*
	 * Kokokysely (alla) reagoi `.section`:in leveyteen (ks. sen kommentti
	 * yllä) ja tyylittää TÄTÄ, `.track-body`:tä — kapealla (oletus):
	 * pystysuuntainen pino, sama kuin aiemmin. Riittävän leveällä: kartta
	 * vasemmalla, `.track-facts` (nyt SISÄLTÄEN rataennätyksen) oikealla.
	 *
	 * Käyttäjän pyyntö 22.9.2026: molempien laatikoiden korkeus sama ja
	 * fluidisti samassa tahdissa. `align-items` on TARKOITUKSELLA jätetty
	 * oletukseensa (`stretch`) — `.track-map`:lle annetaan alempana OMA
	 * `align-self: flex-start` VAIN leveässä kyselyssä, jolloin se EI
	 * veny (pysyy omana aspect-ratio-neliönään), mutta `.track-facts`
	 * (oletus `align-self: stretch`) venyy täyttämään SAMAN rivin
	 * korkeuden minkä `.track-map`:n neliö määrää — jos tietoja on niin
	 * paljon ettei se mahtuisi kartan korkeuteen, se kasvattaa koko rivin
	 * korkeutta sen sijaan että `.track-map` venyisi neliöstä vinoksi
	 * (mikä rikkoisi sen aspect-ratio:n, ks. kokeilun kommentti alempana).
	 */
	.track-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		margin-top: var(--space-6);
	}

	.track-map {
		width: 100%;
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: color-mix(in oklch, white 96%, var(--color-bg));
		/* Sama periaate kuin TrackCard.svelte:n `.track-card__media`:ssä —
		   AINA neliö, jotta kartta ei koskaan pyri venymään korkeammaksi
		   tai jättämään tyhjää tilaa ympärilleen riippumatta kuvan omasta
		   kuvasuhteesta. */
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.track-map img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.track-facts {
		display: flex;
		flex-direction: column;
		/* Käyttäjän pyyntö 22.9.2026: sisältö "tiiviimmin korkeussuunnassa"
		   jotta rataennätys mahtuu samaan laatikkoon — `space-between`
		   jakaa `.track-facts__grid`:n ja `.track-facts__record`:n
		   tasaisesti laatikon KOKO korkeudelle (joka tulee `.track-map`:n
		   neliöstä leveässä layoutissa, ks. `.track-body`:n kommentti)
		   sen sijaan että ne kasautuisivat pelkästään laatikon yläreunaan
		   jättäen tyhjää tilaa alle. */
		justify-content: space-between;
		/* YHDEKSÄS KIERROS (22.9.2026, käyttäjän palaute): "fonttikoko ja
		   padding voivat yleisesti pienentyä" — gap JA padding muutettu
		   FLUIDIKSI (`cqi`) ja pienemmäksi kuin ennen (oli kiinteä
		   `var(--space-4)`/`var(--space-4) var(--space-6)`), jotta laatikko
		   pysyy tiiviimpänä ja lähempänä kartan neliön korkeutta koko
		   leveysalueella — kutistuu edelleen kun `.section` kapenee. */
		gap: clamp(0.5rem, 0.3rem + 0.6cqi, 1rem);
		padding: clamp(0.6rem, 0.4rem + 0.6cqi, 1.1rem) clamp(0.8rem, 0.5rem + 1.1cqi, 1.6rem);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	/*
	 * KAHDEKSAS KIERROS (22.9.2026, käyttäjän palaute — "käsitit hieman
	 * väärin"): kapea JA leveä layout näyttävät nyt taas ERI TAVALLA
	 * muotoillun listan, kuten käyttäjä alun perin tarkoitti — vain
	 * VAIHTUVAT VÄRIT/koot yhteisillä muuttujilla:
	 *
	 * - KAPEA (oletus, ei @container-ehtoa): "sirpale"-rivi — kaikki
	 *   tiedot VIEREKKÄIN samalla, koko laatikon levyisellä rivillä
	 *   (`flex-wrap: wrap` jos ei mahdu), jokainen tieto omana pienenä
	 *   palasenaan jossa labeli ON YLÄPUOLELLA arvoa, keskitettynä.
	 *   `justify-content: space-between` LEVITTÄÄ palaset koko laatikon
	 *   leveydelle (käyttäjän pyyntö: "keskitä koko rivi laatikkoon ja
	 *   käytä laatikon koko leveys (justify)" — rivit eivät saa jäädä
	 *   vasempaan reunaan kiinni jos eivät täytä koko leveyttä).
	 * - LEVEÄ (`@container (min-width:640px)` alempana): pystysuuntainen
	 *   lista, "Labeli: arvo" per rivi, VASEMMASTA REUNASTA alkaen (EI
	 *   enää keskitetty — käyttäjän nimenomainen korjaus tähän kierrokseen).
	 */
	.track-facts__list {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		width: 100%;
		/* YHDEKSÄS KIERROS: pienempi, fluidi väli (oli kiinteä `var(--space-3)
		   var(--space-4)`) — käyttäjän pyyntö pitää koko "sirpale"-rivi
		   YHDELLÄ rivillä pidempään kapennettaessa: pienempi väli + alla
		   pienempi fonttikoko antavat viidelle palaselle enemmän tilaa
		   ennen kuin ne joutuvat rivittymään kahdelle riville. */
		gap: clamp(0.4rem, 0.25rem + 0.4cqi, 0.75rem) clamp(0.5rem, 0.3rem + 0.7cqi, 1.1rem);
	}

	/*
	 * Kapea (oletus): labeli YLÄPUOLELLA arvoa, oman palasensa sisällä
	 * keskitettynä — palaset itse levitetään `.track-facts__list`:n
	 * `justify-content: space-between`:llä koko laatikon leveydelle.
	 */
	.track-facts__item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.15em;
	}

	.track-facts__label {
		/* YHDEKSÄS KIERROS: hieman pienempi kuin ennen (oli 0.85–1.05rem) —
		   käyttäjän pyyntö, auttaa sekä korkeuden sovittamisessa kartan
		   kanssa että viiden tiedon mahtumisessa yhdelle riville kapealla
		   layoutilla. */
		font-size: clamp(0.75rem, 0.64rem + 0.6cqi, 0.95rem);
		font-weight: 700;
		color: var(--color-text-muted);
	}

	/* Kaksoispiste VAIN leveällä "Labeli: arvo" -rivillä (ks. alempi
	   @container-lohko) — kapealla "sirpale"-palasella labeli on OMALLA
	   rivillään arvon yläpuolella, ei tarvitse kaksoispistettä. */
	.track-facts__label::after {
		content: '';
	}

	/* Kapea: näytä lyhyt labeliteksti ("Pituus" jne.), piilota pitkä. Leveä
	   layout kääntää nämä alempana. Kentät joilla ei ole kahta versiota
	   (Mutkia, Korkeusero, Kierrosennätys) EIVÄT käytä näitä span:eja
	   lainkaan, joten tämä ei vaikuta niihin. */
	.track-facts__label-long {
		display: none;
	}

	.track-facts__value {
		/* YHDEKSÄS KIERROS: pienennetty (oli 0.95–1.2rem) samasta syystä
		   kuin `.track-facts__label` yllä. */
		font-size: clamp(0.84rem, 0.72rem + 0.75cqi, 1.08rem);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.track-facts__extra {
		margin-left: 0.4em;
		font-size: 0.7em;
		font-weight: 600;
		color: var(--color-text-faint);
	}

	/*
	 * Kierrosennätys — KOLME eri ULKOASUA SAMALLE muuttumattomalle markupille
	 * (ei kahta kopiota tiedosta), käyttäjän pyyntö 22.9.2026 (kahdeksas
	 * kierros):
	 *
	 * 1. OLETUS (kapea, pinottu sivulayout) — oma korostettu lohkonsa:
	 *    lämmin reunaviiva, iso aika, kuljettaja+auto näkyvissä,
	 *    keskitettynä. Ei korkeusongelmaa täällä, koska laatikolla on
	 *    vapaasti tilaa kartan ALLA.
	 * 2. LEVEÄ + TILAVA (`min-width: 900px` alempana) — sama korostettu
	 *    ulkoasu, mutta VASEMMALLE tasattuna (leveän layoutin yleinen
	 *    sääntö, ks. `.track-facts__list`).
	 * 3. LEVEÄ + TIUKKA VÄLI (`640–900px` alempana) — laatikko uhkaa
	 *    venyä karttaa korkeammaksi kun sisältöä on paljon mutta tilaa
	 *    vähän: kuljettaja+auto PIILOTETAAN kokonaan JA koko lohko
	 *    MUUTTUU näyttämään tavalliselta "Labeli: arvo" -riviltä (sama
	 *    fonttikoko kuin `.track-facts__item`:ssä) — käyttäjän pyyntö,
	 *    säästää pystytilaa pitäen laatikon korkeuden samana kartan
	 *    kanssa.
	 */
	.track-facts__record {
		/* YHDEKSÄS KIERROS (22.9.2026, käyttäjän palaute): käyttäjä halusi
		   TÄMÄN erotinviivan (`border-top`) näkyvän AINA, myös leveällä
		   "tiukalla välillä" jolloin se aiemmin poistettiin kokonaan (ks.
		   alempi 640–900px-kysely) — pidetään nyt aina, mutta `padding-top`
		   pienennetty (oli `var(--space-2)`, 0.6rem) fluidiksi ja hieman
		   pienemmäksi, jotta rivin lisäämä korkeus pysyy pienempänä ja
		   laatikko sopii paremmin kartan neliön korkeuteen. */
		padding-top: clamp(0.3rem, 0.22rem + 0.3cqi, 0.5rem);
		border-top: 1px solid color-mix(in oklch, var(--color-warning) 30%, var(--color-surface-border));
		text-align: center;
	}

	.track-facts__record-label {
		/* YHDEKSÄS KIERROS: pienennetty (oli 0.72–0.85rem). Väri pidetään
		   AINA `--color-warning`:na (käyttäjän pyyntö) — myös leveällä
		   "tiukalla välillä" alla, jossa fonttikoko/kirjainkoko muuttuvat
		   mutta väri EI enää muutu himmeäksi kuten aiemmin. */
		font-size: clamp(0.65rem, 0.58rem + 0.32cqi, 0.78rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-warning);
	}

	/*
	 * Käyttäjän pyyntö 22.9.2026: aika, ajaja JA auto mahtuisivat samalle
	 * riville kun tilaa on, mutta kaventuessa ajaja+auto hyppäävät ajan
	 * ALLE — täsmälleen `flex-wrap: wrap` -rivin oletuskäytös (aika ensin,
	 * ajaja+auto toisena "kohteena" samalla rivillä niin kauan kuin
	 * mahtuu, muuten omalle rivilleen), ei tarvitse erillistä @container-
	 * haaraa tätä varten.
	 */
	.track-facts__record-row {
		margin-top: 0.25em;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		gap: 0.3em 0.6em;
	}

	.track-facts__record-time {
		/* YHDEKSÄS KIERROS: pienennetty (oli 1.15–1.5rem). */
		font-size: clamp(1.02rem, 0.85rem + 1cqi, 1.32rem);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.track-facts__record-driver {
		font-size: clamp(0.72rem, 0.65rem + 0.35cqi, 0.85rem);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.track-facts__record-car {
		color: var(--color-text-faint);
		font-weight: 400;
	}

	/*
	 * Käyttäjän pyyntö 22.9.2026: radan kuvausteksti täyttää nyt koko
	 * sivun leveyden (aiempi `max-width: 65ch` poistettu) ja on
	 * laatikoitu samaan tyyliin kuin `.track-facts` (sama taustaväri,
	 * reunus, pyöristys) sen sijaan että se olisi pelkkää irrallista
	 * leipätekstiä. Fonttikoko hieman suurempi kuin ennen.
	 */
	.track-info {
		margin-top: var(--space-6);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		font-size: var(--font-size-base);
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	/*
	 * VAIHE: leveä layout. Yksi container riittää (ks. `.track-body`:n
	 * kommentti template-osassa) — ei tarvetta TrackCard.svelte:n
	 * aiemmalle kaksivaiheiselle nimetylle tekniikalle, koska tällä
	 * sivulla ei ole rinnakkaista korttiruudukkoa jonka `auto-fit`
	 * aiheuttaisi ei-monotonisen oskillaation. 640px valittu niin että
	 * `.track-map`:lle jää vähintään ~350px ja `.track-facts`:lle
	 * vähintään ~260px ennen vaihtoa.
	 */
	@container (min-width: 640px) {
		.track-body {
			flex-direction: row;
		}

		.track-map {
			/* Fluidi koko (käyttäjän pyyntö) — kasvaa/kutistuu jatkuvasti
			   `.section`:in leveyden mukana `cqi`:llä, rajattuna järkevään
			   min/max-väliin. `align-self: flex-start` (ei `stretch`) pitää
			   tämän AINA omana aspect-ratio-neliönään riippumatta
			   `.track-facts`:n mahdollisesti suuremmasta sisällöstä — ks.
			   `.track-body`:n kommentti selityksestä miksi `stretch` täällä
			   rikkoisi neliön. */
			align-self: flex-start;
			/* `flex-shrink: 0` on TÄRKEÄ: oletus (`1`) antaisi flex-rivin
			   kutistaa kartan ALLE sen oman `width`-clampin minimin kun
			   `.track-facts`:n sisältö tarvitsee tilaa (mitattu Playwright-
			   harnessilla juuri 640px kokokyselyn rajan yläpuolella:
			   kartta kutistui 213px:ään vaikka clamp:in minimi on 240px).
			   `.track-facts`:lla on jo `min-width: 0` joustamaan sen
			   sijaan. */
			flex-shrink: 0;
			width: clamp(15rem, 34cqi, 23rem);
		}

		.track-facts {
			/* Oletus `align-self: stretch` (peritty `.track-body`:n
			   `align-items`:stä) venyttää tämän `.track-map`:n neliön
			   korkuiseksi — ks. `.track-body`:n kommentti. */
			flex: 1 1 auto;
			min-width: 0;
		}

		/*
		 * KAHDEKSAS KIERROS (22.9.2026, käyttäjän korjaus): leveällä
		 * layoutilla lista on pystysuuntainen "Labeli: arvo" per rivi,
		 * VASEMMASTA REUNASTA alkaen — EI enää keskitetty (oletustila
		 * yllä on kapean layoutin "sirpale"-rivi, joka on keskitetty ja
		 * levitetty koko leveydelle; leveällä sen sijaan jokainen tieto
		 * on oma täysileveä rivinsä joten keskitys ei ole enää tarpeen
		 * eikä toivottu).
		 */
		.track-facts__list {
			flex-direction: column;
			flex-wrap: nowrap;
			align-items: flex-start;
			width: auto;
			/* YHDEKSÄS KIERROS: pienennetty ja fluidi (oli kiinteä
			   `var(--space-2)`), sama korkeuden-sovitus-syy kuin muualla
			   tässä kierroksessa. */
			gap: clamp(0.35rem, 0.25rem + 0.3cqi, 0.6rem);
		}

		.track-facts__item {
			flex-direction: row;
			align-items: baseline;
			text-align: left;
			gap: 0.4em;
		}

		.track-facts__label::after {
			content: ':';
		}

		/* Leveällä layoutilla käytetään PIDEMPÄÄ, kuvaavampaa labelitekstiä
		   (enemmän tilaa kun jokainen tieto on omalla rivillään) — kapea
		   layoutti (oletus yllä) näyttää lyhyen version. */
		.track-facts__label-short {
			display: none;
		}

		.track-facts__label-long {
			display: inline;
		}

		/* Kierrosennätys pysyy OMANA korostettuna lohkonaan kun laatikolla on
		   jo reilusti tilaa (leveä + tilava, ks. alempi min-width:900px
		   -lohko) — VASEMMALLE tasattuna leveän layoutin yleisen säännön
		   mukaisesti (ks. yllä). Tiukalla 640–900px-välillä tämä
		   kumotaan alla omaksi "Labeli: arvo" -riviksi. */
		.track-facts__record {
			text-align: left;
		}

		.track-facts__record-row {
			justify-content: flex-start;
		}
	}

	/*
	 * KAHDEKSAS KIERROS (22.9.2026, käyttäjän palaute): juuri 640px-rajan
	 * yläpuolella kartan neliö on vielä PIENIMMILLÄÄN (`.track-map`:n
	 * `clamp`-minimi) samalla kun `.track-facts`:n sisältö on VAKIO (ei
	 * pienene samaa tahtia) — laatikko voi käydä kartan neliötä
	 * korkeammaksi tällä kapealla välillä. Käyttäjän ratkaisu TÄLLÄ
	 * kierroksella menee PIDEMMÄLLE kuin aiemmin (pelkkä kuljettaja+auto
	 * piilotus ei riittänyt): kuljettaja+auto piilotetaan JA KOKO
	 * rataennätys-lohko MUUTTUU näyttämään tavalliselta listan riviltä
	 * ("Kierrosennätys: 1:21.046", suunnilleen samaa kokoluokkaa kuin
	 * muilla riveillä) — `display: contents` rivikääreellä
	 * (`.track-facts__record-row`) poistaa sen OMAN laatikkonsa kokonaan,
	 * jolloin sen sisällä oleva `.track-facts__record-time` nousee
	 * suoraan `.track-facts__record`:n flex-lapseksi labelin VIEREEN —
	 * muuten sama rakenne kuin `.track-facts__item`:llä. `min-width`/
	 * `max-width`-PARI kohdistaa tämän VAIN tälle tiukalle välille —
	 * reilusti leveämmällä (`min-width: 900px` alla) korostettu ulkoasu
	 * palaa.
	 *
	 * YHDEKSÄS KIERROS (22.9.2026, käyttäjän palaute): kaksi asiaa
	 * SÄILYTETÄÄN nyt myös tässä tiukassa tilassa, toisin kuin aiemmin —
	 * (1) erotinviiva (`padding-top`/`border-top`) yläpuolella, EI enää
	 * poisteta; (2) labelin lämmin `--color-warning`-väri, EI enää
	 * vaihdeta himmeäksi. Vain fonttikoko pienenee lähemmäs muiden
	 * rivien kokoa ja layout muuttuu inline-riviksi — `padding-top`/
	 * `border-top` PERITÄÄN nyt suoraan `.track-facts__record`:n
	 * perusversiosta (ei enää omaa ylikirjoitusta täällä).
	 */
	@container (min-width: 640px) and (max-width: 899.98px) {
		.track-facts__record {
			display: flex;
			align-items: baseline;
			gap: 0.4em;
		}

		.track-facts__record-label {
			font-size: clamp(0.75rem, 0.64rem + 0.6cqi, 0.95rem);
			text-transform: none;
			letter-spacing: normal;
		}

		.track-facts__record-label::after {
			content: ':';
		}

		.track-facts__record-row {
			display: contents;
			margin-top: 0;
		}

		.track-facts__record-time {
			font-size: clamp(0.84rem, 0.72rem + 0.75cqi, 1.08rem);
			font-weight: 800;
		}

		.track-facts__record-driver {
			display: none;
		}
	}

	.race-history {
		margin-top: var(--space-8);
	}

	.race-history__title {
		font-size: var(--font-size-lg);
		font-weight: 800;
		margin-bottom: var(--space-4);
	}

	.race-history__empty {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		max-width: 60ch;
	}

	.race-history__list {
		/* Käyttäjän pyyntö 22.9.2026 (kuudes kierros): kisahistorialista
		   näytti muuta sisältöä KAPEAMMALTA ja sisennetyltä — `<ul>`:n
		   SELAIMEN OLETUSTYYLI (`padding-inline-start: 40px` + pisteet)
		   EI ollut nollattu missään, toisin kuin muut elementit joita
		   `reset.css`:n `* { margin: 0 }` kattaa (se nollaa marginaalin,
		   ei paddingia). `list-style: none` poistaa myös piilossa olleet
		   luettelopisteet (eivät näkyneet koska rivit ovat `<li>`:n
		   SISÄLLÄ omina laatikkoinaan, mutta veivät silti tilaa layoutista
		   riippuen selaimesta). */
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.race-history__item {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.race-history__date {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
	}
</style>
