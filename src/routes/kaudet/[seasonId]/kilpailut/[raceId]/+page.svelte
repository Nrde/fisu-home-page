<script lang="ts">
	/**
	 * Kisan tulossivu. Tulosten lajittelu+FLIP-animaatio on tarkoituksella
	 * identtinen etusivun "Viimeisimmät tulokset" -osion kanssa (ks.
	 * +page.svelte:n `resultSort`/`sortedResults`-kommentit) — sama data,
	 * sama UX, mikä tahansa kisa (ei vain kauden viimeisin).
	 */
	import CarList from '#lib/components/ui/CarList.svelte';
	import RaceResultRow from '#lib/components/ui/RaceResultRow.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { parseLapTimeSeconds } from '#lib/utils/lapTime.ts';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let resultSort = $state<'position' | 'lapTime' | 'positionChange'>('position');

	const sortedResults = $derived.by(() => {
		const results = data.result.results;

		if (resultSort === 'lapTime') {
			return [...results].sort((a, b) => {
				const secondsA = parseLapTimeSeconds(a.bestLapTime);
				const secondsB = parseLapTimeSeconds(b.bestLapTime);
				if (secondsA === undefined && secondsB === undefined) return 0;
				if (secondsA === undefined) return 1;
				if (secondsB === undefined) return -1;
				return secondsA - secondsB;
			});
		}

		if (resultSort === 'positionChange') {
			return [...results].sort((a, b) => {
				const changeA = a.positionChange;
				const changeB = b.positionChange;
				if (changeA === undefined && changeB === undefined) return 0;
				if (changeA === undefined) return 1;
				if (changeB === undefined) return -1;
				return changeB - changeA;
			});
		}

		return results;
	});
</script>

<svelte:head>
	<title>{data.result.trackName} — {data.result.seasonName} — FISU</title>
	<meta name="description" content="Kisatulokset: {data.result.trackName} — {data.result.seasonName}." />
</svelte:head>

<section class="page-grid section">
	<a href="/kaudet/{data.seasonId}" class="link back-link">← Takaisin kauteen</a>

	<h1 class="race-name">{data.result.trackName}</h1>
	<p class="race-season">{data.result.seasonName}</p>

	<CarList cars={data.cars} />

	<SegmentedControl
		label="Tulosten järjestys"
		bind:value={resultSort}
		options={[
			{ value: 'position', label: 'Lopputulokset' },
			{ value: 'lapTime', label: 'Nopein kierros' },
			{ value: 'positionChange', label: 'Sijoja voitettu/hävitty' }
		]}
	/>
	<!-- Käyttäjän pyyntö 26.9.2026: voittajan rivillä (position === 1) näytetään nyt
	     `gapDisplay`-paikalla auton kokonaisaika (`raceTime`) sen sijaan että paikka
	     jäisi tyhjäksi — muille kuljettajille sama paikka näyttää edelleen eron
	     voittajaan (`result.gapDisplay`), ks. mappers.ts:n `LatestRaceResult.
	     raceTime`-kommentti. -->
	<!-- Käyttäjän pyyntö 26.9.2026: leveämmät kortit (320px -> 360px) + pienempi
	     ruudukon väli (data-gap 3 -> 2) — pitkä nimi ("Lucky like Fauntleroy")
	     ahtautui DNF/sijoitusmuutos-badgen kanssa kapeammilla korteilla, ks.
	     myös ListRow.svelte:n `.list-row__name`-clamp-tweaksta samasta pyynnöstä. -->
	<div class="fluid-grid result-grid" data-minsize="360px" data-gap="2" data-density="compact">
		{#each sortedResults as result (result.driverId)}
			<div class="result-grid__item" animate:flip={{ duration: 350, easing: cubicOut }}>
				<RaceResultRow
					position={result.position}
					displayPosition={result.displayPosition}
					name={result.name}
					gapDisplay={result.position === 1 ? data.result.raceTime : result.gapDisplay}
					bestLapTime={result.bestLapTime}
					carName={result.car?.name}
					fastestLap={result.fastestLap}
					featured={result.position === 1}
					positionChange={result.positionChange}
					dnf={result.dnf}
				/>
			</div>
		{/each}
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

	.race-name {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.race-season {
		margin-top: var(--space-1);
		margin-bottom: var(--space-8);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.result-grid {
		margin-top: var(--space-4);
	}

	.result-grid__item {
		min-width: 0;
	}
</style>
