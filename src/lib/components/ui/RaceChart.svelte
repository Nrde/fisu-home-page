<script lang="ts">
	/**
	 * RaceChart — animoitu "rating race" -pylväskaavio kuljettajien
	 * reittauksen (Elo-tyyppinen luku) kehityksestä kisa kisalta.
	 *
	 * PÄIVITYS (29.9.2026, käyttäjän raportoima: "the actual change in the
	 * rating value i.e. the length of the bars don't animate"): palkit
	 * OLIVAT aiemmin SVG `<rect>`-elementtejä joiden `width` asetettiin
	 * XML-attribuuttina prosentteina + CSS `transition: width`. Tämä on
	 * TUNNETTU selainyhteensopivuusongelma — CSS-siirtymät SVG:n geometria-
	 * attribuuteille (erityisesti prosenttiyksiköillä) eivät toimi
	 * luotettavasti kaikissa selaimissa (Safari erityisen tunnettu tästä).
	 * KORVATTU tavallisilla HTML-`<div>`-palkeilla, joiden `width`/`left`
	 * asetetaan INLINE STYLE -arvoina (`%`) — täysin tavallinen, aina
	 * toimiva CSS-siirtymä, ei SVG-erikoistapauksia. Sama muutos teki
	 * MYÖS ulkoasun mittasuhteiden/paddingin säätämisestä (käyttäjän toinen
	 * pyyntö) paljon suoraviivaisempaa kuin SVG-koordinaattien laskennasta.
	 *
	 * Sijoituksen VAIHTUMINEN (rivien järjestyksen uudelleenjärjestys)
	 * animoidaan edelleen `animate:flip`:llä, mutta nyt PIENELLÄ VIIVEELLÄ
	 * (`delay`) palkin pituuden siirtymään nähden — käyttäjän pyyntö
	 * ("first the length then the position"): palkki ehtii kasvaa/kutistua
	 * hetken ENNEN kuin rivit alkavat vaihtaa paikkaa, jolloin muutos on
	 * helpompi seurata silmällä kuin jos molemmat tapahtuisivat täysin
	 * samanaikaisesti.
	 */
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { RaceChartFrame } from '#lib/server/api/mappers.ts';

	let {
		frames,
		totalDrivers,
		batchSize = 15
	}: {
		frames: RaceChartFrame[];
		totalDrivers: number;
		/**
		 * Montako kuljettajaa näytetään kerrallaan yhdellä "X–Y"-välilehdellä
		 * (käyttäjän pyyntö 29.9.2026: pelkät numerot, ei "Sijat"-sanaa) —
		 * kaavio pysyy luettavana vaikka kuljettajia olisi kymmeniä.
		 * PÄIVITYS (29.9.2026, käyttäjän huomio: "on my 1080 screen I only
		 * see 15 drivers at a time"): oletusarvo pudotettu 20:stä 15:een —
		 * 20 riviä ei mahtunut kokonaan näkyviin 1080p-näytöllä ilman
		 * sivun vierittämistä, 15 mahtuu. Tämä on TIETOINEN kompromissi
		 * (enemmän välilehtiä isolle kuljettajamäärälle) sen sijaan että
		 * rivit tehtäisiin niin ahtaiksi ettei nimi/palkki/lukema enää
		 * mahtuisi luettavasti — kutsuja voi silti antaa oman arvon jos
		 * haluaa toisen kompromissin.
		 */
		batchSize?: number;
	} = $props();

	let currentFrameIndex = $state(0);
	let isPlaying = $state(false);
	let playbackSpeed = $state(1000); // ms per frame
	let activeBatchIndex = $state(0); // 0 = sijat 1-20, 1 = 21-40, jne.

	let intervalId: ReturnType<typeof setInterval> | undefined;

	const totalFrames = $derived(frames.length);
	const currentFrame = $derived<RaceChartFrame>(frames[currentFrameIndex] ?? { standings: [], title: '' });

	const totalBatches = $derived(Math.max(1, Math.ceil(totalDrivers / batchSize)));
	const currentRangeStart = $derived(activeBatchIndex * batchSize + 1);
	const currentRangeEnd = $derived(Math.min((activeBatchIndex + 1) * batchSize, totalDrivers));

	const visibleStandings = $derived(
		currentFrame.standings.filter((driver) => driver.rank >= currentRangeStart && driver.rank <= currentRangeEnd)
	);

	// Vähintään 1500 pohjana, jotta yksittäisen kisan alun (kaikki lähellä
	// oletusreittausta) palkit eivät venähdä koko leveydelle merkityksettömän
	// pienestä eroista — sama periaate kuin alkuperäisessä versiossa.
	const maxRating = $derived(Math.max(...currentFrame.standings.map((s) => s.rating), 1500));

	$effect(() => {
		if (isPlaying) {
			intervalId = setInterval(() => {
				if (currentFrameIndex < totalFrames - 1) {
					currentFrameIndex++;
				} else {
					isPlaying = false;
				}
			}, playbackSpeed);
		} else {
			clearInterval(intervalId);
		}

		return () => clearInterval(intervalId);
	});

	function togglePlay() {
		if (currentFrameIndex >= totalFrames - 1) {
			currentFrameIndex = 0;
		}
		isPlaying = !isPlaying;
	}

	/** Johdonmukainen väri per kuljettaja — `driverIndex` on VAKAA koko datasetin ajan (ks. mappers.ts:n RaceChartStanding-kommentti), joten sama kuljettaja saa aina saman värin framesta toiseen. */
	function getDriverColor(driverIndex: number): string {
		const hue = (driverIndex * 47) % 360;
		return `hsl(${hue}, 65%, 50%)`;
	}

	/**
	 * `frame.title` on API:sta valmiiksi yhdistetty merkkijono (esim.
	 * "FiSU S9 - Ahvenisto", "Season 3 - Red Bull Ring") — käyttäjän oma
	 * havainto 29.9.2026: kausiosa ja ratanimi mahtuvat lähes aina samalle
	 * riville MUTTA pisimmät osakilpailujen nimet rikkovat layoutin
	 * kahdelle riville epäsiististi. Käyttäjän oma sääntö nimen jakoon:
	 * ratanimi on VIIMEISEN "-"-merkin JÄLKEINEN osa (jos nimessä on
	 * useampia "-"-merkkejä, käytetään VIIMEISTÄ), kausiosa on kaikki
	 * SITÄ ENNEN. `undefined` race jos merkkiä ei löydy lainkaan (koko
	 * title näytetään tällöin kausiosana, ei arvata mitään).
	 */
	function splitFrameTitle(title: string): { season: string; race: string | undefined } {
		const lastDashIndex = title.lastIndexOf('-');
		if (lastDashIndex === -1) return { season: title, race: undefined };
		return {
			season: title.slice(0, lastDashIndex).trim(),
			race: title.slice(lastDashIndex + 1).trim()
		};
	}

	const frameTitle = $derived(splitFrameTitle(currentFrame.title || 'Reittauksen kehitys'));
</script>

<div class="chart-container">
	<span class="chart-watermark" aria-hidden="true">Rating</span>

	<header class="chart-header">
		<div class="chart-header__top">
			<span class="chart-header__season">{frameTitle.season}</span>
			<span class="chart-header__count">Kisa {currentFrameIndex + 1} / {totalFrames}</span>
		</div>
		{#if frameTitle.race}
			<h2 class="chart-header__race">{frameTitle.race}</h2>
		{/if}
	</header>

	{#if totalBatches > 1}
		<div class="batch-tabs">
			{#each Array(totalBatches) as _, idx}
				{@const start = idx * batchSize + 1}
				{@const end = Math.min((idx + 1) * batchSize, totalDrivers)}
				<button type="button" class="tab-btn" class:active={activeBatchIndex === idx} onclick={() => (activeBatchIndex = idx)}>
					{start}–{end}
				</button>
			{/each}
		</div>
	{/if}

	<div class="chart-viewport">
		{#if visibleStandings.length === 0}
			<!--
				Käyttäjän huomio (29.9.2026): kaukaisemmat "Sijat X–Y" -välilehdet
				(esim. 201-220) voivat olla TÄYSIN tyhjiä kauden alun kisoissa,
				koska vain ajaneet kuljettajat saavat sijoituksen tässä framessa
				— ei ole mitään "sijaa 210" ennen kuin 210 kuljettajaa on ajanut
				edes yhden kisan. TARKOITUKSELLA ei täytetä tätä keksityillä
				"kosmeettinen 0 reittaus" -riveillä kaikille vielä ajamattomille
				kuljettajille (käyttäjän oma ehdotus, mutta hän itse epäröi sitä)
				— se täyttäisi välilehden KYMMENILLÄ merkityksettömillä nolla-
				palkeilla joka ikiselle vielä ajamattomalle kuljettajalle,
				mikä tekisi näkymästä SEKAVAMMAN, ei selkeämmän. Selkeä
				tyhjän tilan viesti on rehellisempi: näillä sijoilla ei
				yksinkertaisesti ole vielä ketään.
			-->
			<p class="chart-empty">Kukaan ei ole vielä ajanut tälle sijavälille tässä kisassa.</p>
		{:else}
			<div class="bars">
				{#each visibleStandings as driver (driver.driverIndex)}
					<!--
						BUGIKORJAUS (29.9.2026, käyttäjän raportoima: "palkit ovat nyt
						liian pitkiä eivätkä mahdu niille varattuun laatikkoon"): kerroin
						oli aiemmin 100 (täysi leveys korkeimmalle reittaukselle), jolloin
						`.bar-row__rating`-teksti (asemoitu `left: {barWidth}%` + oma
						leveytensä sen PÄÄLLE) työntyi `.bar-row__track`:in ULKOPUOLELLE
						täydellä palkilla eikä mahtunut varattuun tilaan. Kerroin 80 jättää
						AINA vähintään 20 % track:in leveydestä tekstille — sama
						normalisointiperiaate kuin alkuperäisessä SVG-versiossa (joka
						käytti kerrointa 70 vastaavasta syystä), vain säädetty tähän
						div-pohjaiseen mittakaavaan.
					-->
					{@const barWidth = Math.max(2, (driver.rating / maxRating) * 80)}
					<div
						class="bar-row"
						style="order: {driver.rank}"
						animate:flip={{ duration: 500, delay: 150 }}
						transition:fade={{ duration: 200 }}
					>
						<span class="bar-row__name">{driver.name}</span>
						<div class="bar-row__track">
							<div class="bar-row__fill" style="width: {barWidth}%; background: {getDriverColor(driver.driverIndex)}"></div>
							<span class="bar-row__rating" style="left: {barWidth}%">
								{driver.rating.toLocaleString('fi-FI')} (S{driver.rank})
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="controls">
		<button
			type="button"
			class="play-btn"
			aria-label={isPlaying ? 'Keskeytä toisto' : 'Toista'}
			onclick={togglePlay}
		>
			{isPlaying ? '⏸' : '▶'}
		</button>

		<input type="range" min="0" max={totalFrames - 1} bind:value={currentFrameIndex} class="timeline-scrubber" aria-label="Kisan valinta" />

		<select bind:value={playbackSpeed} class="speed-select" aria-label="Toistonopeus">
			<option value={1500}>0.5x</option>
			<option value={1000}>1.0x</option>
			<option value={500}>2.0x</option>
		</select>
	</div>
</div>

<style>
	.chart-container {
		position: relative;
		/* `.chart-watermark`:in `cqi`-fonttikoko viittaa TÄHÄN — kontaineri EI voi @container-kysyä omaa kokoaan, joten `container-type` on tässä (vanhemmassa), ei vesileimassa itsessään. */
		container-type: inline-size;
		width: 100%;
		/*
		 * Käyttäjän pyyntö 29.9.2026: laatikko lähemmäs headerin/sivun
		 * `--content-max-width`:in (75rem) levyistä sisältöaluetta — oli
		 * 960px (~80% siitä), nyt ~1080px (~90%).
		 */
		max-width: 1080px;
		margin: 0 auto;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-surface-border);
		/*
		 * Käyttäjän pyyntö 29.9.2026 (kaksi kierrosta): ensin enemmän tilaa
		 * reunoista yleisesti (kontrollit olivat kiinni laatikon reunassa),
		 * sitten YLÄreunan padding pienemmäksi erikseen jotta otsikkorivi
		 * istuu lähempänä laatikon yläreunaa — muut reunat pysyvät väljinä.
		 */
		padding: var(--space-4) var(--space-8) var(--space-8);
		border-radius: var(--radius-lg);
		/* Taustavesileiman (`.chart-watermark`, alempana) mahdollinen ylivuoto rajataan laatikon reunoihin. */
		overflow: hidden;
	}

	/*
	 * Himmeä "RATING"-taustateksti — UUSI 29.9.2026, käyttäjän pyyntö:
	 * sivun oma otsikko+johdantoteksti (`/reittaus`-sivun `<h1>`/`<p>`)
	 * vei turhaan pystytilaa sivulla jonka koko pointti on mahduttaa
	 * mahdollisimman monta kaavion riviä näytölle — poistettu sieltä
	 * kokonaan (ks. +page.svelte) ja korvattu TÄLLÄ: sama "brändäys" mutta
	 * osana laatikon TAUSTAA, ei omaa riviään vievänä otsikkona. `aria-
	 * hidden` + `pointer-events: none`, koska tämä on puhtaasti visuaalinen
	 * koriste, ei sisältöä (sivun oikea otsikko on edelleen `<svelte:head>`
	 * `<title>`:ssä, ks. +page.svelte).
	 *
	 * PÄIVITYS (29.9.2026, toinen kierros): käyttäjän palaute — väri/
	 * himmeys OK sellaisenaan, mutta koko+sijainti eivät: alakulmassa se
	 * osui `.controls`:in "form"-elementtien (play-nappi, aika-liukusäädin)
	 * PÄÄLLE, mikä näytti sekavalta yhdistettynä oikeisiin käyttöliittymä-
	 * elementteihin. Header-tekstien ALLA sen sijaan on käyttäjän mukaan
	 * OK, koska tavallinen teksti (ei interaktiivisia "form"-objekteja)
	 * lukee luontevasti himmeän ison taustatekstin päällä. UUSI sijainti:
	 * keskitetty otsikon YLÄPUOLELLE/TAAKSE, KIERRETTYNÄ ("vasen puoli
	 * alempana" — käyttäjän oma ehdotus) `rotate(-8deg)`:llä (negatiivinen
	 * kulma kallistaa VASEMMAN reunan alas, OIKEAN ylös). Koko kasvatettu
	 * SELVÄSTI (`cqi`-skaalattu, ks. `.chart-container`:in `container-type`)
	 * niin että teksti on luettavissa VAIKKA se onkin muun sisällön alla.
	 */
	.chart-watermark {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%) rotate(-8deg);
		transform-origin: center;
		font-size: clamp(5rem, 3rem + 14cqi, 12rem);
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1;
		color: color-mix(in oklch, var(--color-text) 8%, transparent);
		white-space: nowrap;
		pointer-events: none;
		user-select: none;
		z-index: 0;
	}

	.chart-header {
		position: relative;
		z-index: 1;
		/* Käyttäjän pyyntö 29.9.2026: enemmän tilaa otsikon ja numeronappien välillä, ne olivat kiinni toisissaan. */
		margin-bottom: var(--space-8);
	}

	/*
	 * Käyttäjän pyyntö 29.9.2026: kauden nimi vasempaan yläkulmaan, "Kisa
	 * N / M" samalle riville oikeaan reunaan — ei enää molempia samalla
	 * rivillä peräkkäin (aiempi tapa venytti otsikkorivin liian pitkäksi
	 * pisimmillä ratanimillä, ks. `splitFrameTitle`-kommentti script-lohkossa).
	 * PÄIVITYS (29.9.2026, KOLMAS kierros): käyttäjä tarkensi ettei halunnut
	 * tätä PIENEMMÄKSI kuin ratanimeä — päinvastoin, kaikkien kolmen
	 * tekstin (kausi, kisalaskuri, ratanimi) PITÄISI olla SAMAA kokoa
	 * (`--font-size-lg`). Aiempi `--font-size-xs` oli myös AITO bugi —
	 * sitä muuttujaa ei ole olemassa tokens.css:ssä lainkaan (skaala alkaa
	 * `sm`:stä), joten se ei koskaan tehnyt mitään tarkoitettua.
	 */
	.chart-header__top {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-2) var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	/*
	 * Ratanimi omalla korostusvärillään (käyttäjän pyyntö 29.9.2026: "voisi
	 * olla esim. vihreällä, sinisellä tai muulla sopivalla värillä") —
	 * `--color-info` valittu koska se on jo sivuston oma "aktiivinen/
	 * korostettu" -aksenttiväri (sama sininen kuin mm. tämän komponentin
	 * omat `.tab-btn.active`- ja linkkien värit), ei uusi väri pelkästään
	 * tätä varten. Fonttikoko SAMA kuin `.chart-header__top`:issa (ks. sen
	 * kommentti) — vain väri/paino erottavat ratanimen, ei enää koko.
	 */
	.chart-header__race {
		margin-top: var(--space-1);
		font-size: var(--font-size-lg);
		font-weight: 800;
		color: var(--color-info);
	}

	.batch-tabs {
		/* `position: relative; z-index: 1;` tässä ja `.chart-viewport`/`.controls`:issa
		   alempana: takaa että nämä paatuvat AINA `.chart-watermark`:in (z-index: 0)
		   YLÄPUOLELLE riippumatta CSS:n asemointi/paint-järjestyksen hienouksista
		   (staattisesti asemoitu sisältö ja z-index:0 positioned-sisarus voivat
		   muuten paatua yllättävässä järjestyksessä). */
		position: relative;
		z-index: 1;
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-bottom: var(--space-6);
	}

	.tab-btn {
		background: var(--color-bg);
		border: 1px solid var(--color-surface-border);
		color: var(--color-text-muted);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
	}

	.tab-btn.active {
		background: var(--color-info);
		color: var(--color-bg);
		border-color: var(--color-info);
	}

	.chart-viewport {
		position: relative;
		z-index: 1;
		width: 100%;
	}

	.chart-empty {
		padding-block: var(--space-6);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.bars {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.bar-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.bar-row__name {
		flex: 0 0 140px;
		text-align: right;
		font-size: var(--font-size-sm);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bar-row__track {
		position: relative;
		flex: 1 1 auto;
		height: 1.5rem;
	}

	/*
	 * Tavallinen HTML/CSS-palkki SVG-`<rect>`:n sijaan (ks. script-lohkon
	 * kommentti) — `width`-siirtymä toimii TÄSSÄ luotettavasti kaikissa
	 * selaimissa, koska se on tavallinen prosenttiarvo tavallisella
	 * lohkoelementillä, ei SVG:n geometria-attribuutti.
	 */
	.bar-row__fill {
		position: absolute;
		inset-block: 0;
		left: 0;
		border-radius: var(--radius-md);
		transition: width 0.5s ease-out;
	}

	/* `left`-siirtymä SAMALLA kestolla kuin `.bar-row__fill`:in `width` — lukema "seuraa" palkin kärkeä. */
	.bar-row__rating {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		margin-left: var(--space-2);
		/* HUOM (29.9.2026): oli `var(--font-size-xs)`, jota EI ole olemassa tokens.css:ssä (skaala alkaa `sm`:stä) — sama bugi kuin `.chart-header__top`:issa, korjattu samalla. */
		font-size: var(--font-size-sm);
		font-weight: 700;
		white-space: nowrap;
		transition: left 0.5s ease-out;
	}

	.controls {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-6);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-surface-border);
	}

	/*
	 * Käyttäjän pyyntö 29.9.2026: "Toista"-teksti korvattu emojilla, nappi
	 * paljon pienempi kuin ennen — ei enää iso tekstinappi, vain pyöreä
	 * pieni play/pause-ikoni. `aria-label` pitää sen silti nimettynä
	 * ruudunlukijoille vaikka näkyvä sisältö on pelkkä emoji.
	 */
	.play-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: var(--color-info);
		color: var(--color-bg);
		border: none;
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		line-height: 1;
	}

	.timeline-scrubber {
		flex: 1;
	}

	.speed-select {
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-surface-border);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
	}
</style>
