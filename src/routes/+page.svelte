<script lang="ts">
	/**
	 * Etusivu. TILANNE (20.9.2026): KAIKKI NELJÄ osiota saavat datansa
	 * OIKEASTI +page.server.ts:n load-funktiosta — ks. sen kommentit.
	 * Esimerkkidataa käytetään VAIN kehitystilassa jos jokin haku
	 * epäonnistuu (`data.isMockData`).
	 *
	 * `data.upcomingRace`/`data.latestRaceResult` voivat olla
	 * `undefined` (ei aina virhe): esim. uuden kauden alussa ei ole
	 * vielä ajettuja kisoja, tai kausi on kokonaan ajettu loppuun.
	 * Osiot piilotetaan tällöin siististi sen sijaan että näytettäisiin
	 * tyhjä/rikkinäinen kortti.
	 *
	 * TODO (käyttäjän huomio 20.9.2026): suurimman osan vuotta yhtään
	 * kautta ei ole käynnissä — silloin etusivun pääosassa pitäisi olla
	 * HISTORIA (esim. "Yhteisö numeroina" + Hall of Fame -tyyppinen
	 * sisältö) nykyisen "käynnissä oleva kausi" -painotuksen sijaan.
	 * Tätä ei ole vielä toteutettu — päätetty käsitellä kun muu data
	 * on ensin toimintakunnossa. `+page.server.ts` tietää jo NYT onko
	 * kausi oikeasti käynnissä vai näytetäänkö viimeisin päättynyt
	 * (`/seasons/fisu/current`, ks. `pickDisplaySeasonId`) — se on siis
	 * luonteva paikka jatkaa kun tähän palataan.
	 */
	import Hero from '#lib/components/home/Hero.svelte';
	import UpcomingRaceCard from '#lib/components/home/UpcomingRaceCard.svelte';
	import StatTile from '#lib/components/ui/StatTile.svelte';
	import DriverCard from '#lib/components/ui/DriverCard.svelte';
	import RaceResultRow from '#lib/components/ui/RaceResultRow.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import { parseLapTimeSeconds } from '#lib/utils/lapTime.ts';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * "Viimeisimmät tulokset" -osion järjestys — käyttäjän pyyntö
	 * 21.9.2026: nappi jolla listan voi järjestää lopputuloksen (oletus,
	 * palvelimelta valmiiksi sijoituksen mukaan järjestettynä), kuljettajan
	 * OMAN parhaan kierrosajan, tai aika-ajoista voitettujen/hävittyjen
	 * sijojen mukaan. HUOM: mikään näistä ei muuta rivien SIJOITUSNUMEROA
	 * (P1, P2, ...) — se on aina kuljettajan OIKEA kisatulos riippumatta
	 * näyttöjärjestyksestä, vain rivien KESKINÄINEN JÄRJESTYS vaihtuu.
	 * `$state` riittää (ei tarvitse palvelimelta mitään uutta — kaikki
	 * data on jo `data.latestRaceResult.results`:ssä), joten tämä on
	 * puhtaasti selainpuolen toiminnallisuus.
	 */
	let resultSort = $state<'position' | 'lapTime' | 'positionChange'>('position');

	const sortedResults = $derived.by(() => {
		const results = data.latestRaceResult?.results ?? [];

		if (resultSort === 'lapTime') {
			// Nopein kierros ensin. Sama `parseLapTimeSeconds`-funktio kuin
			// palvelimella koko kisan nopeimman kierroksen päättelyssä
			// (ks. mappers.ts) — jaettu `#lib/utils/lapTime.ts`:ssä ettei
			// vertailulogiikkaa ylläpidettäisi kahdessa paikassa. Kuljettajat
			// joilta puuttuu bestLapTime putoavat listan HÄNTÄÄN (ei alkuun),
			// jotta puuttuva data ei näytä virheellisesti "nopeimmalta".
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
			// Eniten sijoja aika-ajoista voittaneet ensin (suurin positiivinen
			// `positionChange`), eniten hävinneet viimeisenä. Kuljettajat
			// joilta puuttuu tieto (esim. aika-ajo ajamatta) putoavat HÄNTÄÄN,
			// samalla periaatteella kuin puuttuva bestLapTime yllä.
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
	 * "Sarjataulukko" -osion järjestys — käyttäjän pyyntö 21.9.2026
	 * ("voisiko ko listaa sortata mielenkiintoisilla tavoilla?"). Sama
	 * periaate kuin tulosluettelon lajittelussa yllä: mikään näistä EI
	 * muuta rivin SIJOITUSNUMEROA (se on aina kuljettajan OIKEA kauden
	 * sijoitus) — vain rivien KESKINÄINEN JÄRJESTYS vaihtuu. Kaikki
	 * vaihtoehdot käyttävät dataa joka on JO haettu (ei uusia API-
	 * kutsuja): pisteet, ajetut kisat ja paras yksittäinen tulos tulevat
	 * kaikki samasta `/results/organiser/{organiser}/summary`-hausta.
	 */
	let standingsSort = $state<'position' | 'pointsPerRace' | 'racesCount' | 'bestFinish'>('position');

	const sortedStandings = $derived.by(() => {
		const standings = data.currentSeason.standings;

		if (standingsSort === 'pointsPerRace') {
			// Pisteet/kisa-keskiarvo (sama laskukaava kuin DriverCardin oma
			// näyttöarvo, ks. sen kommentti) — nostaa esiin TEHOKKAAT
			// kuljettajat riippumatta siitä kuinka monta kisaa on ajanut,
			// eri asia kuin kokonaispisteisiin perustuva oletusjärjestys.
			// Kuljettajat joilta puuttuu racesCount (tai se on 0) putoavat
			// HÄNTÄÄN, sama periaate kuin muissakin lajitteluissa tällä
			// sivulla.
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
			// Eniten kisoja ajaneet ensin — kertoo osallistumisaktiivisuudesta,
			// eri asia kuin menestyksestä.
			return [...standings].sort((a, b) => {
				if (a.racesCount === undefined && b.racesCount === undefined) return 0;
				if (a.racesCount === undefined) return 1;
				if (b.racesCount === undefined) return -1;
				return b.racesCount - a.racesCount;
			});
		}

		if (standingsSort === 'bestFinish') {
			// Paras YKSITTÄINEN kisatulos ensin (P1 paras, pienempi luku
			// voittaa) — voi nostaa esiin kuljettajan jolla on ollut yksi
			// loistava kisa vaikka kokonaispisteet eivät vielä riittäisi
			// kärkisijoille.
			return [...standings].sort((a, b) => {
				if (a.bestFinish === undefined && b.bestFinish === undefined) return 0;
				if (a.bestFinish === undefined) return 1;
				if (b.bestFinish === undefined) return -1;
				return a.bestFinish - b.bestFinish;
			});
		}

		return standings;
	});
</script>

<svelte:head>
	<title>FISU — Finnish Simracing United</title>
	<meta
		name="description"
		content="Finnish Simracing United — sim racing -yhteisön kausien, kilpailujen ja kuljettajien tulokset ja tilastot."
	/>
</svelte:head>

<Hero seasonName={data.currentSeason.name} />

{#if data.isMockData}
	<div class="page-grid">
		<p class="mock-notice">
			⚠ Kehitystila: API-yhteys epäonnistui, koko sivu näyttää esimerkkidataa.
		</p>
	</div>
{/if}

<section class="page-grid section">
	<h2 class="section__title">Yhteisö numeroina</h2>
	<div class="fluid-grid" data-minsize="220px" data-gap="4">
		{#each data.communityStats as stat (stat.label)}
			<StatTile value={stat.value} label={stat.label} context={stat.context} />
		{/each}
	</div>
</section>

{#if data.upcomingRace}
	<section class="page-grid section">
		<h2 class="section__title">Tuleva kilpailu</h2>
		<UpcomingRaceCard
			seasonName={data.currentSeason.name}
			raceNumber={data.upcomingRace.raceNumber}
			trackName={data.upcomingRace.trackName}
			date={data.upcomingRace.date}
			href="/kaudet/{data.currentSeason.id}/kilpailut/{data.upcomingRace.raceId}"
		/>
	</section>
{/if}

{#if data.latestRaceResult}
	<section class="page-grid section">
		<div class="section__header">
			<h2 class="section__title">Viimeisimmät tulokset — {data.latestRaceResult.trackName}</h2>
			<a href="/kaudet/{data.currentSeason.id}" class="link">Koko tulosluettelo →</a>
		</div>
		<SegmentedControl
			label="Tulosten järjestys"
			bind:value={resultSort}
			options={[
				{ value: 'position', label: 'Lopputulos' },
				{ value: 'lapTime', label: 'Nopein kierros' },
				{ value: 'positionChange', label: 'Sijoja voitettu/hävitty' }
			]}
		/>
		<div class="fluid-grid result-grid" data-minsize="320px" data-gap="3" data-density="compact">
			{#each sortedResults as result (result.driverId)}
				<div class="result-grid__item" animate:flip={{ duration: 350, easing: cubicOut }}>
					<RaceResultRow
						position={result.position}
						displayPosition={result.displayPosition}
						name={result.name}
						gapDisplay={result.gapDisplay}
						bestLapTime={result.bestLapTime}
						fastestLap={result.fastestLap}
						featured={result.position === 1}
						positionChange={result.positionChange}
						dnf={result.dnf}
					/>
				</div>
			{/each}
		</div>
	</section>
{/if}

<section class="page-grid section">
	<div class="section__header">
		<h2 class="section__title">Sarjataulukko</h2>
		<a href="/kaudet/{data.currentSeason.id}" class="link">Koko taulukko →</a>
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
					totalRaces={data.currentSeason.totalRaces}
					featured={driver.position === 1}
				/>
			</div>
		{/each}
	</div>
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.section__header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		margin-bottom: var(--space-6);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
		margin-bottom: var(--space-6);
	}

	.section__header .section__title {
		margin-bottom: 0;
	}

	.result-grid {
		margin-top: var(--space-4);
	}

	/*
	 * `animate:flip` (ks. templaatin #each) tarvitsee kohteekseen SUORAN
	 * DOM-elementin — Svelte-komponenttiin (RaceResultRow) sitä ei voi
	 * laittaa suoraan, siksi tämä ohut kääre-div. `display: contents`
	 * EI käy täällä (FLIP tarvitsee elementin omat mitat liikuttaakseen
	 * sitä), joten kääre jää oikeaksi grid-soluksi — ei omaa marginaalia/
	 * paddingia, joten se on visuaalisesti huomaamaton.
	 */
	.result-grid__item {
		min-width: 0;
	}

	.standings-grid {
		margin-top: var(--space-4);
	}

	/* Sama kääre-periaate kuin .result-grid__item:ssä yllä (ks. sen
	   kommentti) — DriverCard on myös Svelte-komponentti, ei elementti,
	   joten `animate:flip` tarvitsee tämän ohuen div-kääreen. */
	.standings-grid__item {
		min-width: 0;
	}

	/* .link-luokan alleviivaus/hover-tyyli tulee global.css:stä */
	.link {
		font-size: var(--font-size-sm);
	}

	/* Näkyy vain kun +page.server.ts joutui turvautumaan esimerkki-
	   dataan (aina kehitystilassa TÄSSÄ hiekkalaatikossa, koska
	   api2.simu.fi ei ole tavoitettavissa täältä) — ei koskaan
	   tuotannossa, ks. +page.server.ts:n kommentit. */
	.mock-notice {
		margin-top: var(--space-4);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: color-mix(in oklch, var(--color-warning) 15%, var(--color-bg));
		border: 1px solid color-mix(in oklch, var(--color-warning) 40%, transparent);
		color: var(--color-warning);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}
</style>
