<script lang="ts">
	/**
	 * RaceChart — animoitu "rating race" -pylväskaavio kuljettajien
	 * reittauksen (Elo-tyyppinen luku) kehityksestä kisa kisalta.
	 *
	 * PÄIVITYS (28.9.2026): tämä oli aiemmin "ensimmäinen versio" joka
	 * OLETTI eri datamuodon kuin mitä oikea `/cache/race_chart_data.json`
	 * -endpoint oikeasti antaa — se käsitteli `drivers`:ia id-avaimisena
	 * SANAKIRJANA (`data.drivers[driver.id]`) ja odotti jokaisella
	 * `standings`-rivillä valmiita `id`/`rank` -kenttiä, kun oikea API antaa
	 * `drivers`:in TAULUKKONA ja `standings`:in `[driverIndex, rating]`
	 * -pareina joista `rank` on vain parin oma indeksi (ks. types.ts:n
	 * `RawRaceChartFrame`-kommentti). Komponentti EI olisi toiminut oikeaa
	 * dataa vasten. `mappers.ts`:n `mapRaceChartData` ratkaisee nyt nimen/
	 * sijoituksen VALMIIKSI jokaiselle riville ennen kuin data päätyy tänne
	 * — tämä komponentti ei siis enää tarvitse erillistä `drivers`-proppia
	 * lainkaan, vain jo täysin ratkaistut `frames`.
	 */
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { RaceChartFrame } from '#lib/server/api/mappers.ts';

	let {
		frames,
		totalDrivers,
		batchSize = 20
	}: {
		frames: RaceChartFrame[];
		totalDrivers: number;
		/** Montako kuljettajaa näytetään kerrallaan yhdellä "Sijat X–Y" -välilehdellä — kaavio pysyy luettavana vaikka kuljettajia olisi kymmeniä. */
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
</script>

<div class="chart-container">
	<header class="chart-header">
		<h2>{currentFrame.title || 'Reittauksen kehitys'}</h2>
		<p class="subtitle">Kisa {currentFrameIndex + 1} / {totalFrames}</p>
	</header>

	{#if totalBatches > 1}
		<div class="batch-tabs">
			{#each Array(totalBatches) as _, idx}
				{@const start = idx * batchSize + 1}
				{@const end = Math.min((idx + 1) * batchSize, totalDrivers)}
				<button type="button" class="tab-btn" class:active={activeBatchIndex === idx} onclick={() => (activeBatchIndex = idx)}>
					Sijat {start}–{end}
				</button>
			{/each}
		</div>
	{/if}

	<div class="chart-viewport">
		<svg width="100%" height={visibleStandings.length * 36 + 20}>
			{#each visibleStandings as driver (driver.driverIndex)}
				{@const yPos = (driver.rank - currentRangeStart) * 36}
				{@const barWidth = Math.max(5, (driver.rating / maxRating) * 70)}

				<g class="bar-group" transform="translate(0, {yPos})" animate:flip={{ duration: 600 }} transition:fade={{ duration: 200 }}>
					<text x="140" y="22" class="driver-name" text-anchor="end">
						{driver.name}
					</text>

					<rect x="150" y="6" width="{barWidth}%" height="24" rx="4" fill={getDriverColor(driver.driverIndex)} />

					<text x={155 + barWidth * 7} y="22" class="driver-rating">
						{driver.rating.toLocaleString('fi-FI')} (S{driver.rank})
					</text>
				</g>
			{/each}
		</svg>
	</div>

	<div class="controls">
		<button type="button" class="play-btn" onclick={togglePlay}>
			{isPlaying ? 'Tauko' : 'Toista'}
		</button>

		<input type="range" min="0" max={totalFrames - 1} bind:value={currentFrameIndex} class="timeline-scrubber" aria-label="Kisan valinta" />

		<select bind:value={playbackSpeed} class="speed-select" aria-label="Toistonopeus">
			<option value={1500}>0.5x nopeus</option>
			<option value={1000}>1.0x nopeus</option>
			<option value={500}>2.0x nopeus</option>
		</select>
	</div>
</div>

<style>
	.chart-container {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-surface-border);
		padding: var(--space-5);
		border-radius: var(--radius-lg);
	}

	.chart-header {
		margin-bottom: var(--space-4);
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.batch-tabs {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-bottom: var(--space-5);
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
		width: 100%;
		overflow: hidden;
	}

	.bar-group {
		transition: transform 0.6s ease;
	}

	.driver-name {
		fill: var(--color-text);
		font-size: 13px;
		font-weight: 500;
	}

	.driver-rating {
		fill: var(--color-text);
		font-size: 12px;
		font-weight: bold;
	}

	rect {
		transition: width 0.5s ease-out;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-6);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-surface-border);
	}

	.play-btn {
		background: var(--color-info);
		color: var(--color-bg);
		border: none;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-weight: 700;
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
	}
</style>
