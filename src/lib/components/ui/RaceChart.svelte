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
	 * toimiva CSS-siirtymä, ei SVG-erikoistapauksia.
	 *
	 * Sijoituksen VAIHTUMINEN (rivien järjestyksen uudelleenjärjestys)
	 * animoidaan edelleen `animate:flip`:llä, mutta nyt PIENELLÄ VIIVEELLÄ
	 * (`delay`) palkin pituuden siirtymään nähden — käyttäjän pyyntö
	 * ("first the length then the position"): palkki ehtii kasvaa/kutistua
	 * hetken ENNEN kuin rivit alkavat vaihtaa paikkaa.
	 *
	 * PÄIVITYS (29.9.2026, ISO kierros — "seurattava kuljettaja" +
	 * raahattava sijoitusikkuna): käyttäjän raportoima käytettävyysongelma
	 * ("it's really difficult to follow one driver") ratkaistu KAHDELLA
	 * yhteen pelaavalla osalla:
	 *
	 * 1) Kiinteät "1–15/16–30/..."-välilehdet KORVATTU jatkuvalla,
	 *    raahattavalla "ikkunalla" (`.rank-slider`) koko sijoitusasteikon
	 *    (1..totalDrivers) yli. Raidan TÄYTTYNYT osuus (vihreä) näyttää
	 *    kuinka moni sijoitus on YLIPÄÄTÄÄN ratkaistu TÄSSÄ framessa —
	 *    käyttäjän oma idea, ratkaisee myös aiemman "tyhjä välilehti"
	 *    -ongelman visuaalisesti sen sijaan että sen huomaisi vasta
	 *    klikattuaan tyhjän välilehden auki.
	 * 2) Kuljettajahaku (`searchQuery`) + "seuranta" (`followedDriverIndex`):
	 *    valittu kuljettaja korostetaan AINA kun hän on näkyvässä ikkunassa,
	 *    JA ikkuna keskitetään AUTOMAATTISESTI hänen NYKYISEEN sijoitukseensa
	 *    joka framen vaihdossa (`$effect` alempana) — tämä on se osa joka
	 *    OIKEASTI ratkaisee käyttäjän ongelman, koska reittaus ei ole
	 *    monotoninen (voi sekä nousta että laskea, käyttäjän oma huomio)
	 *    eikä pelkkä korostus ilman automaattista ikkunan siirtoa riittäisi.
	 *    Manuaalinen raahaus/klikkaus/nuolinäppäimet LOPETTAVAT seurannan
	 *    (käyttäjä ottaa ohjat itse), koska automaattinen ikkunan siirto
	 *    ja käyttäjän oma raahaus eivät voi olla voimassa yhtä aikaa
	 *    riitelemättä keskenään.
	 */
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { RaceChartFrame } from '#lib/server/api/mappers.ts';

	let {
		frames,
		totalDrivers,
		windowSize = 15
	}: {
		frames: RaceChartFrame[];
		totalDrivers: number;
		/**
		 * Montako kuljettajaa näkyy kerrallaan raahattavan sijoitusikkunan
		 * sisällä. PÄIVITYS (29.9.2026): oletusarvo 15, koska käyttäjän oma
		 * mittaus ("on my 1080 screen I only see 15 drivers at a time")
		 * osoitti sen olevan mikä mahtuu 1080p-näytölle ilman sivun
		 * vierittämistä. Nimetty uudelleen `batchSize`:sta `windowSize`:ksi
		 * kiinteiden välilehtien poistuessa — kuvaa nyt jatkuvan ikkunan
		 * KOKOA, ei enää sivun kokoa paginoinnissa.
		 */
		windowSize?: number;
	} = $props();

	let currentFrameIndex = $state(0);
	let isPlaying = $state(false);
	let playbackSpeed = $state(1000); // ms per frame

	// 1-perustainen sijoitus jossa näkyvä ikkuna ALKAA (esim. 1 = sijat 1..windowSize).
	let windowStart = $state(1);
	let followedDriverIndex = $state<number | undefined>(undefined);
	let searchQuery = $state('');

	let trackEl: HTMLDivElement | undefined = $state();
	let dragStartClientX = 0;
	let dragStartWindowStart = 1;
	let dragTrackWidthPx = 1;

	let intervalId: ReturnType<typeof setInterval> | undefined;

	const totalFrames = $derived(frames.length);
	const currentFrame = $derived<RaceChartFrame>(frames[currentFrameIndex] ?? { standings: [], title: '' });

	const effectiveWindowSize = $derived(Math.max(1, Math.min(windowSize, totalDrivers)));
	const maxWindowStart = $derived(Math.max(1, totalDrivers - effectiveWindowSize + 1));
	const windowEnd = $derived(Math.min(windowStart + effectiveWindowSize - 1, totalDrivers));

	const visibleStandings = $derived(
		currentFrame.standings.filter((driver) => driver.rank >= windowStart && driver.rank <= windowEnd)
	);

	// Kuinka moni sijoitus on YLIPÄÄTÄÄN ratkaistu tässä framessa — raidan täyttymän perusta.
	const filledPercent = $derived(totalDrivers > 0 ? (currentFrame.standings.length / totalDrivers) * 100 : 0);
	const windowLeftPercent = $derived(totalDrivers > 0 ? ((windowStart - 1) / totalDrivers) * 100 : 0);
	const windowWidthPercent = $derived(totalDrivers > 0 ? (effectiveWindowSize / totalDrivers) * 100 : 100);

	// Vähintään 1500 pohjana, jotta yksittäisen kisan alun (kaikki lähellä
	// oletusreittausta) palkit eivät venähdä koko leveydelle merkityksettömän
	// pienestä eroista.
	const maxRating = $derived(Math.max(...currentFrame.standings.map((s) => s.rating), 1500));

	/**
	 * Kaikki datasetissä KOSKAAN esiintyvät kuljettajat nimineen, koottu
	 * JOKAISESTA framesta (ei vain nykyisestä/viimeisestä) — kuljettajahaun
	 * pitää löytää myös se joka ei ole vielä ajanut TÄTÄ nimenomaista
	 * kisaa. Lasketaan KERRAN (`frames` on staattinen propsi sivulatauksen
	 * jälkeen), ei joka framen vaihdossa uudelleen.
	 */
	const allDrivers = $derived.by(() => {
		const byIndex = new Map<number, string>();
		for (const frame of frames) {
			for (const standing of frame.standings) {
				byIndex.set(standing.driverIndex, standing.name);
			}
		}
		return [...byIndex.entries()].map(([driverIndex, name]) => ({ driverIndex, name }));
	});

	const searchResults = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return [];
		return allDrivers.filter((driver) => driver.name.toLowerCase().includes(query)).slice(0, 8);
	});

	const followedDriverName = $derived(allDrivers.find((driver) => driver.driverIndex === followedDriverIndex)?.name);

	/**
	 * Seuratun kuljettajan TARKKA sijoitus tässä framessa — UUSI 29.9.2026,
	 * käyttäjän pyyntö ("something like 120/155"). `undefined` jos hän ei
	 * ole vielä ajanut TÄTÄ kisaa (ei sijoitusta tässä framessa) — näytetään
	 * silloin "–" arvaamisen sijaan.
	 */
	const followedDriverRank = $derived(
		followedDriverIndex === undefined
			? undefined
			: currentFrame.standings.find((standing) => standing.driverIndex === followedDriverIndex)?.rank
	);

	/** Seuratun kuljettajan sijainti koko `.rank-slider__track`:in leveydellä — ERI asia kuin itse ikkuna (`.rank-slider__window`), tarkka piste ei aluetta. */
	const followedMarkerLeftPercent = $derived(
		followedDriverRank !== undefined && totalDrivers > 0 ? ((followedDriverRank - 1) / totalDrivers) * 100 : undefined
	);

	/**
	 * Seurannan YDIN: kun kuljettajaa seurataan, keskitetään ikkuna hänen
	 * NYKYISEEN sijoitukseensa AINA kun frame vaihtuu (myös silloin kun
	 * `currentFrameIndex` pysyy samana mutta `followedDriverIndex` juuri
	 * asetettiin). Jos kuljettajalla ei ole sijoitusta TÄSSÄ framessa
	 * (ei ole vielä ajanut), ikkuna jätetään ENNALLEEN — ei arvata mihin
	 * hän "todennäköisesti" sijoittuisi.
	 */
	$effect(() => {
		if (followedDriverIndex === undefined) return;
		const rank = currentFrame.standings.find((standing) => standing.driverIndex === followedDriverIndex)?.rank;
		if (rank === undefined) return;
		windowStart = clampWindowStart(rank - Math.floor(effectiveWindowSize / 2));
	});

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

	function clampWindowStart(value: number): number {
		return Math.min(Math.max(1, Math.round(value)), maxWindowStart);
	}

	function followDriver(driverIndex: number) {
		followedDriverIndex = driverIndex;
		searchQuery = '';
	}

	function unfollow() {
		followedDriverIndex = undefined;
	}

	/**
	 * Raahauksen (ja klikkauksen/nuolinäppäinten) aloitus lopettaa
	 * seurannan AINA — käyttäjä ottaa ohjat itse, automaattinen
	 * uudelleenkeskitys (ks. `$effect` yllä) ja käsinraahaus eivät voi
	 * olla voimassa samaan aikaan riitelemättä.
	 */
	function stopFollowingForManualControl() {
		followedDriverIndex = undefined;
	}

	function onThumbPointerDown(event: PointerEvent) {
		event.preventDefault();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragStartClientX = event.clientX;
		dragStartWindowStart = windowStart;
		dragTrackWidthPx = trackEl?.getBoundingClientRect().width ?? 1;
		stopFollowingForManualControl();
	}

	function onThumbPointerMove(event: PointerEvent) {
		if (event.buttons === 0) return;
		const deltaPx = event.clientX - dragStartClientX;
		const deltaRanks = (deltaPx / dragTrackWidthPx) * totalDrivers;
		windowStart = clampWindowStart(dragStartWindowStart + deltaRanks);
	}

	function onThumbKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
			windowStart = clampWindowStart(windowStart - 1);
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
			windowStart = clampWindowStart(windowStart + 1);
		} else if (event.key === 'Home') {
			windowStart = 1;
		} else if (event.key === 'End') {
			windowStart = maxWindowStart;
		} else {
			return;
		}
		event.preventDefault();
		stopFollowingForManualControl();
	}

	/** Klikkaus raidan TYHJÄÄN kohtaan (ei kahvaan) hyppää ikkunan sinne, keskitettynä klikkauskohtaan. */
	function onTrackClick(event: MouseEvent) {
		if (event.target !== trackEl || !trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const clickRatio = (event.clientX - rect.left) / rect.width;
		windowStart = clampWindowStart(clickRatio * totalDrivers - effectiveWindowSize / 2);
		stopFollowingForManualControl();
	}

	/** Johdonmukainen väri per kuljettaja — `driverIndex` on VAKAA koko datasetin ajan, joten sama kuljettaja saa aina saman värin framesta toiseen. */
	function getDriverColor(driverIndex: number): string {
		const hue = (driverIndex * 47) % 360;
		return `hsl(${hue}, 65%, 50%)`;
	}

	/**
	 * `frame.title` on API:sta valmiiksi yhdistetty merkkijono (esim.
	 * "FiSU S9 - Ahvenisto") — ratanimi on VIIMEISEN "-"-merkin JÄLKEINEN
	 * osa (useampi "-": käytetään VIIMEISTÄ), kausiosa kaikki sitä ennen.
	 * `undefined` race jos merkkiä ei löydy lainkaan.
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

	<div class="follow-bar">
		{#if followedDriverIndex !== undefined}
			<span class="follow-bar__badge">
				Seurataan: <strong>{followedDriverName}</strong>
				<span class="follow-bar__rank">
					{followedDriverRank ?? '–'}/{currentFrame.standings.length}
				</span>
				<button type="button" class="follow-bar__unfollow" onclick={unfollow} aria-label="Lopeta seuranta">✕</button>
			</span>
		{:else}
			<div class="follow-bar__search">
				<input
					type="text"
					class="follow-bar__input"
					placeholder="Etsi ja seuraa kuljettajaa…"
					bind:value={searchQuery}
					aria-label="Etsi kuljettaja seurattavaksi"
				/>
				{#if searchResults.length > 0}
					<ul class="follow-bar__results">
						{#each searchResults as driver (driver.driverIndex)}
							<li>
								<button type="button" onclick={() => followDriver(driver.driverIndex)}>{driver.name}</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>

	<!--
		Raahattava sijoitusikkuna — käyttäjän oma idea 29.9.2026, korvaa
		aiemmat kiinteät "1–15/16–30/..."-välilehdet. Täyttynyt osuus
		(vihreä) = kuinka moni sijoitus on ratkaistu TÄSSÄ framessa.
	-->
	<div class="rank-slider">
		<div class="rank-slider__track" bind:this={trackEl} onclick={onTrackClick} role="presentation">
			<div class="rank-slider__filled" style="width: {filledPercent}%"></div>
			{#if followedMarkerLeftPercent !== undefined}
				<!-- Seuratun kuljettajan TARKKA sijainti — pieni piste, EI sama asia kuin ikkuna-alue alla. -->
				<div class="rank-slider__marker" style="left: {followedMarkerLeftPercent}%" aria-hidden="true"></div>
			{/if}
			<div
				class="rank-slider__window"
				style="left: {windowLeftPercent}%; width: {windowWidthPercent}%"
				role="slider"
				tabindex="0"
				aria-valuemin={1}
				aria-valuemax={maxWindowStart}
				aria-valuenow={windowStart}
				aria-label="Näkyvä sijoitusalue"
				onpointerdown={onThumbPointerDown}
				onpointermove={onThumbPointerMove}
				onkeydown={onThumbKeyDown}
			></div>
		</div>
		<p class="rank-slider__label">Sijat {windowStart}–{windowEnd} / {totalDrivers}</p>
	</div>

	<div class="chart-viewport">
		{#if visibleStandings.length === 0}
			<!--
				Käyttäjän huomio (29.9.2026): kaukaisemmat sijoitukset voivat olla
				TÄYSIN ratkaisematta kauden alun kisoissa, koska vain ajaneet
				kuljettajat saavat sijoituksen tässä framessa. TARKOITUKSELLA ei
				täytetä tätä keksityillä "kosmeettinen 0 reittaus" -riveillä —
				se täyttäisi näkymän kymmenillä merkityksettömillä nollapalkeilla.
				Raidan vihreä täyttymä (ks. `.rank-slider__filled`) kertoo jo
				ETUKÄTEEN onko tällä ikkunalla mitään näytettävää.
			-->
			<p class="chart-empty">Kukaan ei ole vielä ajanut tälle sijavälille tässä kisassa.</p>
		{:else}
			<div class="bars">
				{#each visibleStandings as driver (driver.driverIndex)}
					<!-- Kerroin 80 (ei 100): jättää AINA vähintään 20 % track:in leveydestä `.bar-row__rating`-tekstille, ettei se työnny ulos laatikosta täydellä palkilla. -->
					{@const barWidth = Math.max(2, (driver.rating / maxRating) * 80)}
					<div
						class="bar-row"
						class:bar-row--followed={driver.driverIndex === followedDriverIndex}
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
		<button type="button" class="play-btn" aria-label={isPlaying ? 'Keskeytä toisto' : 'Toista'} onclick={togglePlay}>
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
		container-type: inline-size;
		width: 100%;
		max-width: 1080px;
		margin: 0 auto;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-surface-border);
		padding: var(--space-4) var(--space-8) var(--space-8);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.chart-watermark {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%) rotate(-8deg);
		transform-origin: center;
		font-size: clamp(5rem, 5rem + 14cqi, 16rem);
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
		margin-bottom: var(--space-6);
	}

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

	.chart-header__race {
		margin-top: var(--space-1);
		font-size: var(--font-size-lg);
		font-weight: 800;
		color: var(--color-info);
	}

	/*
	 * Kuljettajahaku/seurantapalkki — UUSI 29.9.2026, käyttäjän pyyntö
	 * ("filter field to see or locate the followed driver"). Tulosluettelo
	 * on yksinkertainen pudotuslista suoraan hakukentän alla, ei erillistä
	 * ylimalkaista autocomplete-kirjastoa.
	 */
	.follow-bar {
		position: relative;
		z-index: 2;
		margin-bottom: var(--space-4);
		min-height: 2.25rem;
	}

	.follow-bar__search {
		position: relative;
		max-width: 20rem;
	}

	.follow-bar__input {
		width: 100%;
		background: var(--color-bg);
		border: 1px solid var(--color-surface-border);
		color: var(--color-text);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
	}

	.follow-bar__results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: var(--space-1);
		background: var(--color-bg);
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-md);
		list-style: none;
		padding: var(--space-1);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		box-shadow: 0 8px 24px color-mix(in oklch, black 40%, transparent);
	}

	.follow-bar__results button {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.follow-bar__results button:hover {
		background: var(--color-surface);
	}

	.follow-bar__badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		background: color-mix(in oklch, var(--color-warning) 16%, var(--color-surface));
		border: 1px solid color-mix(in oklch, var(--color-warning) 32%, transparent);
		font-size: var(--font-size-sm);
	}

	/*
	 * Tarkka "sijoitus/ratkaistut"-lukema (esim. "120/155") — UUSI
	 * 29.9.2026, käyttäjän pyyntö. PÄIVITETTY (sama päivä): nimittäjä on
	 * `currentFrame.standings.length` (kuinka moni kuljettaja on
	 * YLIPÄÄTÄÄN ratkaistu TÄSSÄ framessa), EI `totalDrivers` (koko
	 * datasetin kuljettajamäärä) — käyttäjän oma perustelu: "compared to
	 * the currently available drivers", eli sijoitus kertoo missä hän on
	 * suhteessa NIIHIN jotka ovat jo ajaneet, ei koko historian kaikkiin
	 * kuljettajiin (joista suurin osa ei ole vielä edes ajanut tätä kisaa
	 * kauden alussa). Hillitympi kuin nimi, koska nimi on rivin pääasia.
	 */
	.follow-bar__rank {
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.follow-bar__unfollow {
		color: var(--color-text-muted);
		font-weight: 700;
	}

	.follow-bar__unfollow:hover {
		color: var(--color-text);
	}

	/*
	 * Raahattava sijoitusikkuna — UUSI 29.9.2026, käyttäjän oma idea,
	 * korvaa aiemmat kiinteät "1–15/16–30/..."-välilehdet. `.rank-slider__
	 * track` on koko 1..totalDrivers-asteikko, `__filled` näyttää kuinka
	 * moni sijoitus on ratkaistu TÄSSÄ framessa, `__window` on itse
	 * raahattava kahva (kokoinen `windowSize`, ks. script-lohko).
	 */
	.rank-slider {
		position: relative;
		z-index: 1;
		margin-bottom: var(--space-6);
	}

	.rank-slider__track {
		position: relative;
		height: 1.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		overflow: hidden;
	}

	.rank-slider__filled {
		position: absolute;
		inset-block: 0;
		left: 0;
		background: color-mix(in oklch, var(--color-success) 20%, transparent);
		pointer-events: none;
		transition: width 0.3s ease-out;
	}

	/*
	 * Seuratun kuljettajan TARKKA sijainti track:illa — UUSI 29.9.2026,
	 * käyttäjän pyyntö ("something like 120/155"). ERI asia kuin
	 * `.rank-slider__window` (joka on ALUE, ikkunan koko) — tämä on yksi
	 * PISTE, samalla lämpimällä värillä kuin seuratun kuljettajan
	 * palkkikorostus (`.bar-row--followed`) ja `.follow-bar__badge`,
	 * jotta ne kaikki lukevat samana "tämä on seurattu" -konseptina.
	 * `z-index: 2` nostaa sen `.rank-slider__window`:in (joka voi peittää
	 * sen alleen) YLÄPUOLELLE, jotta piste näkyy VAIKKA ikkuna olisi
	 * juuri sen kohdalla.
	 */
	.rank-slider__marker {
		position: absolute;
		inset-block: -2px;
		width: 3px;
		transform: translateX(-50%);
		background: var(--color-warning);
		border-radius: var(--radius-full);
		z-index: 2;
		pointer-events: none;
	}

	.rank-slider__window {
		position: absolute;
		inset-block: 2px;
		background: color-mix(in oklch, var(--color-info) 55%, transparent);
		border: 1px solid var(--color-info);
		border-radius: var(--radius-sm);
		cursor: grab;
		touch-action: none;
		transition: left 0.3s ease-out;
	}

	.rank-slider__window:active {
		cursor: grabbing;
	}

	.rank-slider__window:focus-visible {
		outline: 2px solid var(--color-info);
		outline-offset: 2px;
	}

	.rank-slider__label {
		margin-top: var(--space-1);
		font-size: var(--font-size-sm);
		color: var(--color-text-faint);
		text-align: right;
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
		border-radius: var(--radius-md);
		transition: background-color var(--duration-fast) var(--ease-out-quart);
	}

	/* Seurattavan kuljettajan korostus — UUSI 29.9.2026, sama lämmin sävy kuin `.follow-bar__badge`:ssa, jotta ne lukevat samana konseptina. */
	.bar-row--followed {
		background: color-mix(in oklch, var(--color-warning) 12%, transparent);
	}

	.bar-row--followed .bar-row__name {
		color: var(--color-warning);
		font-weight: 800;
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

	.bar-row__fill {
		position: absolute;
		inset-block: 0;
		left: 0;
		border-radius: var(--radius-md);
		transition: width 0.5s ease-out;
	}

	.bar-row__rating {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		margin-left: var(--space-2);
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
