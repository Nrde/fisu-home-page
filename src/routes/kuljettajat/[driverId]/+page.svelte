<script lang="ts">
	/**
	 * Kuljettajan profiilisivu: urastatistiikka laattoina + kaudet
	 * (uusin ensin, ks. mappers.ts:n DriverCareer.seasons-kommentti)
	 * kisalistoineen. Jokainen kisarivi linkittää olemassa olevalle
	 * kisasivulle (`/kaudet/[seasonId]/kilpailut/[raceId]`, ks. Kaudet-
	 * ominaisuus) — kuljettajaprofiili ei siis ole umpikuja, vaan risteää
	 * takaisin muuhun sivustoon.
	 */
	import DriverRaceRow from '#lib/components/ui/DriverRaceRow.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived(data.career.careerStats);

	// Suomen kielioppi: 1 X (nominatiivi) mutta 0/2/3... X (partitiivi) —
	// käyttäjän palaute 22.9.2026 ("1 keskeytystä -> 1 keskeytys, 2
	// keskeytystä"). Jokainen laatta tarvitsee OMAN yksikkö/monikko-
	// parinsa (ei yhtä yleistä sääntöä, koska suomen partitiivipääte
	// vaihtelee sanoittain) — siksi tämä ottaa molemmat muodot valmiiksi
	// annettuina eikä yritä päätellä niitä.
	function statLabel(count: number, singular: string, plural: string): string {
		return count === 1 ? singular : plural;
	}
</script>

<svelte:head>
	<title>{data.career.driverName} — Kuljettajat — FISU</title>
	<meta name="description" content="{data.career.driverName} — kilpailu-ura FISU:ssa." />
</svelte:head>

<section class="page-grid section">
	<a href="/kuljettajat" class="link back-link">← Kaikki kuljettajat</a>

	{#if data.isMockData}
		<p class="mock-notice">⚠ Kehitystila: API-yhteys epäonnistui, sivu näyttää esimerkkidataa.</p>
	{/if}

	<h1 class="driver-name">{data.career.driverName}</h1>
	{#if stats.averagePosition !== undefined}
		<p class="driver-average">Keskimääräinen sijoitus {stats.averagePosition.toLocaleString('fi-FI')}</p>
	{/if}

	<div class="fluid-grid" data-minsize="220px" data-gap="3">
		<StatTile value={stats.racesEntered} label={statLabel(stats.racesEntered, 'Kilpailu', 'Kilpailua')} align="center" />
		{#if stats.bestResult !== undefined}
			<StatTile value={stats.bestResult} label="Paras sijoitus" align="center" />
		{/if}
		<StatTile value={stats.wins} label={statLabel(stats.wins, 'Voitto', 'Voittoa')} align="center" />
		<StatTile value={stats.podiums} label={statLabel(stats.podiums, 'Palkintosija', 'Palkintosijaa')} align="center" />
		<StatTile value={stats.poles} label={statLabel(stats.poles, 'Paalupaikka', 'Paalupaikkaa')} align="center" />
		<StatTile
			value={stats.fastestLaps}
			label={statLabel(stats.fastestLaps, 'Nopein kierros', 'Nopeinta kierrosta')}
			align="center"
		/>
		<StatTile value={stats.dnfs} label={statLabel(stats.dnfs, 'Keskeytys', 'Keskeytystä')} align="center" />
	</div>

	<div class="seasons">
		{#each data.career.seasons as season (season.seasonId)}
			<div class="season-block">
				<div class="season-block__header">
					<h2 class="season-block__title">{season.seasonName}</h2>
					<a href="/kaudet/{season.seasonId}" class="link">Koko kausi →</a>
				</div>
				<div class="season-block__races">
					{#each season.races as race (race.raceId)}
						<a class="race-row-link" href="/kaudet/{season.seasonId}/kilpailut/{race.raceId}">
							<DriverRaceRow
								raceName={race.raceName}
								position={race.position}
								points={race.points}
								gapDisplay={race.gapDisplay}
								positionChange={race.positionChange}
								win={race.win}
								podium={race.podium}
								pole={race.pole}
								fastestLap={race.fastestLap}
								dnf={race.dnf}
							/>
						</a>
					{/each}
				</div>
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

	.driver-name {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.driver-average {
		margin-top: var(--space-1);
		margin-bottom: var(--space-8);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.seasons {
		display: flex;
		flex-direction: column;
		gap: var(--space-12);
		margin-top: var(--space-12);
	}

	.season-block__header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-4);
	}

	.season-block__title {
		font-size: var(--font-size-lg);
		font-weight: 800;
	}

	.season-block__races {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	/* Koko kisarivi on linkki (ks. templaatin `<a>`-kääre DriverRaceRow'n
	   ympärillä) — nollataan linkin oletustyylit ettei se näytä siltä
	   että vain jokin osa rivistä olisi klikattavissa. */
	.race-row-link {
		display: block;
		color: inherit;
		text-decoration: none;
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
