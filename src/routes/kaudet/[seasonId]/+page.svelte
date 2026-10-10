<script lang="ts">
	/**
	 * Kausisivu. Sarjataulukko-osio (lajittelu + FLIP-animaatio) on
	 * tarkoituksella LÄHES identtinen etusivun vastaavan kanssa (ks.
	 * +page.svelte:n `standingsSort`/`sortedStandings`-kommentit) — sama
	 * data, sama UX, eri kausi. Uutta tällä sivulla on "Kilpailut"-osio:
	 * kauden koko kisalista ajettu/tuleva-tilalla, linkit tulossivulle
	 * VAIN ajetuille kisoille (tulevalle kisalle ei ole vielä tuloksia
	 * haettavana).
	 */
	import CarList from '#lib/components/ui/CarList.svelte';
	import DriverCard from '#lib/components/ui/DriverCard.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let standingsSort = $state<'position' | 'pointsPerRace' | 'racesCount' | 'bestFinish'>('position');

	const sortedStandings = $derived.by(() => {
		const standings = data.season.standings;

		if (standingsSort === 'pointsPerRace') {
			return [...standings].sort((a, b) => {
				const avgA = a.racesCount ? a.points / a.racesCount : undefined;
				const avgB = b.racesCount ? b.points / b.racesCount : undefined;
				if (avgA === undefined && avgB === undefined) return 0;
				if (avgA === undefined) return 1;
				if (avgB === undefined) return -1;
				return avgB - avgA;
			});
		}

		if (standingsSort === 'racesCount') {
			return [...standings].sort((a, b) => {
				if (a.racesCount === undefined && b.racesCount === undefined) return 0;
				if (a.racesCount === undefined) return 1;
				if (b.racesCount === undefined) return -1;
				return b.racesCount - a.racesCount;
			});
		}

		if (standingsSort === 'bestFinish') {
			return [...standings].sort((a, b) => {
				if (a.bestFinish === undefined && b.bestFinish === undefined) return 0;
				if (a.bestFinish === undefined) return 1;
				if (b.bestFinish === undefined) return -1;
				return a.bestFinish - b.bestFinish;
			});
		}

		return standings;
	});

	function formatDate(date: Date | undefined): string | undefined {
		if (!date) return undefined;
		return new Intl.DateTimeFormat('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}

	/**
	 * Käyttäjän raportti 10.10.2026 (esim. kausi 11, Le Mans 6h): kisa jota
	 * EI koskaan ajettu näytti "Tuleva" -tilassa vaikka kisapäivä on kauan
	 * mennyttä aikaa — API:lla ei ole erillistä "peruttu"-kenttää (vahvistettu
	 * types.ts:n RawRaceListEntry-kommentista: vain `finished`-päättely
	 * `/finishedraces/{season}`:n ids-joukon kautta), joten tila PÄÄTELLÄÄN
	 * tässä päivämäärän perusteella kun kisaa ei ole merkitty ajetuksi:
	 *   - alle `RECENT_RACE_GRACE_DAYS` päivää sitten -> "Ei tuloksia"
	 *     (tulokset ovat todennäköisesti vain vielä syöttämättä, ei syytä
	 *     väittää kisaa peruuntuneeksi)
	 *   - kauemmin sitten -> "Ei ajettu" (käyttäjän valitsema sana 10.10.2026,
	 *     "Peruttu"-sanan tilalle — ei väitä TIETÄVÄNSÄ että kisa peruutettiin,
	 *     vain ettei sitä ajettu)
	 * Ei täysin varma signaali (API saattaisi joskus lisätä tuloksia
	 * jälkikäteen vanhalle kisalle), mutta parempi arvaus kuin "Tuleva"
	 * kisalle joka on ollut kalenterissa vuosia sitten.
	 */
	const RECENT_RACE_GRACE_DAYS = 5;

	function raceStatusLabel(race: { finished: boolean; date: Date | undefined }): string {
		if (race.finished) return 'Ajettu';
		if (!race.date) return 'Tuleva';

		const daysSinceRace = (Date.now() - race.date.getTime()) / (1000 * 60 * 60 * 24);
		if (daysSinceRace <= 0) return 'Tuleva';
		if (daysSinceRace <= RECENT_RACE_GRACE_DAYS) return 'Ei tuloksia';
		return 'Ei ajettu';
	}
</script>

<svelte:head>
	<title>{data.season.name} — Kaudet — FISU</title>
	<meta name="description" content="{data.season.name} — sarjataulukko ja kisatulokset." />
</svelte:head>

<section class="page-grid section">
	<a href="/kaudet" class="link back-link">← Kaikki kaudet</a>

	<h1 class="season-name">{data.season.name}</h1>

	<CarList cars={data.cars} />

	<div class="section__header">
		<h2 class="section__title">Sarjataulukko</h2>
	</div>
	<SegmentedControl
		label="Taulukon järjestys"
		bind:value={standingsSort}
		options={[
			{ value: 'position', label: 'Sarjasijoitus' },
			{ value: 'pointsPerRace', label: 'Pisteet/kisa' },
			{ value: 'racesCount', label: 'Ajetut kisat' },
			{ value: 'bestFinish', label: 'Paras tulos' }
		]}
	/>
	<div class="fluid-grid standings-grid" data-minsize="320px" data-gap="3" data-density="compact">
		{#each sortedStandings as driver (driver.driverId)}
			<div class="standings-grid__item" animate:flip={{ duration: 350, easing: cubicOut }}>
				<DriverCard
					position={driver.position}
					displayPosition={driver.displayPosition}
					name={driver.name}
					points={driver.points}
					racesCount={driver.racesCount}
					totalRaces={data.season.totalRaces}
					featured={driver.position === 1}
				/>
			</div>
		{/each}
	</div>

	<div class="section__header races-header">
		<h2 class="section__title">Kilpailut</h2>
	</div>
	<ul class="race-list">
		{#each data.races as race (race.raceId)}
			<li class="race-list__item" class:race-list__item--upcoming={!race.finished}>
				<span class="race-list__number">#{race.raceNumber}</span>
				<span class="race-list__track">
					{#if race.finished}
						<a href="/kaudet/{data.season.id}/kilpailut/{race.raceId}" class="link">{race.trackName}</a>
					{:else}
						{race.trackName}
					{/if}
				</span>
				{#if race.cars.length > 0}
					<span class="race-list__cars">{race.cars.map((car) => car.name).join(', ')}</span>
				{/if}
				{#if formatDate(race.date)}
					<span class="race-list__date">{formatDate(race.date)}</span>
				{/if}
				<span class="race-list__status">{raceStatusLabel(race)}</span>
			</li>
		{/each}
	</ul>
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.back-link {
		display: inline-block;
		margin-bottom: var(--space-6);
	}

	.season-name {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
		margin-bottom: var(--space-8);
	}

	.section__header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-6);
	}

	.races-header {
		margin-top: var(--space-12);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
	}

	.standings-grid {
		margin-top: var(--space-4);
	}

	.standings-grid__item {
		min-width: 0;
	}

	.race-list {
		/* Käyttäjän raportoima bugi 22.9.2026: kisalaatikot näyttivät
		   sisennetyiltä — sama tunnettu ongelma kuin radan tarkennussivun
		   `.race-history__list`:ssä (ks. sen kommentti): `reset.css` nollaa
		   VAIN marginaalin (`* { margin: 0 }`), ei `<ul>`:n selaimen
		   OLETUS-paddingia (`padding-inline-start: 40px`) eikä pisteitä. */
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.race-list__item {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-2) var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.race-list__number {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		color: var(--color-text-faint);
		min-width: 2.5ch;
	}

	.race-list__track {
		font-weight: 700;
		flex: 1;
	}

	/*
	 * TÄLLE kisalle erikseen kirjatut autot (UUSI 26.9.2026,
	 * `car_assignments` käyttöön, ks. mappers.ts:n `SeasonRaceListEntry.
	 * cars`-kommentti) — eri asia kuin ylälaidan `<CarList>` (koko kauden
	 * pooli). Näytetään VAIN kun tälle kisalle on jotain kisakohtaista
	 * tietoa, ei koskaan tyhjänä/"-"-merkkinä.
	 */
	.race-list__cars {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		font-style: italic;
	}

	.race-list__date {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
	}

	.race-list__status {
		font-size: var(--font-size-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-success);
	}

	.race-list__item--upcoming .race-list__status {
		color: var(--color-text-faint);
	}

	.race-list__item--upcoming .race-list__track {
		color: var(--color-text-muted);
	}

	.link {
		font-size: inherit;
	}
</style>
