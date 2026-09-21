<script lang="ts">
	/**
	 * Tilastot-sivu: kolme osiota UUDEN `/stats/organiser/{organiser}/
	 * complete`-endpointin ympärille (ks. +page.server.ts:n kommentti).
	 *
	 * 1) Kuljettajien ennätykset — neljä top-10-listaa (voitot,
	 *    palkintosijat, paalupaikat, nopeimmat kierrokset), vaihdetaan
	 *    SegmentedControlilla (sama komponentti kuin kisasivun
	 *    tulosjärjestyksen vaihdossa). Jokainen rivi linkittää
	 *    kuljettajan profiiliin.
	 * 2) Suosituimmat radat — ratakohtainen kisamäärä yhdistettynä
	 *    /tracks-listan nimiin ja kuvakarttoihin (ks. mappers.ts:n
	 *    mapTrackUsage), pylväsmuotoinen suhteellinen vertailu.
	 * 3) Kausien kehitys — kuljettaja-/kisamäärä kaudittain.
	 */
	import ListRow from '#lib/components/ui/ListRow.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import type { LeaderboardEntry } from '#lib/server/api/mappers.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type LeaderboardKey = 'mostWins' | 'mostPodiums' | 'mostPoles' | 'mostFastestLaps';

	let leaderboardKey = $state<LeaderboardKey>('mostWins');

	// Yksi paikka joka tietää MITÄ lukua kukin leaderboard-välilehti
	// korostaa ja miten se muotoillaan suomeksi (eri sanat taipuvat eri
	// tavalla partitiivissa, joten tämä ei voi olla yksi geneerinen
	// "{n} {label}" -pohja).
	const LEADERBOARD_TABS: {
		value: LeaderboardKey;
		label: string;
		statValue: (entry: LeaderboardEntry) => number;
		statLabel: (n: number) => string;
	}[] = [
		{ value: 'mostWins', label: 'Voitot', statValue: (e) => e.wins, statLabel: (n) => `${n} voittoa` },
		{ value: 'mostPodiums', label: 'Palkintosijat', statValue: (e) => e.podiums, statLabel: (n) => `${n} palkintosijaa` },
		{ value: 'mostPoles', label: 'Paalupaikat', statValue: (e) => e.poles, statLabel: (n) => `${n} paalupaikkaa` },
		{
			value: 'mostFastestLaps',
			label: 'Nopeimmat kierrokset',
			statValue: (e) => e.fastestLaps,
			statLabel: (n) => `${n} nopeinta kierrosta`
		}
	];

	const activeTab = $derived(LEADERBOARD_TABS.find((tab) => tab.value === leaderboardKey)!);
	const currentEntries = $derived(data.leaderboards[leaderboardKey]);

	// Käyttäjän pyyntö 22.9.2026: "voitoista ja kilpailuista voisi laskea
	// prosentin (10 kilpailua/10 voittoa -> 100%)" — sama osumaprosentti
	// pätee KAIKKIIN neljään ennätyslistan lukuun (voitot/palkintosijat/
	// paalupaikat/nopeimmat kierrokset) suhteessa ajettuihin kilpailuihin,
	// joten yksi geneerinen laskin riittää `activeTab.statValue`:n kanssa
	// sen sijaan että jokaiselle välilehdelle kirjoitettaisiin oma versio.
	// `entry.races` on aina >0 tässä listassa (muuten kuljettaja ei voisi
	// olla ennätyslistalla), mutta suojataan silti nollalla jakamiselta.
	function hitRatePercent(entry: LeaderboardEntry): number | undefined {
		if (entry.races <= 0) return undefined;
		return Math.round((activeTab.statValue(entry) / entry.races) * 100);
	}

	// Suurin kisamäärä listan radoista — jakajana pylväiden suhteelliselle
	// leveydelle. `reduce` eikä `Math.max(...array)`, koska spreadaus
	// suurelle taulukolle voisi teoriassa kaatua call stackiin (ei
	// realistista tässä radan määrässä, mutta ei tarvetta ottaa riskiä).
	const maxTrackRaceCount = $derived(
		data.trackUsage.reduce((max, track) => Math.max(max, track.raceCount), 1)
	);

	// Radan kuvakartta voi epäonnistua lataamaan (esim. tuntematon
	// tiedostonimi) — piilotetaan tällöin VAIN kuvalohko suoraan DOM:ista
	// sen sijaan että ylläpidettäisiin erillistä per-rata state-muuttujaa
	// jokaiselle listan riville.
	function hideFailedImage(event: Event) {
		const wrapper = (event.currentTarget as HTMLImageElement).closest<HTMLElement>('.track-usage-item__image');
		if (wrapper) wrapper.style.display = 'none';
	}
</script>

<svelte:head>
	<title>Tilastot — FISU</title>
	<meta
		name="description"
		content="FISU:n yhteisötilastot: eniten voittoja, palkintosijoja, paalupaikkoja ja nopeimpia kierroksia, suosituimmat radat ja kausien kehitys."
	/>
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Tilastot</h1>

	<div class="block">
		<h2 class="block__title">Kuljettajien ennätykset</h2>
		<SegmentedControl label="Ennätyslista" bind:value={leaderboardKey} options={LEADERBOARD_TABS} />

		{#if currentEntries.length === 0}
			<p class="empty">Ei vielä dataa tähän listaan.</p>
		{:else}
			<div class="fluid-grid" data-minsize="320px" data-gap="2" data-density="compact">
				{#each currentEntries as entry, index (entry.driverId)}
					<a class="row-link" href="/kuljettajat/{entry.driverId}">
						<ListRow position={index + 1} name={entry.name} metaAccent="warning">
							{#snippet meta()}
								{activeTab.statLabel(activeTab.statValue(entry))}
								{#if hitRatePercent(entry) !== undefined}
									<span class="stat-percent">({hitRatePercent(entry)} %)</span>
								{/if}
							{/snippet}
							{#snippet metaSecondary()}{entry.races} kilpailua{/snippet}
						</ListRow>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="block">
		<h2 class="block__title">Suosituimmat radat</h2>
		<ul class="track-usage-list">
			{#each data.trackUsage as track (track.trackId)}
				<li class="track-usage-item">
					{#if track.imageUrl}
						<div class="track-usage-item__image">
							<img src={track.imageUrl} alt="" loading="lazy" onerror={hideFailedImage} />
						</div>
					{/if}
					<div class="track-usage-item__body">
						<div class="track-usage-item__header">
							{#if track.trackName}
								<a class="link track-usage-item__name" href="/radat/{track.trackId}">{track.trackName}</a>
							{:else}
								<span class="track-usage-item__unknown" title="Tätä rataa ei löydy ratatietokannasta">{track.trackId}</span>
							{/if}
							<span class="track-usage-item__count">{track.raceCount} kisaa</span>
						</div>
						<div class="track-usage-item__bar">
							<div
								class="track-usage-item__bar-fill"
								style="width: {(track.raceCount / maxTrackRaceCount) * 100}%"
							></div>
						</div>
					</div>
				</li>
			{/each}
		</ul>
		{#if data.racesWithUnknownTrack > 0}
			<p class="track-usage-note">
				Lisäksi {data.racesWithUnknownTrack} kisaa joiden rataa ei ole tunnistettu.
			</p>
		{/if}
	</div>

	<div class="block">
		<h2 class="block__title">Kausien kehitys</h2>
		<ul class="season-trend-list">
			{#each data.seasonTrends as season (season.seasonId)}
				<li class="season-trend-item">
					<span class="season-trend-item__name">{season.seasonName}</span>
					<span class="season-trend-item__stats">{season.driverCount} kuljettajaa · {season.raceCount} kisaa</span>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
		margin-bottom: var(--space-8);
	}

	.block {
		margin-top: var(--space-12);
	}

	.block:first-of-type {
		margin-top: 0;
	}

	.block__title {
		font-size: var(--font-size-lg);
		font-weight: 800;
		margin-bottom: var(--space-4);
	}

	.empty {
		margin-top: var(--space-4);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	.fluid-grid {
		margin-top: var(--space-4);
	}

	/* Osumaprosentti ("(24 %)") "X voittoa"-tekstin perässä — käyttäjän
	   pyyntö 22.9.2026. Hillitympi väri ja hieman kevyempi paino kuin
	   itse lukema (`.list-row__meta`) erottaa sen selvästi TÄYDENTÄVÄNÄ
	   lisätietona, ei toisena yhtä tärkeänä lukuna. `white-space: nowrap`
	   estää "(24" ja "%)" repeytymisen eri riveille ahtaalla kortilla. */
	.stat-percent {
		margin-left: 0.35em;
		font-weight: 500;
		color: var(--color-text-faint);
		white-space: nowrap;
	}

	/* Koko ListRow-rivi on linkki, sama periaate kuin
	   kuljettajat/[driverId]/+page.svelte:n .race-row-link:ssä. */
	.row-link {
		display: block;
		color: inherit;
		text-decoration: none;
	}

	.track-usage-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.track-usage-item {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.track-usage-item__image {
		flex-shrink: 0;
		width: 72px;
		height: 56px;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		background: color-mix(in oklch, white 96%, var(--color-bg));
	}

	.track-usage-item__image img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.track-usage-item__body {
		flex: 1 1 auto;
		min-width: 0;
	}

	.track-usage-item__header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
	}

	.track-usage-item__name {
		font-weight: 700;
	}

	.track-usage-item__unknown {
		font-weight: 700;
		color: var(--color-text-faint);
		font-family: var(--font-mono, monospace);
		font-size: var(--font-size-sm);
	}

	.track-usage-item__count {
		flex-shrink: 0;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
	}

	.track-usage-item__bar {
		margin-top: var(--space-2);
		height: 6px;
		border-radius: var(--radius-full);
		background: color-mix(in oklch, var(--color-surface) 100%, white 10%);
		overflow: hidden;
	}

	.track-usage-item__bar-fill {
		height: 100%;
		border-radius: var(--radius-full);
		background: var(--color-info);
	}

	.track-usage-note {
		margin-top: var(--space-3);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	.season-trend-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.season-trend-item {
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

	.season-trend-item__name {
		font-weight: 700;
	}

	.season-trend-item__stats {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
	}

</style>
