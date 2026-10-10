<script lang="ts">
	/**
	 * Etusivu. TILANNE (20.9.2026): KAIKKI NELJÄ osiota saavat datansa
	 * OIKEASTI +page.server.ts:n load-funktiosta — ks. sen kommentit.
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
	 * Ryhmittelee `sortedResults`:n SESSION mukaan otsikkorivejä varten —
	 * sama periaate ja SAMA syy (Svelten `animate:flip`-rajoitus: keyed
	 * `{#each}`-lohkon on oltava sen AINOA lapsi) kuin kisasivun
	 * (`/kaudet/[seasonId]/kilpailut/[raceId]`) `resultGroups`:issa, ks.
	 * sen kommentti — MYÖS sama 10.10.2026 korjaus: ryhmittely `split`:n
	 * sijaan `sessionOrder`:n mukaan (ks. mappers.ts:n RaceResultEntry.
	 * split-kommentti SIITÄ MIKSI — `split` voi olla `null` useammalla
	 * ERI sessiolla samassa kisassa, `sessionOrder` ei koskaan).
	 */
	const resultGroups = $derived.by(() => {
		if (resultSort !== 'position') return [{ sessionOrder: -1, items: sortedResults }];

		const groups: { sessionOrder: number; items: typeof sortedResults }[] = [];
		for (const result of sortedResults) {
			const currentGroup = groups.at(-1);
			if (currentGroup && currentGroup.sessionOrder === result.sessionOrder) {
				currentGroup.items.push(result);
			} else {
				groups.push({ sessionOrder: result.sessionOrder, items: [result] });
			}
		}
		return groups;
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

<Hero seasonName={data.currentSeason.name} isOngoing={data.currentSeason.isOngoing} />

<section class="page-grid section section--stats">
	<div class="fluid-grid" data-minsize="220px" data-gap="4">
		{#each data.communityStats as stat (stat.label)}
			<StatTile
				value={stat.value}
				label={stat.label}
				context={stat.context}
				align="center"
				noGrouping={stat.noGrouping}
			/>
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
				{ value: 'position', label: 'Lopputulokset' },
				{ value: 'lapTime', label: 'Nopein kierros' },
				{ value: 'positionChange', label: 'Sijoja voitettu/hävitty' }
			]}
		/>
		<!-- Käyttäjän pyyntö 26.9.2026: voittajan rivillä näytetään `gapDisplay`-paikalla
		     auton kokonaisaika (`raceTime`) sen sijaan että paikka jäisi tyhjäksi — muille
		     kuljettajille sama paikka näyttää edelleen eron voittajaan (`result.gapDisplay`),
		     ks. mappers.ts:n `LatestRaceResult.raceTime`-kommentti. PÄIVITYS 27.9.2026
		     (splittien käyttöönotto): `raceTime` annetaan VAIN "oikealle" voittajalle
		     (ensimmäisen session P1) — KORJATTU 10.10.2026 käyttämään `sessionOrder
		     === 0`:aa `split`:n sijaan, koska `split` ei enää luotettavasti erota
		     sessioita (ks. mappers.ts:n RaceResultEntry.split-kommentti) — ks.
		     kisasivun vastaava kommentti. -->
		<!-- Käyttäjän pyyntö 26.9.2026: leveämmät kortit (320px -> 360px) + pienempi
		     ruudukon väli (data-gap 3 -> 2) — pitkä nimi ("Lucky like Fauntleroy")
		     ahtautui DNF/sijoitusmuutos-badgen kanssa kapeammilla korteilla, ks.
		     myös ListRow.svelte:n `.list-row__name`-clamp-tweaksta samasta pyynnöstä. -->
		<div class="fluid-grid result-grid" data-minsize="360px" data-gap="2" data-density="compact">
			{#each resultGroups as group (group.sessionOrder)}
				<!-- KORJATTU 10.10.2026 (each_key_duplicate-kaatuminen, ks.
				     mappers.ts:n RaceResultEntry.split-kommentti): otsikko
				     näytetään kun on USEAMPI ryhmä, EI `split !== null`
				     -tarkistuksella — `split` voi olla `null` useammalla ERI
				     sessiolla, jolloin se EI kerro luotettavasti "onko tämä
				     tavallinen yhden sessio kisa". `splitLabel` ei ole enää
				     koskaan `null`, ks. sen kommentti. -->
				{#if resultGroups.length > 1}
					<div class="split-divider">{group.items[0].splitLabel}</div>
				{/if}
				{#each group.items as result (result.driverId + '|' + result.sessionOrder)}
					<div class="result-grid__item" animate:flip={{ duration: 350, easing: cubicOut }}>
						<RaceResultRow
							position={result.position}
							displayPosition={result.displayPosition}
							name={result.name}
							gapDisplay={result.position === 1 && result.sessionOrder === 0
								? data.latestRaceResult.raceTime
								: result.gapDisplay}
							bestLapTime={result.bestLapTime}
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

	/* "Yhteisö numeroina" -otsikko poistettu (käyttäjän pyyntö 22.9.2026)
	   ja tämä on ensimmäinen osio Heron jälkeen — pienempi yläpadding
	   tuo statslaatat lähemmäs Hero-otsikkoa sen sijaan että väliin
	   jäisi sama tila kuin ennen otsikkorivin omaa marginaalia. */
	/* Käyttäjän pyyntö 22.9.2026 (toinen kierros): statslaatat hieman
	   lähemmäs seuraavaa osiota ("Viimeisimmät tulokset"/"Tuleva
	   kilpailu") — pienempi alapadding kuin muilla .section-lohkoilla
	   (space-12 -> space-6), yläpadding ennallaan (ks. yllä oleva
	   kommentti sen alkuperäisestä syystä). */
	.section--stats {
		padding-top: var(--space-4);
		padding-bottom: var(--space-6);
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

	/* Sama splitin vaihtumisen otsikkorivi kuin kisasivulla, ks. sen `.split-divider`-kommentti. */
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

	.split-divider:first-child {
		margin-top: 0;
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
</style>
