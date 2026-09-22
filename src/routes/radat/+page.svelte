<script lang="ts">
	/**
	 * Radat-indeksi. Käyttäjän pyyntö 22.9.2026: sama hakukenttä kuin
	 * kuljettajat-sivulla (ks. kuljettajat/+page.svelte:n kommentit —
	 * sama Firefox-appearance-bugikorjaus, sama ✕-tyhjennysnappi). Ei
	 * kausisuodatinta tällä sivulla (radat eivät ole kausikohtaisia), joten
	 * VAIN vapaa tekstihaku, joka täsmää sekä nimeen ETTÄ sijaintiin
	 * (esim. "hämeenlinna" löytää Ahveniston) — koko merkkijonosta, ei
	 * vain alusta, sama periaate kuin kuljettajahaussa.
	 */
	import TrackCard from '#lib/components/ui/TrackCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	const filteredTracks = $derived.by(() => {
		const query = search.trim().toLocaleLowerCase('fi');
		if (query === '') return data.tracks;
		return data.tracks.filter(
			(track) =>
				track.name.toLocaleLowerCase('fi').includes(query) ||
				track.location.toLocaleLowerCase('fi').includes(query)
		);
	});
</script>

<svelte:head>
	<title>Radat — FISU</title>
	<meta name="description" content="FISU:n ratatietokanta — radat, pituudet, mutkat ja viralliset ennätykset." />
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Radat</h1>

	<div class="search-wrap">
		<input
			class="search-input"
			type="search"
			placeholder="Hae radan nimellä tai sijainnilla…"
			aria-label="Hae rataa nimellä tai sijainnilla"
			bind:value={search}
		/>
		{#if search !== ''}
			<button type="button" class="search-clear" aria-label="Tyhjennä haku" onclick={() => (search = '')}>
				✕
			</button>
		{/if}
	</div>

	{#if filteredTracks.length === 0}
		<p class="empty">Ei ratoja tällä haulla.</p>
	{:else}
		<!--
			Käyttäjän pyyntö 22.9.2026 (viides kierros): kortit pysyisivät
			3 rinnakkain PIDEMPÄÄN ikkunaa kavennettaessa ennen kuin
			pudotaan 2 sarakkeeseen — `data-minsize="320px"` poistettu
			kokonaan, jolloin `.fluid-grid` käyttää OMAA sivunlaajuista
			oletusarvoaan (260px, ks. global.css:n `.fluid-grid`-peruskysely)
			sen sijaan että tälle sivulle olisi asetettu erikseen isompi
			minimikoko. Pienempi minsize -> `auto-fit` mahtuu useamman
			sarakkeen kapeammallakin ikkunalla ennen pudotusta.
		-->
		<div class="fluid-grid track-grid" data-gap="4">
			{#each filteredTracks as track (track.id)}
				<TrackCard
					id={track.id}
					name={track.name}
					location={track.location}
					length={track.length}
					turns={track.turns}
					built={track.built}
					imageUrl={track.imageUrl}
				/>
			{/each}
		</div>
	{/if}
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
		margin-bottom: var(--space-6);
	}

	/* Sama toteutus kuin kuljettajat/+page.svelte:n .search-wrap/.search-input/
	   .search-clear:ssä — ks. sen kommentit (mm. Firefox-appearance-bugi). */
	.search-wrap {
		position: relative;
		max-width: 24rem;
		margin-bottom: var(--space-6);
	}

	.search-input {
		width: 100%;
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: 600;
		transition: border-color var(--duration-fast) var(--ease-out-quart);
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
	}

	.search-input::placeholder {
		color: var(--color-text-faint);
		font-weight: 400;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-info);
	}

	.search-input::-webkit-search-cancel-button {
		display: none;
	}

	.search-clear {
		position: absolute;
		right: var(--space-2);
		top: 50%;
		translate: 0 -50%;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-full);
		color: var(--color-text-faint);
		font-size: 0.8rem;
		line-height: 1;
		transition:
			background var(--duration-fast) var(--ease-out-quart),
			color var(--duration-fast) var(--ease-out-quart);
	}

	.search-clear:hover {
		background: var(--color-surface-border);
		color: var(--color-text);
	}

	.empty {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	/*
	 * NELJÄS KIERROS (22.9.2026, käyttäjän palaute): TrackCard.svelte:n
	 * aiempi rivi/sarake-layoutin vaihto (ja sen ajamiseen tarvittu
	 * NIMETTY `track-grid`-kokokysely tässä tiedostossa) on POISTETTU —
	 * käyttäjä kokeili rivimuotoa livenä eikä pitänyt siitä tällä
	 * INDEKSIKORTILLA. Kortti käyttää nyt aina samaa pystysuuntaista
	 * layoutia, ja VAIN `.fluid-grid`:n sarakemäärä + korttien sisällön
	 * `cqi`-pohjainen fluidi koko (ks. TrackCard.svelte) mukautuvat
	 * ikkunan leveyteen — ei enää tarvetta `container-type`/`container-name`
	 * -pariskunnalle tässä, koska mitään ei enää kysytä ruudukon
	 * leveydeltä.
	 *
	 * `align-items: stretch` (korvaa `.fluid-grid`:n oletuksen `start`,
	 * ks. sen kommentti global.css:ssä — TARKOITUKSELLA ERI tälle
	 * sivulle) on kuitenkin JÄTETTY: käyttäjän pyyntö 22.9.2026, korttien
	 * pitäisi olla SAMAN KORKUISIA. `stretch` tasaa saman RIVIN kortit
	 * automaattisesti, ja yhdistettynä `.track-card__heading`:n
	 * `min-height`:iin (TrackCard.svelte) käytännössä hyvin lähellä sitä
	 * normaalilla datalla. `.fluid-grid.track-grid` (kaksi luokkaa)
	 * spesifisyyden vuoksi tarkoituksella, jotta tämä voittaa
	 * `.fluid-grid`:n oman `align-items: start`:in tiedostojärjestyksestä
	 * riippumatta.
	 */
	.fluid-grid.track-grid {
		align-items: stretch;
	}
</style>
