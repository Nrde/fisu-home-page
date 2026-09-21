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
</script>

<svelte:head>
	<title>{track.name} — Radat — FISU</title>
	<meta name="description" content="{track.name}, {track.location} — ratatiedot ja FISU:n kisahistoria." />
</svelte:head>

<section class="page-grid section">
	<a href="/radat" class="link back-link">← Kaikki radat</a>

	{#if data.isMockData}
		<p class="mock-notice">⚠ Kehitystila: API-yhteys epäonnistui, sivu näyttää esimerkkidataa.</p>
	{/if}

	<h1 class="track-name">{track.name}</h1>
	<p class="track-location">{track.location}</p>

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
		{#if track.length !== undefined}
			<div class="track-facts__item">
				<p class="track-facts__value">{track.length}</p>
				<p class="track-facts__label">Pituus</p>
			</div>
		{/if}
		{#if track.turns !== undefined}
			<div class="track-facts__item">
				<p class="track-facts__value">{track.turns}</p>
				<p class="track-facts__label">Mutkaa</p>
			</div>
		{/if}
		{#if track.elevation !== undefined}
			<div class="track-facts__item">
				<p class="track-facts__value">{track.elevation}</p>
				<p class="track-facts__label">Korkeusero</p>
			</div>
		{/if}
		{#if track.built !== undefined}
			<div class="track-facts__item">
				<p class="track-facts__value">
					{track.built}{#if track.builtExtra}<span class="track-facts__extra"> ({track.builtExtra})</span>{/if}
				</p>
				<p class="track-facts__label">Rakennettu</p>
			</div>
		{/if}
	</div>

	{#if track.lapRecord}
		<div class="lap-record">
			<p class="lap-record__label">Virallinen rataennätys</p>
			<p class="lap-record__time">{track.lapRecord}</p>
			{#if track.lapRecordDriver || track.lapRecordCar}
				<p class="lap-record__driver">
					{track.lapRecordDriver}{#if track.lapRecordCar}{' '}<span class="lap-record__car"
							>— {track.lapRecordCar}</span
						>{/if}
				</p>
			{/if}
		</div>
	{/if}

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
	.section {
		padding-block: var(--space-12);
	}

	.back-link {
		display: inline-block;
		margin-bottom: var(--space-6);
	}

	.track-name {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.track-location {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.track-map {
		margin-top: var(--space-6);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: color-mix(in oklch, white 96%, var(--color-bg));
	}

	.track-map img {
		display: block;
		width: 100%;
		height: auto;
		max-height: 420px;
		object-fit: contain;
	}

	.track-facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-6);
		margin-top: var(--space-8);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.track-facts__value {
		font-size: var(--font-size-lg);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.track-facts__extra {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-faint);
	}

	.track-facts__label {
		margin-top: var(--space-1);
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}

	.lap-record {
		margin-top: var(--space-6);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: color-mix(in oklch, var(--color-warning) 10%, var(--color-surface));
		border: 1px solid color-mix(in oklch, var(--color-warning) 30%, transparent);
	}

	.lap-record__label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-warning);
	}

	.lap-record__time {
		margin-top: var(--space-1);
		font-size: var(--font-size-xl);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.lap-record__driver {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.lap-record__car {
		color: var(--color-text-faint);
		font-weight: 400;
	}

	.track-info {
		margin-top: var(--space-6);
		max-width: 65ch;
		line-height: var(--line-height-relaxed, 1.6);
		color: var(--color-text-muted);
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

	.mock-notice {
		margin-bottom: var(--space-6);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: color-mix(in oklch, var(--color-warning) 15%, var(--color-bg));
		border: 1px solid color-mix(in oklch, var(--color-warning) 40%, transparent);
		color: var(--color-warning);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}
</style>
