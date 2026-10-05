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

	/**
	 * Ryhmittelee `sortedResults`:n splitin mukaan otsikkorivejä varten —
	 * UUSI 27.9.2026, käyttäjän pyyntö ("split borders somehow indicated").
	 * VAIN "Lopputulokset"-järjestyksessä (`resultSort === 'position'`):
	 * muissa järjestyksissä (nopein kierros, sijamuutos) rivit eivät ole
	 * enää yhtenäisiä split-ryhmiä, joten koko lista on yksi "ryhmä" ilman
	 * otsikkoa. Ei erillistä kenttää splittien MÄÄRÄLLE — se selviää
	 * suoraan tästä (eri `split`-arvojen joukosta), API-dokumentaation
	 * oman ohjeen mukaisesti ("that count falls out naturally from the
	 * distinct split values").
	 *
	 * HUOM (Svelten oma rajoitus): `animate:flip` vaatii olevansa keyed
	 * `{#each}`-lohkon AINOA lapsi — otsikkorivin ei siis voi laittaa
	 * SAMAAN `{#each}`-lohkoon `#if`:n taakse RaceResultRow'n rinnalle.
	 * Ratkaisu: ULOMPI `{#each}` iteroi näitä ryhmiä (otsikko + oma sisempi
	 * `{#each}` jonka AINOA lapsi on animate:flip-elementti) — ks. +page.svelte:n
	 * templaatti.
	 */
	const resultGroups = $derived.by(() => {
		if (resultSort !== 'position') return [{ split: null as number | null, items: sortedResults }];

		const groups: { split: number | null; items: typeof sortedResults }[] = [];
		for (const result of sortedResults) {
			const currentGroup = groups.at(-1);
			if (currentGroup && currentGroup.split === result.split) {
				currentGroup.items.push(result);
			} else {
				groups.push({ split: result.split, items: [result] });
			}
		}
		return groups;
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
	<!--
		Käyttäjän pyyntö 5.10.2026: linkki kisasivulta vastaavalle rata-
		sivulle — `LatestRaceResult.trackId` oli jo olemassa mappers.ts:ssä
		juuri tätä varten (ks. sen kommentti "käytetään mm. kisasivun
		'Rataprofiili'-linkkiin"), vain itse linkki puuttui tältä sivulta.
		`trackId` on optionaalinen (vanhemmat kisat, joilla ei ole API:n
		antamaa trackId:tä, ks. mapLatestRaceResult) — linkki piilotetaan
		kokonaan sellaisilla, ei näytetä rikkinäistä linkkiä.
	-->
	{#if data.result.trackId}
		<a href="/radat/{data.result.trackId}" class="link track-link">Radan sivulle →</a>
	{/if}

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
	<!-- Käyttäjän pyyntö 26.9.2026: voittajan rivillä näytetään `gapDisplay`-paikalla
	     auton kokonaisaika (`raceTime`) sen sijaan että paikka jäisi tyhjäksi — muille
	     kuljettajille sama paikka näyttää edelleen eron voittajaan (`result.gapDisplay`),
	     ks. mappers.ts:n `LatestRaceResult.raceTime`-kommentti. PÄIVITYS 27.9.2026
	     (splittien käyttöönotto): `raceTime` on YKSI arvo koko kisalle, joten se
	     annetaan VAIN "oikealle" voittajalle (ei-splitattu kisa, TAI splitin 1 oma P1)
	     — muiden splittien omat P1-rivit näyttävät tyhjän kuten ennen splittejä, koska
	     emme tiedä oliko `raceTime` NIMENOMAAN sen splitin voittajan aika. -->
	<!-- Käyttäjän pyyntö 26.9.2026: leveämmät kortit (320px -> 360px) + pienempi
	     ruudukon väli (data-gap 3 -> 2) — pitkä nimi ("Lucky like Fauntleroy")
	     ahtautui DNF/sijoitusmuutos-badgen kanssa kapeammilla korteilla, ks.
	     myös ListRow.svelte:n `.list-row__name`-clamp-tweaksta samasta pyynnöstä. -->
	<div class="fluid-grid result-grid" data-minsize="360px" data-gap="2" data-density="compact">
		{#each resultGroups as group (group.split ?? 'all')}
			{#if group.split !== null}
				<div class="split-divider">Split {group.split}</div>
			{/if}
			{#each group.items as result (result.driverId)}
				<div class="result-grid__item" animate:flip={{ duration: 350, easing: cubicOut }}>
					<RaceResultRow
						position={result.position}
						displayPosition={result.displayPosition}
						name={result.name}
						gapDisplay={result.position === 1 && (result.split === null || result.split === 1)
							? data.result.raceTime
							: result.gapDisplay}
						bestLapTime={result.bestLapTime}
						carName={result.car?.name}
						split={result.split}
						fastestLap={result.fastestLap}
						featured={result.position === 1}
						positionChange={result.positionChange}
						dnf={result.dnf}
					/>
				</div>
			{/each}
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
		margin-bottom: var(--space-4);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.track-link {
		display: inline-block;
		margin-bottom: var(--space-8);
		font-size: var(--font-size-sm);
	}

	.result-grid {
		margin-top: var(--space-4);
	}

	.result-grid__item {
		min-width: 0;
	}

	/*
	 * Splitin vaihtumisen otsikkorivi (UUSI 27.9.2026, käyttäjän pyyntö
	 * "split borders somehow indicated") — `grid-column: 1 / -1` venyttää
	 * sen koko `.result-grid`:n leveydeltä riippumatta senhetkisestä
	 * sarakemäärästä (`.fluid-grid`:n `auto-fit`), jotta se toimii omana
	 * "rivi(ku)naan" gridin sisällä ilman erillistä layoutia.
	 */
	.split-divider {
		grid-column: 1 / -1;
		margin-top: var(--space-2);
		padding-block: var(--space-1);
		font-size: var(--font-size-sm);
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-faint);
		border-bottom: 1px solid var(--color-surface-border);
	}

	/* Ensimmäinen splitti-otsikko ei tarvitse ylimääräistä marginaalia yläpuolelle. */
	.split-divider:first-child {
		margin-top: 0;
	}
</style>
