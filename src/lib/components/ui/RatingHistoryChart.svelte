<script lang="ts">
	/**
	 * Kuljettajan oman reittauksen kehitys viivagraafina — UUSI 29.10.2026,
	 * käyttäjän pyyntö kuljettajan profiilisivulle, HIOTTU 30.10.2026 KAHDELLA
	 * palautekierroksella. Tarkoituksella uudelleenkäytettävä komponentti
	 * (ainoa propsi on `points`, ei mitään sivukohtaista) — käyttäjä mainitsi
	 * erikseen haluavansa liittää tämän myöhemmin myös `/rating`-sivulle,
	 * joten mitään kuljettajasivu-spesifistä (otsikko, linkit) ei laiteta
	 * TÄHÄN komponenttiin, ne pysyvät kutsuvassa `+page.svelte`:ssä.
	 *
	 * Käyttäjän oma kuvaus: vakiokorkuisessa graafissa y-akselin ala-/
	 * yläraja on suhteutettu VAIN TÄMÄN kuljettajan oman reittauksen
	 * minimiin/maksimiin (+/-10 näkyvää lukua pehmikkeeksi, esim. 1200/1800
	 * -> 1190/1810) — EI koko datasetin (kaikkien 255 kuljettajan) skaalaan.
	 *
	 * 30.10.2026, 2. PALAUTEKIERROS — BUGIKORJAUS + kolme muuta muutosta:
	 *
	 * BUGI (käyttäjän raportti: "lopettaa viivan piirtämisen season 17
	 * loppuun, sen jälkeen vain näkymättömiä pisteitä/viivaa, tooltip
	 * toimii silti"): juurisyy oli edellisen kierroksen piirtoanimaatio-
	 * tekniikka — `pathLength="1"` + CSS `stroke-dasharray:1`/
	 * `-dashoffset`. Tämä NORMALISOI selaimen SISÄISESTI LASKEMAN polun
	 * todellisen pituuden arvoon "1" — mutta tämä polku on 163 kuutiollista
	 * Bezier-segmenttiä (164 pistettä), ja selaimen pituusarvio tällaiselle
	 * PITKÄLLE moniosaiselle käyrälle on vain LIKIARVO, ei tarkka. Jos
	 * arvio alittaa todellisen pituuden (mikä sattuu kasautumaan juuri
	 * pitkän polun LOPPUPÄÄSSÄ), "dash" (koko polun pituinen pätkä) loppuu
	 * kesken ennen polun todellista loppua — täsmälleen tämä oire (katkeaa
	 * ~87 % kohdalla, S17 on indeksissä 142/164 ≈ 87 %). KORJATTU
	 * vaihtamalla tekniikka kokonaan `clip-path: inset()`-paljastukseen
	 * (ks. `.chart__line`/`.chart__line--drawn` alla) — tämä leikkaa
	 * VIIVAN BBOX:n prosentteina, ei riipu MITENKÄÄN polun pituuden
	 * arvioinnista, joten sama bugi ei voi toistua riippumatta pisteiden
	 * määrästä tai käyrän monimutkaisuudesta.
	 *
	 * 1. "Madallettu vielä hiukan": `VIEW_HEIGHT` 150 -> 110.
	 * 2. Otsikko ("Reittauksen kehitys" -> "Rating historia") on
	 *    sivukohtainen teksti, EI tässä komponentissa — muutettu
	 *    kutsuvassa `/kuljettajat/[driverId]/+page.svelte`:ssä.
	 * 3. "Ylä-/alalaidassa kyseisen kohdan season + väli shadattuna
	 *    taustavärinä, piilotettavissa jos liian kapea": vanha ERILLINEN
	 *    alareunan "ensimmäinen/viimeinen kisa" -teksti (`.x-labels`)
	 *    POISTETTU ja korvattu kausittaisilla VUOROVÄRIRAIDOILLA koko
	 *    kaavion korkeudelta + kauden nimi keskitettynä raidan sisälle
	 *    kaavion alareunaan. Kauden nimi näkyy raidan sisällä VAIN kun
	 *    hiiri hoveroi JOTAIN kyseisen kauden kisaa (`hoverBandIndex`,
	 *    ks. alempana) — KORJATTU 30.10.2026 toisella saman kierroksen
	 *    palautteella: ensimmäinen versio näytti kaikki tarpeeksi leveät
	 *    nimet YHTÄ AIKAA, mikä meni päällekkäin kun kausia oli paljon
	 *    lähekkäin. Raidoitus itse (`.chart__band`) on AINA näkyvissä
	 *    riippumatta hoverista.
	 *
	 * 30.10.2026, 3. PALAUTEKIERROS:
	 * - BUGI ("season 5 tai season 8 ei näy season-nimenä, oli myös
	 *   muita"): kausien rajat pääteltiin TÄSSÄ komponentissa aiemmin
	 *   `raceTitle`:n VIIMEISESTÄ "-"-merkistä — hajosi kisannimillä
	 *   jotka SISÄLSIVÄT oman väliviivan (esim. "Kisa 5 - Spa", "Circuit
	 *   de Charade - Clermont-Ferrand"), jolloin sama kausi pirstoutui
	 *   usean eri (väärän) "kauden" alle ja jäi liian kapeaksi näkyäkseen.
	 *   KORJATTU siirtämällä jako palvelimelle (`mapDriverRatingHistory`,
	 *   ks. mappers.ts) joka täsmää OIKEITA kausinimiä `organiserSummary`-
	 *   listasta tekstin arvailun sijaan — `points[].seasonLabel`/
	 *   `.raceLabel` tulevat nyt VALMIINA, tämä komponentti ei enää
	 *   parsi mitään itse.
	 * - Tooltip pienennetty, kausi POISTETTU siitä (jää vain kisa + piste-
	 *   luku, piste korostettuna), tausta puoliläpinäkyvä ettei peitä
	 *   viivaa allaan.
	 * - Taustaväri vaihdettu harmaasta hyvin vaaleaksi siniseksi (#eaf2fb)
	 *   — käyttäjän oma sanamuoto "tyylikkäämpi, vähemmän erottuva".
	 */
	import type { DriverRatingPoint } from '#lib/server/api/mappers.ts';

	let { points }: { points: DriverRatingPoint[] } = $props();

	// Virtuaalinen piirtoalue — SVG `viewBox` skaalautuu CSS:ssä kontterin
	// leveyteen, nämä ovat vain suhteellisia laskentayksiköitä, ei pikseleitä.
	const VIEW_WIDTH = 1000;
	const VIEW_HEIGHT = 110;
	// PIENENNETTY 30.10.2026 (5. palautekierros, "paddingia vois pienentää
	// muutamalla pikselillä"): 10 -> 6 ja 18 -> 14.
	const PADDING_TOP = 6; // tilaa käyrälle nousta yli oman maksiminsa ilman että se osuu reunaan
	const LABEL_BAND_HEIGHT = 14; // alareunan kausinimi-raidan korkeus

	const ratings = $derived(points.map((point) => point.rating));
	const minRating = $derived(Math.min(...ratings));
	const maxRating = $derived(Math.max(...ratings));

	// Käyttäjän oma esimerkki ("1200/1800 -> 1190/1810"): kiinteä +/-10
	// pehmike, EI prosentuaalinen — pyöristetty kokonaisluvuksi koska
	// reittaus itsekin näytetään aina kokonaislukuna. KÄYTETÄÄN EDELLEEN
	// skaalauksen (y-akselin) ÄÄRIARVOina, jotta käyrä ei kosketa laidan
	// reunaa — mutta EI ENÄÄ näytettävinä lukuina, ks. 5. palautekierroksen
	// kommentti alempana ("+10-luvut sekoittivat").
	const yDomainMin = $derived(Math.floor(minRating - 10));
	const yDomainMax = $derived(Math.ceil(maxRating + 10));
	const yDomainSpan = $derived(Math.max(1, yDomainMax - yDomainMin));

	function xFor(index: number): number {
		return points.length <= 1 ? VIEW_WIDTH / 2 : (index / (points.length - 1)) * VIEW_WIDTH;
	}

	function yFor(rating: number): number {
		const usableHeight = VIEW_HEIGHT - LABEL_BAND_HEIGHT - PADDING_TOP;
		return PADDING_TOP + usableHeight - ((rating - yDomainMin) / yDomainSpan) * usableHeight;
	}

	const coords = $derived(points.map((point, index) => ({ x: xFor(index), y: yFor(point.rating) })));

	// UUSI 30.10.2026 (5. palautekierros, käyttäjän huomio "+10-luvut vain
	// sekoittavat, parempi näyttää oikeat min/max-arvot ja asteikkoviivat
	// niiden kohdalla"): asteikkoviivat JA niiden vieressä näkyvät luvut
	// siirretty `yDomainMin/Max`:sta (jotka sisältävät +/-10-pehmikkeen,
	// vain skaalausta varten) TODELLISIIN `minRating`/`maxRating`-arvoihin
	// — viiva osuu nyt tarkalleen siihen korkeuteen jossa käyrä OIKEASTI
	// kääntyy, lukema on käyrän aito ääriarvo pyöristettynä.
	const scaleMaxY = $derived(yFor(maxRating));
	const scaleMinY = $derived(yFor(minRating));

	/**
	 * Catmull-Rom -pisteistä kuutiolliseksi Bezier-poluksi — vakiomuunnos
	 * (jänneväli 6 = tavallinen "tension 0" -oletus): jokaiselle pisteparille
	 * (p1, p2) kontrollipisteet lasketaan NIITÄ ympäröivistä pisteistä
	 * (p0, p3), reunoilla toistetaan lähin olemassa oleva piste ettei käyrä
	 * "riehaannu" ulos datan ääripäissä.
	 */
	function buildSmoothPath(pts: { x: number; y: number }[]): string {
		if (pts.length === 0) return '';
		if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;

		let d = `M${pts[0].x},${pts[0].y}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] ?? pts[i];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[i + 2] ?? p2;
			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
		}
		return d;
	}

	const linePath = $derived(buildSmoothPath(coords));

	// Piirtyy kerran, hetken DOM:iin liittymisen jälkeen — ilman pientä
	// viivettä selain ehtisi renderöidä `drawn`-luokan suoraan päälle eikä
	// CSS-siirtymä (clip-path-paljastus) ehtisi animoitua lainkaan.
	let drawn = $state(false);
	$effect(() => {
		const timeoutId = setTimeout(() => (drawn = true), 50);
		return () => clearTimeout(timeoutId);
	});

	/**
	 * Kausiraidat — jaetaan `points` peräkkäisiin "saman kauden" -lohkoihin
	 * `point.seasonLabel`:n PERUSTEELLA (palvelimella valmiiksi laskettu
	 * OIKEISTA kausinimistä, ks. mappers.ts:n `mapDriverRatingHistory` —
	 * ei enää tekstin arvailua tässä komponentissa). Vuorovärjätään
	 * peräkkäiset lohkot keskenään jotta kausien rajat erottuvat ilman
	 * erillisiä pystyviivoja.
	 */
	interface SeasonBand {
		season: string;
		startIndex: number;
		endIndex: number;
		x: number;
		width: number;
	}

	const seasonBands = $derived.by((): SeasonBand[] => {
		if (points.length === 0) return [];
		const bands: SeasonBand[] = [];
		let currentSeason = points[0].seasonLabel;
		let startIndex = 0;

		for (let i = 1; i <= points.length; i++) {
			const season = i < points.length ? points[i].seasonLabel : null;
			if (season !== currentSeason) {
				const endIndex = i - 1;
				// Kaistaleen reunat puolivälissä naapuripisteiden väliin — näin
				// peräkkäiset kaistaleet peittävät koko leveyden saumattomasti.
				const xStart = startIndex === 0 ? 0 : (xFor(startIndex - 1) + xFor(startIndex)) / 2;
				const xEnd = endIndex === points.length - 1 ? VIEW_WIDTH : (xFor(endIndex) + xFor(endIndex + 1)) / 2;
				bands.push({ season: currentSeason, startIndex, endIndex, x: xStart, width: xEnd - xStart });
				if (season !== null) {
					currentSeason = season;
					startIndex = i;
				}
			}
		}
		return bands;
	});

	// Kausiraidan oman piirtoleveyden pikseliarvio kontterin TODELLISESTA
	// leveydestä (`bind:clientWidth`) — nimi piilotetaan VAIN jos raita on
	// käytännössä olematon (esim. 1-2 kisan kausi), koska nimi näkyy nyt
	// hoveroidessa yksi kerrallaan eikä enää tarvitse suojautua MONEN
	// nimen päällekkäisyydeltä yhtä aikaa (raja laskettu 56:sta 20:een).
	let containerWidth = $state(0);
	const MIN_LABEL_PX = 20;
	function bandLabelVisible(band: SeasonBand): boolean {
		if (containerWidth === 0) return true;
		const pxWidth = (band.width / VIEW_WIDTH) * containerWidth;
		return pxWidth >= MIN_LABEL_PX;
	}

	// Hover: lähimmän kisan tarkka piste + tooltip.
	let svgEl: SVGSVGElement | undefined = $state();
	let hoverIndex: number | undefined = $state(undefined);

	function handlePointerMove(event: PointerEvent) {
		if (!svgEl || points.length === 0) return;
		const rect = svgEl.getBoundingClientRect();
		const fraction = (event.clientX - rect.left) / rect.width;
		const rawIndex = Math.round(fraction * (points.length - 1));
		hoverIndex = Math.min(points.length - 1, Math.max(0, rawIndex));
	}

	function handlePointerLeave() {
		hoverIndex = undefined;
	}

	const hoverPoint = $derived(hoverIndex !== undefined ? points[hoverIndex] : undefined);
	const hoverCoord = $derived(hoverIndex !== undefined ? coords[hoverIndex] : undefined);

	// KORJAUS 30.10.2026 (käyttäjän palaute, SAMAN kierroksen sisällä kuin
	// yllä oleva bugikorjaus: "kauden nimet menevät päällekkäin graafin
	// alareunassa, niitä ei pysty lukemaan"): aiempi ratkaisu näytti KAIKKI
	// tarpeeksi leveät kausinimet YHTÄ AIKAA — kun kausia on paljon lähekkäin,
	// "tarpeeksi leveä" -kynnys ei riitä estämään naapuriraitojen tekstejä
	// törmäämästä toisiinsa. Käyttäjän oma ratkaisu: näytä kauden nimi VAIN
	// sen kauden kohdalla jota hiiri juuri nyt hoveroi — ei koskaan kahta
	// nimeä yhtä aikaa, raidoitus (`.chart__band`) pysyy silti aina näkyvissä.
	const hoverBandIndex = $derived.by(() => {
		if (hoverIndex === undefined) return undefined;
		return seasonBands.findIndex((band) => hoverIndex! >= band.startIndex && hoverIndex! <= band.endIndex);
	});

	// Tooltipin vaakasuuntainen ankkurointi reunoilla — keskitetty piste
	// leikkautuisi kortin reunasta kaavion alku-/loppupäässä ilman tätä.
	const tooltipAlign = $derived.by((): 'start' | 'center' | 'end' => {
		if (!hoverCoord) return 'center';
		const fraction = hoverCoord.x / VIEW_WIDTH;
		if (fraction < 0.12) return 'start';
		if (fraction > 0.88) return 'end';
		return 'center';
	});
</script>

{#if points.length === 0}
	<p class="empty">Ei reittaustietoa — kuljettaja ei ole vielä ajanut yhtään reittauksen piirissä olevaa kisaa.</p>
{:else}
	<div class="chart-wrap" bind:clientWidth={containerWidth}>
		<!-- UUSI 30.10.2026 (5. palautekierros): oma, PADDAAMATON kontteri
		     svg:lle/tooltipille/y-labeleille — nämä sijoitetaan prosentti-
		     koordinaatein, jotka vastaavat SVG:n omaa viewBox-tilaa vain jos
		     prosenttien viite-elementillä EI ole omaa paddingia. Aiemmin
		     label/tooltip olivat suoraan `chart-wrap`:n lapsia, jonka oma
		     padding (kortin reunukset) siirsi niiden asemointia hienoisesti
		     väärään kohtaan todellisesta datapisteestä. -->
		<div class="chart-area">
			<svg
				bind:this={svgEl}
				class="chart"
				viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
				preserveAspectRatio="none"
				role="img"
				aria-label="Reittauksen kehitys"
				onpointermove={handlePointerMove}
				onpointerleave={handlePointerLeave}
			>
				{#each seasonBands as band, bandIndex (band.startIndex)}
					<rect
						class="chart__band"
						class:chart__band--alt={bandIndex % 2 === 1}
						x={band.x}
						y="0"
						width={band.width}
						height={VIEW_HEIGHT}
					/>
					{#if bandIndex === hoverBandIndex && bandLabelVisible(band)}
						<text class="chart__band-label" x={band.x + band.width / 2} y={VIEW_HEIGHT - 5}>{band.season}</text>
					{/if}
				{/each}
				<!-- Käyttäjän ehdotus 30.10.2026: ohuet viivat TODELLISEN
				     min/max-arvon kohdalla (EI +/-10-pehmikkeen reunalla)
				     ilmaisemassa asteikon taso visuaalisesti. -->
				<line class="chart__scale-line" x1="0" y1={scaleMaxY} x2={VIEW_WIDTH} y2={scaleMaxY} />
				<line class="chart__scale-line" x1="0" y1={scaleMinY} x2={VIEW_WIDTH} y2={scaleMinY} />
				<path class="chart__line" class:chart__line--drawn={drawn} d={linePath} />
				{#if hoverCoord}
					<line
						class="chart__hover-line"
						x1={hoverCoord.x}
						y1={PADDING_TOP}
						x2={hoverCoord.x}
						y2={VIEW_HEIGHT - LABEL_BAND_HEIGHT}
					/>
					<circle class="chart__hover-point" cx={hoverCoord.x} cy={hoverCoord.y} r="4" />
				{/if}
			</svg>
			<span class="y-label y-label--max" style="top: {(scaleMaxY / VIEW_HEIGHT) * 100}%;">{Math.round(maxRating)}</span>
			<span class="y-label y-label--min" style="top: {(scaleMinY / VIEW_HEIGHT) * 100}%;">{Math.round(minRating)}</span>
			{#if hoverPoint && hoverCoord}
				<div
					class="tooltip tooltip--{tooltipAlign}"
					style="left: {(hoverCoord.x / VIEW_WIDTH) * 100}%; top: {(hoverCoord.y / VIEW_HEIGHT) * 100}%;"
				>
					<span class="tooltip__rating">{hoverPoint.rating}</span>
					<span class="tooltip__race">{hoverPoint.raceLabel || hoverPoint.seasonLabel}</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.chart-wrap {
		position: relative;
		/* KORJAUS 30.10.2026 (kapealla näytöllä y-akselin min/max-lukemat
		   menivät päällekkäin): `.chart`:n korkeus EI voi enää seurata
		   `viewBox`:n suhdetta suoraan `height:auto`:lla, koska silloin
		   hyvin kapea kontteri (esim. puhelin) kutistaa korkeuden niin
		   pieneksi että kiinteäkokoiset y-label-tekstit (`em`-pohjainen
		   asemointi) eivät enää mahdu päällekkäin menemättä. `container-
		   type` TÄHÄN (vanhempaan), `.chart`:n korkeus `cqi`-yksiköllä
		   alla — EI itse `.chart`:iin, ks. CLAUDE.md:n toistuva muistutus
		   "elementti ei voi @container-kysellä itseään". */
		container-type: inline-size;
		padding: var(--space-2) var(--space-4) var(--space-2) var(--space-8);
		/* Käyttäjän pyyntö 30.10.2026 "tausta voisi olla vaalea" — vahvistettu
		   tarkoittavan kaavion OMAA vaaleaa korttia poikkeuksena sivun tummasta
		   teemasta, ei koko sivuston värimuutosta. Kirjaimelliset väriarvot
		   TARKOITUKSELLA, ei semanttista tokenia (ks. yläpuolen kommentti).
		   PÄIVITETTY 30.10.2026 (3. palautekierros, "harmaa voisi olla
		   tyylikkäämpi ja vähemmän erottuva, todella vaalea sininen voisi
		   toimia"): #eef1f6 (neutraali harmaa) -> #eaf2fb. KÄYTTÄJÄ RAPORTOI
		   4. kierroksella että #eaf2fb "näyttää edelleen harmaalta" —
		   liian desaturoitu erottuakseen harmaasta useimmilla näytöillä,
		   nostettu sinisen kylläisyyttä: #d7e8fb. KÄYTTÄJÄ PYYSI 5.
		   kierroksella vaalentamaan "vielä aavistuksen" — #d7e8fb oli
		   siis väriltään oikein mutta hieman liian tumma/kylläinen,
		   kevennetty #e1ecfc:ksi (pysyy selvästi sinisenä, ei enää harmaa). */
		background: #e1ecfc;
		border-radius: var(--radius-lg);
	}

	.chart-area {
		position: relative;
	}

	.y-label {
		position: absolute;
		/* Oikealle tasattu, kiinnittyy kaavion VASEMPAAN reunaan (left:0,
		   translateX(-100%) siirtää koko tekstin sen ulkopuolelle, tilaan
		   jonka `.chart-wrap`:n padding-inline-start varaa) — ei enää
		   kiinteää `left`-arvoa, joten toimii tekstin pituudesta
		   riippumatta. `translateY(-50%)` keskittää tekstin PYSTYSSÄ
		   asteikkoviivan kohdalle sen SIJAAN että tekstin yläreuna olisi
		   viivan kohdalla. */
		left: 0;
		transform: translate(calc(-100% - var(--space-2)), -50%);
		font-size: 0.65rem;
		color: #5b6472;
		font-weight: 700;
		white-space: nowrap;
	}

	.chart {
		display: block;
		width: 100%;
		/* Pyrkii noudattamaan `viewBox`:n 1000:110-suhdetta (11 cqi ≈ 110/1000
		   kontterin leveydestä), mutta EI KOSKAAN alle 64px — se on raja
		   jolla y-label-tekstit vielä mahtuvat päällekkäin menemättä. */
		height: clamp(64px, 11cqi, 110px);
		overflow: visible;
		touch-action: none;
	}

	.chart__band {
		fill: transparent;
	}

	.chart__band--alt {
		/* PÄIVITETTY 30.10.2026 (4. palautekierros): oli neutraali tumma
		   ylivärjäys (rgb(27 33 48 / 5%)) — näytti harmaalta riippumatta
		   kortin omasta taustaväristä. Sinertävä ylivärjäys
		   (--color-primary: #1f8fff RGB-arvoin) pitää raidoituksenkin
		   selvästi sinisenä. */
		fill: rgb(31 143 255 / 8%);
	}

	.chart__scale-line {
		/* Käyttäjän ehdotus 30.10.2026: ohut viiva ylä-/alareunassa
		   ilmaisemassa min/max-asteikon taso visuaalisesti. */
		stroke: rgb(31 65 110 / 20%);
		stroke-width: 1;
		stroke-dasharray: 2 3;
		vector-effect: non-scaling-stroke;
	}

	.chart__band-label {
		font-size: 8px;
		fill: #7a8291;
		text-anchor: middle;
		font-weight: 600;
		/* Älä anna kausinimen varastaa hiiritapahtumia viivan ylitse. */
		pointer-events: none;
	}

	.chart__line {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2.5;
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
		/* KORJAUS 30.10.2026 (ks. yläpuolen iso kommentti "BUGI"): EI enää
		   pathLength+stroke-dasharray-tekniikkaa, joka katkesi kesken pitkää
		   (164 pisteen) käyrää selaimen polun pituuden LIKIARVIOINNIN takia.
		   `clip-path: inset()` leikkaa viivan BBOX:n prosentteina — ei riipu
		   polun pituuden arvioinnista lainkaan. */
		clip-path: inset(0 100% 0 0);
		transition: clip-path 1.4s ease-out;
	}

	.chart__line--drawn {
		clip-path: inset(0 0% 0 0);
	}

	.chart__hover-line {
		stroke: #aab2c0;
		stroke-width: 1;
		stroke-dasharray: 3 3;
		vector-effect: non-scaling-stroke;
	}

	.chart__hover-point {
		fill: var(--color-primary);
		stroke: #e1ecfc;
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}

	.tooltip {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		transform: translate(-50%, -100%) translateY(-0.6em);
		/* PÄIVITETTY 30.10.2026 (3. palautekierros): "tooltip peittää liikaa"
		   — tausta puoliläpinäkyväksi (oli täysin peittävä #1b2130) ja koko
		   pienennetty, jotta viiva/raidat erottuvat tooltipin ALTA. */
		background: rgb(17 21 30 / 62%);
		backdrop-filter: blur(3px);
		color: #f3f5f7;
		padding: 0.2em var(--space-1);
		border-radius: var(--radius-sm);
		font-size: 0.65rem;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
		z-index: 1;
	}

	.tooltip--start {
		transform: translate(0, -100%) translateY(-0.75em);
	}

	.tooltip--end {
		transform: translate(-100%, -100%) translateY(-0.75em);
	}

	.tooltip__rating {
		font-weight: 800;
		font-size: 0.8rem;
		color: #7fc0ff;
	}

	.tooltip__race {
		color: #c3c9d1;
		font-size: 0.6rem;
	}

	.empty {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}
</style>
