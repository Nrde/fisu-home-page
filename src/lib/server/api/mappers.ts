/**
 * Muuntaa raa'an API-vastauksen (types.ts) siihen muotoon jota
 * komponentit jo odottavat propseinaan (ks. DriverCard.svelte).
 * Tämä on AINOA paikka jossa raakakenttänimet (`pos`, `pts`, ...) ja
 * komponenttien propsit (`position`, `points`, ...) kohtaavat — jos
 * backend joskus vaihtaa kenttänimiä tai koko endpointin muodon, vain
 * tätä tiedostoa (ja types.ts:ää) pitää korjata. +page.server.ts ja
 * komponentit eivät tiedä mitään raakamuodosta.
 */
import { TRACK_IMAGE_BASE_URL } from '$app/env/private';
import { parseHelsinkiDateTime } from '#lib/utils/helsinkiTime.ts';
import type {
	RawCar,
	RawCarListResponse,
	RawCurrentSeasonResponse,
	RawDriverCareerRace,
	RawDriverCareerResponse,
	RawDriverCareerStats,
	RawHallOfFameEntry,
	RawHallOfFameResponse,
	RawLeaderboardEntry,
	RawOrganiserSummaryResponse,
	RawRaceCarsResponse,
	RawRaceChartResponse,
	RawRaceListEntry,
	RawRaceListResponse,
	RawRaceResultDriver,
	RawRaceResultResponse,
	RawReviewListResponse,
	RawReviewLoginResponse,
	RawReviewTargetResponse,
	RawSeasonRacesResponse,
	RawSeasonSummary,
	RawStatsCompleteResponse,
	RawStatsResponse,
	RawSubmitReviewResponse,
	RawSubRace,
	RawTrack,
	RawTrackCarReviewsResponse,
	RawTrackListResponse
} from './types.ts';

/**
 * Kilpailullinen sijoitus voi toistua (tasapeli pisteissä/tuloksessa) —
 * `displayPosition` on se mitä UI näyttää RIVIN VASEMMASSA LAIDASSA:
 * "=" jos tämä rivi jakaa sijoituksen EDELLISEN rivin kanssa (kun lista
 * on jo järjestetty sijoituksen mukaan), muuten `position` merkkijonona.
 * Näin kaksi P1-riviä ei näytä kummallekin "P1":tä erikseen, vaan
 * jälkimmäinen näyttää "="-merkin — käyttäjän pyytämä esitystapa
 * 20.9.2026. `computeDisplayPositions` (alla) laskee tämän.
 */
interface WithDisplayPosition {
	displayPosition: string;
}

/**
 * Laskee `displayPosition`-kentän JÄRJESTETYLLE listalle (kutsujan
 * vastuulla lajitella `position`:in mukaan ENNEN tätä). Yleiskäyttöinen
 * — sekä sarjataulukko että yksittäisen kisan tulokset voivat jakaa
 * sijoituksia, joten molemmat käyttävät tätä samaa funktiota.
 *
 * PÄIVITYS (27.9.2026, `split`-kenttä käyttöön): `split` on VALINNAINEN
 * geneerisessä rajoitteessa, koska sarjataulukolla (`SeasonStanding`) ei
 * ole sitä lainkaan — kahden rivin katsotaan jakavan sijoituksen (`"="`)
 * VAIN jos NIIN `position` ETTÄ `split` (`?? null` normalisoituna) täsmäävät.
 * Ilman tätä splitin 1 P1 ja splitin 3 P1 näyttäisivät virheellisesti
 * tasapeliltä, vaikka ne ovat eri kisoja eri pisteasteikoilla (ks.
 * types.ts:n `RawRaceResultDriver.split`-kommentti).
 */
function computeDisplayPositions<T extends { position: number; split?: number | null }>(
	items: T[]
): (T & WithDisplayPosition)[] {
	return items.map((item, index) => {
		const prev = items[index - 1];
		const isTie = index > 0 && prev.position === item.position && (prev.split ?? null) === (item.split ?? null);
		return {
			...item,
			displayPosition: isTie ? '=' : String(item.position)
		};
	});
}

/**
 * Lajittelee ENSISIJAISESTI `split`:n mukaan (pienin ensin, `null` VIIMEISENÄ
 * — käytännössä tämä ei koskaan törmää `null`:iin muiden kanssa samassa
 * listassa, koska joko KAIKKI kuljettajat ovat `split: null` tai KUKAAN ei
 * ole, ks. types.ts:n kommentti), TOISSIJAISESTI `position`:in mukaan.
 * Normaalilla kisalla (kaikki `split: null`) tämä käyttäytyy TÄSMÄLLEEN
 * samoin kuin pelkkä `position`-lajittelu ennen tätä muutosta — käyttäjän
 * pyyntö 27.9.2026: "split 1 drivers should always be before split 2
 * drivers etc.".
 */
function compareBySplitThenPosition(a: { split: number | null; position: number }, b: { split: number | null; position: number }): number {
	const splitA = a.split ?? Number.POSITIVE_INFINITY;
	const splitB = b.split ?? Number.POSITIVE_INFINITY;
	if (splitA !== splitB) return splitA - splitB;
	return a.position - b.position;
}

export interface SeasonStanding extends WithDisplayPosition {
	/**
	 * Kuljettajan uniikki tunniste — KÄYTÄ TÄTÄ `{#each}`-avaimena, EI
	 * `position`:ia. HUOM (bugi löydetty tuotannosta 20.9.2026): kaksi
	 * kuljettajaa voi jakaa saman `position`-arvon (tasapeli/puuttuva
	 * tieto lähdedatassa) — `driver.position`-avaimella keyätty `{#each}`
	 * kaatuu tällöin Svelten "each_key_duplicate"-virheeseen.
	 */
	driverId: number;
	position: number;
	name: string;
	points: number;
	/**
	 * Kauden SISÄINEN paras yksittäisen kisan sijoitus (ei koko uran
	 * paras koskaan) — `undefined` jos kuljettajalla ei ole vielä
	 * yhtään valmista kisatulosta tällä kaudella (API palauttaa tällöin
	 * `null`, muunnetaan tässä `undefined`:ksi komponenttien props-
	 * rajapinnan mukaiseksi). VAHVISTETTU oikeaa APIa vasten 20.9.2026.
	 * HUOM (20.9.2026): "Voittaja"-badge tämän kentän pohjalta poistettiin
	 * käyttäjän pyynnöstä sarjataulukosta turhana — kenttä säilyy silti
	 * datassa mahdollista myöhempää käyttöä varten (esim. kuljettaja-
	 * profiilisivu).
	 */
	bestFinish?: number;
	/**
	 * Kuinka monta kauden kilpailua kuljettaja on ajanut — käyttäjän
	 * pyyntö 21.9.2026: näytetään DriverCardissa pisteiden alla/vieressä.
	 * `undefined` jos API ei antanut `races`:ia (ks. types.ts).
	 */
	racesCount?: number;
}

export interface CurrentSeason {
	id: number;
	name: string;
	standings: SeasonStanding[];
	/**
	 * Kauden TÄHÄN MENNESSÄ ajettujen kisojen kokonaismäärä — käyttäjän
	 * pyyntö 21.9.2026 ("6/8 kilpailua" -muotoinen osallistumistieto
	 * DriverCardissa, ks. sen kommentti). EI tule `mapCurrentSeason`:sta
	 * (se ei tiedä tätä — `/results/organiser/{organiser}/summary` ei
	 * kerro kauden kisamäärää), vaan lasketaan +page.server.ts:ssä
	 * `finishedRaceIds`-listan pituudesta (haetaan joka tapauksessa jo
	 * muuta tarkoitusta varten, ei siis uutta API-kutsua). `undefined`
	 * kehitystilan mock-datassa ELLEI sitä erikseen aseteta.
	 */
	totalRaces?: number;
	/**
	 * Onko `id`:llä kuvattu kausi OIKEASTI käynnissä juuri nyt, vai onko
	 * kyseessä `pickDisplaySeasonId`:n fallback (viimeisin PÄÄTTYNYT
	 * kausi, koska mitään ei ole käynnissä juuri nyt — ks. sen kommentti,
	 * tämä on normaali tila suurimman osan vuotta). EI tule
	 * `mapCurrentSeason`:sta (se ei tiedä tätä, `/results/organiser/
	 * {organiser}/summary` ei kerro onko kausi käynnissä) — lasketaan
	 * +page.server.ts:ssä `currentSeasonInfo.data !== null`:sta, joka on
	 * jo haettu joka tapauksessa `pickDisplaySeasonId`:ä varten. Käyttäjän
	 * pyyntö 22.9.2026: Hero.svelte käyttää tätä päättääkseen näytetäänkö
	 * "Käynnissä nyt" -badge/kausinimi/kausi-CTA:t vai ei — kun mitään ei
	 * ole käynnissä, ne eivät näytä oikealta viimeisimmän PÄÄTTYNEEN
	 * kauden päällä. `undefined` kehitystilan mock-datassa ELLEI sitä
	 * erikseen aseteta (käsitellään falsy:na, ei "käynnissä").
	 */
	isOngoing?: boolean;
}

/**
 * Päättää mitä kautta etusivu näyttää "pääosassa". VAHVISTETTU
 * 20.9.2026 — ei enää arvausta kausilistan järjestyksestä.
 *
 * Jos `/seasons/{organiser}/current` löysi juuri nyt käynnissä olevan
 * kauden, käytetään sitä. Jos EI (`data: null`, mikä on normaalia —
 * suurin osa vuodesta ei ole kautta käynnissä), näytetään väliaikaisesti
 * viimeisin PÄÄTTYNYT kausi, kunnes etusivu osaa oikeasti painottaa
 * historiaa off-season-tilanteessa (ks. +page.svelte:n TODO). Tätä
 * varten valitaan `organiserSummary`-taulukosta SUURIMMAN seasonId:n
 * kausi — perusteltu heuristiikka koska API-tsätin `/seasons/fisu`-
 * esimerkissä kausien id:t nousevat aikajärjestyksessä (168 uusin,
 * 44 vanhin) — mutta HUOM tätäkään ei ole eksplisiittisesti taattu
 * koodin puolesta, samalla varauksella kuin `/finishedraces`:n
 * järjestys (ks. client.ts).
 */
export function pickDisplaySeasonId(
	summary: RawOrganiserSummaryResponse,
	current: RawCurrentSeasonResponse
): number | undefined {
	// HUOM (bugi löydetty 20.9.2026 tuotannosta): `/seasons/{organiser}/
	// current` palauttaa `data.id`:n MERKKIJONONA ("168"), vaikka
	// `organiserSummary`:n `seasonId` on NUMERO (168) — `Number(...)`
	// tässä on pakollinen, muuten `mapCurrentSeason`:n `===`-vertailu
	// epäonnistuu AINA hiljaisesti eikä löydä koskaan yhtään kautta.
	if (current.data) return Number(current.data.id);

	return summary.reduce<number | undefined>(
		(latest, season) => (latest === undefined || season.seasonId > latest ? season.seasonId : latest),
		undefined
	);
}

/**
 * Palauttaa arvon VAIN jos se on oikeasti äärellinen numero, muuten
 * `undefined`. KÄYTTÖTARKOITUS (löydetty käyttäjän raportoimasta bugista
 * 22.9.2026, "Paras tulos PNaN" kuljettajat-sivulla): `RawDriverStanding.
 * bestFinish` on TYYPITETTY `number | null`, mutta API ei aina noudata
 * omaa tyyppiään käytännössä — jollain kaudella arvo voi tulla ei-
 * numeerisena (esim. merkkijonona). Jos tällainen arvo päätyisi
 * `Math.min`:iin (ks. `mapDriverList`), TULOS on `NaN` joka sen jälkeen
 * SAASTUTTAA kyseisen kuljettajan `careerBestFinish`:n pysyvästi kaikilla
 * myöhemmillä kausilla (Math.min(NaN, mikä tahansa) === NaN aina) — siksi
 * arvo validoidaan TÄSSÄ, ennen kuin sitä käytetään mihinkään laskentaan,
 * sen sijaan että vain toivottaisiin `number | null` -tyypin pitävän
 * paikkansa. `unknown`-parametri on tarkoituksellinen: declared raw-
 * tyyppi ei suojaa tätä runtime-tarkistusta miltään.
 */
function toFiniteNumberOrUndefined(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Tunnistaa "tyhjän" tai paikanpitäjä-nimen (esim. pelkkä "-") — löydetty
 * käyttäjän raportoimasta bugista 22.9.2026 (kuljettaja 1197 näkyi
 * kuljettajat-listalla nimellä "-"). KÄYTTÖ: `mapDriverList` käyttää
 * tätä valitakseen kuljettajalle PARHAAN saatavilla olevan nimen kaikkien
 * kausien yli sen sijaan että lukittautuisi ENSIMMÄISEEN nähtyyn kauteen
 * — jos ensimmäinen kausi jolla kuljettaja esiintyy antaa vain
 * paikanpitäjän, myöhempi kausi jolla on oikea nimi korvaa sen.
 */
function isPlaceholderName(name: string): boolean {
	const trimmed = name.trim();
	return trimmed === '' || trimmed === '-' || trimmed === '–' || trimmed === '—';
}

export function mapCurrentSeason(
	summary: RawOrganiserSummaryResponse,
	seasonId: number | undefined
): CurrentSeason | undefined {
	const season: RawSeasonSummary | undefined = summary.find((s) => s.seasonId === seasonId);
	if (!season) return undefined;

	const sortedStandings = season.drivers
		.map((driver) => ({
			driverId: Number(driver.id),
			position: driver.pos,
			name: driver.name,
			points: driver.pts,
			bestFinish: toFiniteNumberOrUndefined(driver.bestFinish),
			racesCount: driver.races
		}))
		.sort((a, b) => a.position - b.position);

	return {
		id: season.seasonId,
		name: season.seasonName,
		standings: computeDisplayPositions(sortedStandings)
	};
}

export interface CommunityStat {
	value: number;
	label: string;
	context?: string;
}

/**
 * Muuntaa /stats/organiser/{organiser}:n "Yhteisö numeroina" -osion
 * laatoiksi. HUOM: `firstSeasonYear`, `totalLaps` ja `simulators` ovat
 * TÄLLÄ HETKELLÄ aina null/[] backendillä (ei datalähdettä), joten
 * niistä riippuvat laatat jätetään kokonaan pois listasta sen sijaan
 * että näytettäisiin 0 tai tyhjä — 0 olisi harhaanjohtava (ei tarkoita
 * "nolla kierrosta", vaan "emme tiedä"). Kun backend joskus täyttää
 * nämä kentät, laatat ilmestyvät automaattisesti tänne ilman UI-
 * muutoksia.
 */
export function mapCommunityStats(stats: RawStatsResponse): CommunityStat[] {
	const tiles: CommunityStat[] = [
		{ value: stats.totalRaces, label: 'Ajettua kilpailua' },
		{ value: stats.totalSeasonsCount, label: 'Kautta' },
		{ value: stats.totalActiveDrivers, label: 'Kuljettajaa' }
	];

	if (stats.firstSeasonYear !== null) {
		tiles.push({ value: stats.firstSeasonYear, label: 'Ensimmäinen kausi' });
	}
	if (stats.totalLaps !== null) {
		tiles.push({ value: stats.totalLaps, label: 'Ajettua kierrosta' });
	}
	if (stats.simulators.length > 0) {
		tiles.push({
			value: stats.simulators.length,
			label: 'Simulaattoria käytössä',
			context: stats.simulators.join(', ')
		});
	}

	return tiles;
}

export interface UpcomingRace {
	raceId: number;
	trackName: string;
	date: Date;
	/**
	 * ARVAUS, ei vahvistettu: kauden kierrosnumero, laskettu `/races/
	 * {season}`-taulukon JÄRJESTYKSESTÄ (indeksi + 1) — oletetaan että
	 * tämä vastaa kauden kierrosjärjestystä. Ei ole eksplisiittistä
	 * `raceNumber`-kenttää API:ssa. Merkitty kysymykseksi backendille.
	 */
	raceNumber: number;
}

/**
 * Poimii seuraavan AJAMATTOMAN kisan kauden kisalistasta. "Ajamaton" =
 * id ei ole `finishedraceIds`-joukossa. "Seuraava" = ajamattomista se
 * jonka päivämäärä+kellonaika on lähimpänä tulevaisuudessa.
 *
 * HUOM (ks. types.ts): `/finishedraces/{season}`:n sisältö kertoo vain
 * MITKÄ kisat on ajettu, ei niiden järjestystä — tässä ei nojata siihen
 * järjestykseen, vain jäsenyyteen (`Set.has`), joten se on turvallista.
 */
export function mapUpcomingRace(
	races: RawRaceListResponse,
	finishedRaceIds: Set<number>
): UpcomingRace | undefined {
	const upcoming = races
		.map((race, index) => ({ race, raceNumber: index + 1, date: parseHelsinkiDateTime(race.date, race.time) }))
		.filter(
			(entry): entry is { race: (typeof races)[number]; raceNumber: number; date: Date } =>
				entry.date !== undefined && !finishedRaceIds.has(entry.race.id)
		)
		.sort((a, b) => a.date.getTime() - b.date.getTime());

	const next = upcoming[0];
	if (!next) return undefined;

	return {
		raceId: next.race.id,
		trackName: next.race.track,
		date: next.date,
		raceNumber: next.raceNumber
	};
}

export interface RaceResultEntry extends WithDisplayPosition {
	/** Kuljettajan uniikki tunniste — käytä TÄTÄ `{#each}`-avaimena, ei `position`:ia (sama syy kuin `SeasonStanding.driverId`:ssä). */
	driverId: number;
	position: number;
	name: string;
	/**
	 * Muotoiltu näyttöä varten käyttäjän spekin mukaan (20.9.2026):
	 * sekunteina saatu ero muutetaan "+M:SS.sss"/"+SS.sss"-muotoon (tai
	 * "+H:MM:SS.sss" jos yli tunti, käytännössä ei koskaan sim-racingissa),
	 * kierroksia jääneille "+1 kierros"/"+N kierrosta". `undefined`
	 * voittajalle (position 1) — API EI anna voittajan kokonaisaikaa,
	 * vain muiden eron SIIHEN, joten rivi jää tältä osin tyhjäksi
	 * voittajalle (ei bugi, tiedossa oleva datan rajoitus).
	 */
	gapDisplay?: string;
	/**
	 * Kuljettajan OMA paras kierrosaika TÄSSÄ kisassa (esim. "1:27.480"),
	 * näytetään JOKAISELLE kuljettajalle — eri asia kuin `fastestLap`,
	 * joka kertoo kuka ajoi koko kisan nopeimman kierroksen. Pass-through
	 * raakamuodosta, `undefined` jos API ei sitä tälle riville antanut.
	 */
	bestLapTime?: string;
	/**
	 * Ajoi KOKO KISAN nopeimman kierroksen. PÄIVITYS (22.9.2026): API
	 * antaa nyt tämän VALMIINA jokaiselle kuljettajalle — aiempi
	 * (21.9.2026) päättely vertaamalla kaikkien `bestLapTime`-arvoja
	 * keskenään on POISTETTU tarpeettomana, ks. `normalizeDriverRow`.
	 */
	fastestLap: boolean;
	/**
	 * Kuinka monta sijaa kuljettaja voitti (positiivinen) tai hävisi
	 * (negatiivinen) aika-ajoista maaliin verrattuna — käyttäjän pyyntö
	 * 21.9.2026, uusi lajitteluperuste "Sijoja voitettu/hävitty".
	 * `undefined` jos API ei antanut `startingPosition`:ia tälle riville
	 * (esim. aika-ajo ajamatta/puuttuu) — TÄLLÖIN EI arvata, koska ei ole
	 * mitään dataa mistä laskea.
	 */
	positionChange?: number;
	/**
	 * True = kuljettaja EI ajanut kilpailua maaliin (DNF). Käyttäjän
	 * vahvistama tulkinta 21.9.2026: API:n `points` (TÄMÄN kisan
	 * pisteet, EI kauden kokonaispisteitä — eri kenttä kuin
	 * `SeasonStanding.points`) on 0 nimenomaan DNF-kuljettajalle.
	 * HUOM: `gapDisplay`/`bestLapTime` näytetään DNF-riville SILTIKIN
	 * normaalisti (käyttäjän pyyntö) — ne kertovat millä kierroksella
	 * kuljettaja keskeytti ja ovat oikean listajärjestyksen perusta,
	 * DNF ei siis piilota niitä, vain LISÄÄ visuaalisen merkinnän.
	 */
	dnf: boolean;
	/**
	 * UUSI 26.9.2026 (`car_assignments` käyttöön): tämän kuljettajan
	 * ratkaistu auto TÄSSÄ kisassa, ks. `RaceCarResolution`/`resolveDriverCar`
	 * -kommentit. `undefined` on LAILLINEN, odotettu tila (ei mikään
	 * ratkaisutaso osunut) — näytetään "auto ei tiedossa", ei virhettä.
	 * Ei tule `mapLatestRaceResult`:sta suoraan (se ei tiedä autoista
	 * mitään) — `attachRaceCars` liittää tämän erikseen +page.server.ts:n
	 * pyynnöstä, koska autoresoluutio on täysin valinnainen lisähaku.
	 */
	car?: Car;
	/**
	 * LISÄTTY 27.9.2026, käyttäjän pyynnöstä ("split info... should be
	 * used when deciding the order for the drivers"). `null` normaalilla
	 * kisalla. Kun ei-`null`: `position`/`points`/`gapDisplay` ovat JO
	 * TÄMÄN splitin sisäisiä — ÄLÄ vertaile niitä eri splitin kuljettajien
	 * kanssa yhtenä listana (ks. types.ts:n `RawRaceResultDriver.split`-
	 * kommentti). `results`-taulukko on JÄRJESTETTY `split`:n mukaan ensin
	 * (ks. `compareBySplitThenPosition`), joten UI voi näyttää "splitti
	 * vaihtuu"-rajan aina kun tämä kenttä muuttuu edelliseen riviin
	 * verrattuna PERÄKKÄISESSÄ listassa — ei tarvitse erikseen kysyä montako
	 * splittiä kisassa on, se selviää `results`:n eri `split`-arvoista.
	 */
	split: number | null;
	/**
	 * UUSI 6.10.2026 (`subRaces`-tuki, ks. types.ts:n `RawSubRace`-kommentti):
	 * tämän rivin OMAN `subRace`:n ihmisluettava otsikko — API:n `label` jos
	 * annettu (esim. "Lähtö 1"), MUUTEN "Split {split}" -fallback. `null`
	 * VAIN kun `split` on `null` (tavallinen kisa, ei otsikkoa näytettäväksi
	 * lainkaan). Käytetään splittijaon väliotsikkona UI:ssa `split`-kentän
	 * numeron sijaan, koska API-tiimin oma ohje suosii ihmisluettavaa nimeä.
	 */
	splitLabel: string | null;
}

export interface LatestRaceResult {
	raceId: number;
	trackName: string;
	/**
	 * Viittaa `/tracks`-endpointin `trackid`:hen (ks. Track.id) — lisätty
	 * 22.9.2026 backendiin, sama arvoavaruus kaikkialla sivustolla.
	 * `undefined` jos rataa ei tunnistettu (API antaa tällöin `null`) —
	 * käytetään mm. kisasivun "Rataprofiili"-linkkiin `/radat/{trackId}`.
	 */
	trackId?: string;
	/**
	 * Kauden nimi jolle tämä kisa kuuluu — API:n `/results/race/{id}`
	 * antaa tämän valmiiksi (`response.data.seasonname`), joten ei
	 * tarvitse erillistä hakua. Käytetään kisasivun otsikossa/
	 * breadcrumbissa (`/kaudet/[seasonId]/kilpailut/[raceId]`, lisätty
	 * 21.9.2026). Etusivu ei tätä (vielä) käytä, mutta kenttä on aina
	 * mukana koska API antaa sen joka tapauksessa.
	 */
	seasonName: string;
	results: RaceResultEntry[];
	/**
	 * Voittajan kokonaisaika tässä kisassa, VALMIIKSI muotoiltuna — UUSI
	 * 26.9.2026, käyttäjän pyynnöstä ("winners total time... where all
	 * the others have the difference to the winner"). Pass-through
	 * `response.data.raceTime`:sta, EI muotoilla uudelleen (ks. types.ts:n
	 * kommentti — API antaa jo "M:SS.sss"/"H:MM:SS.sss"-muodon). `undefined`
	 * jos API ei (vielä) antanut tätä kenttää tälle kisalle — sivun pitää
	 * silloin näyttää tyhjä kohta voittajan rivillä kuten ennenkin, EI
	 * arvata tai näyttää virhettä.
	 */
	raceTime?: string;
}

/**
 * Muuntaa API:n aikaeromerkkijonon näyttömuotoon käyttäjän spekin
 * mukaan (20.9.2026): puhdas sekuntiluku -> kellomuoto ("+SS.sss" /
 * "+M:SS.sss" / "+H:MM:SS.sss"), "N lap"/"N laps" -> "+1 kierros" /
 * "+N kierrosta". `undefined` jos arvo puuttuu tai on 0 (kärki).
 */
export function formatGapDisplay(raw: string | undefined): string | undefined {
	if (!raw) return undefined;

	const lapMatch = raw.match(/^(\d+)\s*laps?$/i);
	if (lapMatch) {
		const laps = Number(lapMatch[1]);
		return laps === 1 ? '+1 kierros' : `+${laps} kierrosta`;
	}

	const seconds = Number(raw);
	if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

	return `+${formatSecondsAsClock(seconds)}`;
}

/** "SS.sss" alle minuutin, "M:SS.sss" alle tunnin, "H:MM:SS.sss" muuten. */
function formatSecondsAsClock(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds - hours * 3600 - minutes * 60;
	const secondsStr = seconds.toFixed(3).padStart(6, '0'); // "SS.sss", esim. "06.857"

	if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secondsStr}`;
	if (minutes > 0) return `${minutes}:${secondsStr}`;
	return seconds.toFixed(3);
}

/**
 * Lukee yksittäisen kuljettajarivin — VAIN uudet englanninkieliset
 * avaimet, ks. types.ts:n RawRaceResultDriver-kommentti (21.9.2026:
 * backend on julkaissut ne, vanhoja suomenkielisiä avaimia ei enää lueta).
 *
 * `driverKey` on `drivers`-olion oma avain (esim. "580") — käytetään
 * `driverId`:nä ENSISIJAISESTI, koska se on taatusti uniikki (se ON
 * oliolla avain) — `raw.driverId` varalla jos avain jostain syystä puuttuisi.
 *
 * `split`/`splitLabel` tulevat NYT (6.10.2026) OMISTAVALTA `RawSubRace`:lta
 * kutsujan (`mapLatestRaceResult`) kautta, EI `raw.split`:stä — subRace on
 * nyt tämän tiedon AUKTORITATIIVINEN lähde (ks. types.ts:n `RawSubRace`-
 * kommentti), vaikka `raw.split` todennäköisesti täsmää siihen muutenkin.
 */
function normalizeDriverRow(
	driverKey: string,
	raw: RawRaceResultDriver,
	split: number | null,
	splitLabel: string | null
): Omit<RaceResultEntry, 'displayPosition'> | undefined {
	const position = Number(raw.position);
	const name = raw.name;
	if (!Number.isFinite(position) || !name) return undefined;

	const driverId = Number(driverKey ?? raw.driverId);

	return {
		driverId,
		position,
		name,
		// Voittajalle (position 1) ei näytetä eroa, ks. RaceResultEntry.gapDisplay-kommentti.
		gapDisplay: position === 1 ? undefined : formatGapDisplay(raw.gap),
		bestLapTime: raw.bestLapTime,
		// API:n valmis totuusarvo 22.9.2026 alkaen, ks. RaceResultEntry.fastestLap-kommentti.
		fastestLap: raw.fastestLap ?? false,
		positionChange: normalizePositionChange(raw),
		dnf: normalizeDnf(raw),
		split,
		splitLabel
	};
}

/**
 * KORJATTU 21.9.2026 käyttäjän antaman vastaesimerkin perusteella:
 * startingPosition 6, positionChange (API:n OMA kenttä) "3", position 9 —
 * tämä on TODELLISUUDESSA kolmen sijan MENETYS (6. -> 9.), mutta jos
 * `raw.positionChange`:n arvoon olisi luotettu sellaisenaan (aiempi,
 * VIRHEELLINEN oletus: positiivinen = aina voitto), tulos olisi näyttänyt
 * väärin "voitti 3 sijaa". API:n oma `positionChange`-kenttä EI siis ole
 * luotettavasti etumerkitty samaan suuntaan kuin `startingPosition`/
 * `position` antaisivat olettaa — siksi sitä EI enää käytetä ollenkaan,
 * vaan arvo LASKETAAN AINA itse suoraan `startingPosition - position`:sta,
 * joka on yksiselitteinen: pienempi loppusijoitus kuin lähtöruutu ->
 * positiivinen (nousi), suurempi -> negatiivinen (laski). `undefined` jos
 * `startingPosition` puuttuu (esim. aika-ajo ajamatta) — ei arvata.
 *
 * BUGIKORJAUS (30.9.2026, käyttäjän raportoima: "/kaudet/125/kilpailut/603
 * shows all drivers having lost places"): syy oli `Number("")` ja
 * `Number(null)` — molemmat ovat JavaScriptissä `0`, EIVÄT `NaN`, joten
 * `Number.isFinite(...)`-tarkistus PÄÄSTI läpi kun `startingPosition`
 * puuttui. Tämän kisan aika-ajoa ei ollut tallennettu simracing.fi:hin
 * lainkaan (käyttäjän oma diagnoosi, vahvistettu suoraan API:sta:
 * `startingPosition: ""` JOKAISELLA kuljettajalla) — `Number("")` -> `0`,
 * jolloin JOKAISEN kuljettajan "muutos" laskettiin `0 - position`:na eli
 * AINA negatiivisena riippumatta todellisesta tuloksesta. Tarkistetaan nyt
 * EKSPLISIITTISESTI `""`/`null`/`undefined` ENNEN `Number(...)`-muunnosta
 * sen sijaan että luotettaisiin `Number.isFinite`:n riittävän — sama
 * kahden nollaa-tuottavan arvon (tyhjä merkkijono, `null`) kompastuskivi
 * voisi toistua muuallakin tässä tiedostossa, jos joskus lisätään uusia
 * `Number(raw.jokinKenttä)`-muunnoksia kenttiin jotka voivat olla tyhjiä.
 */
function normalizePositionChange(raw: RawRaceResultDriver): number | undefined {
	if (raw.startingPosition === '' || raw.startingPosition === null || raw.startingPosition === undefined) {
		return undefined;
	}

	const startingPosition = Number(raw.startingPosition);
	const position = Number(raw.position);
	if (Number.isFinite(startingPosition) && Number.isFinite(position)) {
		return startingPosition - position;
	}

	return undefined;
}

/**
 * Käyttäjän vahvistama tulkinta 21.9.2026: `raw.points` on TÄMÄN kisan
 * pisteet (EI kauden kokonaispisteitä, ks. RaceResultEntry.dnf-kommentti),
 * ja arvo 0 tarkoittaa kuljettajan keskeyttäneen (DNF). `undefined`/
 * puuttuva `points` EI ole DNF — silloin ei yksinkertaisesti tiedetä,
 * joten `dnf` jää `false`:ksi (ei arvata puuttuvasta datasta).
 */
function normalizeDnf(raw: RawRaceResultDriver): boolean {
	if (raw.points === undefined || raw.points === null) return false;
	const points = Number(raw.points);
	return Number.isFinite(points) && points === 0;
}

/**
 * Poimii viimeisimmän AJETUN kisan id:n `/finishedraces/{season}`-
 * listan VIIMEISESTÄ alkiosta. Sama järjestys-varaus kuin `mapUpcoming
 * Race`:ssa (ks. types.ts:n `RawFinishedRaceIdsResponse`-kommentti) —
 * "käytännössä kronologinen" muttei koodin takaama.
 */
export function pickLatestFinishedRaceId(finishedRaceIds: number[]): number | undefined {
	return finishedRaceIds.at(-1);
}

/**
 * BUGIKORJAUS (6.10.2026, API-tiimin raportti): litistää `response.data.
 * subRaces`:n YHDEKSI listaksi `response.data.drivers`:n sijaan — ks.
 * types.ts:n `RawRaceResultResponse`-kommentti SIITÄ MIKSI `drivers` ei
 * koskaan voinut edustaa useamman lähdön/splitin kisaa oikein (avainpari-
 * olio per kuljettaja-id, max yksi tulos per kuljettaja). SAMA kuljettaja
 * voi nyt esiintyä tässä litistetyssä listassa USEAMPAAN KERTAAN (kerran
 * per `subRace` jossa hän ajoi) — kutsujien (sivujen `{#each}`-avaimet)
 * on siis käytettävä `driverId`+`split`-YHDISTELMÄÄ avaimena, EI pelkkää
 * `driverId`:tä, joka ei enää ole taattu uniikki tässä listassa.
 *
 * VARMISTUS (6.10.2026, havaittu käytännössä HETI käyttöönoton jälkeen —
 * kisa 882:n `/results/race/882`-vastauksessa EI OLLUT `subRaces`-kenttää
 * lainkaan, vaikka API-tiimin ohje sanoi sen olevan "aina mukana"):
 * `subRaces` EI siis vielä ole käytössä kaikilla kisoilla/kaikissa API:n
 * osissa tätä kirjoitettaessa. Pudotaan puuttuessa takaisin vanhaan
 * `drivers`-kenttään YHTENÄ `split: null`-ryhmänä (täsmälleen entinen
 * käytös) sen sijaan että koko sivu kaatuisi `TypeError`:iin — poistetaan
 * tämä varmistus myöhemmin kun API-tiimi vahvistaa `subRaces`:n olevan
 * aidosti joka vastauksessa.
 */
export function mapLatestRaceResult(raceId: number, response: RawRaceResultResponse): LatestRaceResult {
	const subRaces: RawSubRace[] =
		response.data.subRaces ?? [{ split: null, label: null, drivers: response.data.drivers }];

	const results = subRaces
		.flatMap((subRace) => {
			const split = subRace.split ?? null;
			const label = subRace.label?.trim() ? subRace.label.trim() : split !== null ? `Split ${split}` : null;
			return Object.entries(subRace.drivers).map(([driverKey, raw]) => normalizeDriverRow(driverKey, raw, split, label));
		})
		.filter((entry): entry is Omit<RaceResultEntry, 'displayPosition'> => entry !== undefined)
		.sort(compareBySplitThenPosition);

	return {
		raceId,
		trackName: response.data.racename,
		trackId: response.data.trackId ?? undefined,
		seasonName: response.data.seasonname,
		results: computeDisplayPositions(results),
		raceTime: response.data.raceTime ?? undefined
	};
}

export interface Track {
	id: string;
	name: string;
	location: string;
	/**
	 * Näyttömerkkijono sellaisenaan (esim. "13,6 km") — EI parsittu
	 * numeroksi, ks. types.ts:n RawTrack-kommentti epäjohdonmukaisesta
	 * muotoilusta eri radoilla.
	 */
	length?: string;
	/** Mutkien määrä — parsittu numeroksi koska muoto on ollut kaikissa nähdyissä esimerkeissä yksinkertainen kokonaisluku (esim. "32"). */
	turns?: number;
	/** Näyttömerkkijono sellaisenaan (esim. "37m"), samasta syystä kuin `length`. */
	elevation?: string;
	/** Rakennusvuosi merkkijonona (esim. "1967") — ei numerona, koska sitä ei tarvita laskentaan, vain näyttöön. */
	built?: string;
	/** Lisähuomio rakennusvuoteen (esim. "1990 (nro 10)"), `undefined` jos API antoi tyhjän merkkijonon. */
	builtExtra?: string;
	/** Radan VIRALLINEN (reaalimaailman) ennätysaika sellaisenaan, EI FISU:n oma. */
	lapRecord?: string;
	lapRecordDriver?: string;
	lapRecordCar?: string;
	info?: string;
	/** Ks. types.ts:n RawTrack.layout-kommentti — tarkoitus vahvistamaton. */
	layout?: string;
	/**
	 * Täysi URL rataprofiilin SVG-karttaan, koostettu `TRACK_IMAGE_BASE_
	 * URL`:sta (ympäristömuuttuja, ks. `src/env.ts` — ERI ISÄNTÄ kuin
	 * `FISU_API_BASE_URL`, joten omana muuttujanaan) + `RawTrack.
	 * trackimage`:sta. `undefined` jos backend ei anna `trackimage`:a
	 * tälle radalle (ei kaikilla radoilla, ei bugi) — UI:n pitää näyttää
	 * kuva ehdollisesti, ei olettaa sitä aina läsnä olevaksi.
	 */
	imageUrl?: string;
}

/**
 * Tyhjä merkkijono API:sta EI ole sama asia kuin "ei tietoa" UI:n
 * kannalta — molemmat pitää kohdella samoin (piilota kenttä), joten
 * tämä yksi apufunktio hoitaa sekä trim:in että tyhjä->undefined-
 * muunnoksen JOKAISELLE RawTrackin valinnaiselle tekstikentälle.
 */
function cleanOptionalText(raw: string | undefined): string | undefined {
	const trimmed = raw?.trim();
	return trimmed ? trimmed : undefined;
}

export function mapTracks(raw: RawTrackListResponse): Track[] {
	return raw.map(mapTrack);
}

function mapTrack(raw: RawTrack): Track {
	const turns = Number(raw.turns);
	const imageFile = cleanOptionalText(raw.trackimage);

	return {
		id: raw.trackid,
		// HUOM: trackname sisältää joskus ylimääräisen alkuvälilyönnin
		// (vahvistettu käyttäjän esimerkkidatasta, "Circuit de la Sarthe" -
		// rata) — trim pakollinen.
		name: raw.trackname.trim(),
		location: raw.location,
		length: cleanOptionalText(raw.length),
		turns: Number.isFinite(turns) ? turns : undefined,
		elevation: cleanOptionalText(raw.elevation),
		built: cleanOptionalText(raw.built),
		builtExtra: cleanOptionalText(raw.builtextra),
		lapRecord: cleanOptionalText(raw.laprecord),
		lapRecordDriver: cleanOptionalText(raw.laprecorddriver),
		lapRecordCar: cleanOptionalText(raw.laprecordcar),
		info: cleanOptionalText(raw.info),
		layout: cleanOptionalText(raw.layout),
		imageUrl: imageFile ? `${TRACK_IMAGE_BASE_URL}${imageFile}` : undefined
	};
}

export interface TrackRaceHistoryEntry {
	seasonId: number;
	seasonName: string;
	raceId: number;
	date: Date | undefined;
}

/**
 * Etsii FISU:n kisahistorian tietylle radalle TARKALLA `trackId`-
 * vertailulla. PÄIVITETTY 22.9.2026 (käyttäjän liittämä API-kenttäkartta):
 * `/races/{season}` sisältää nyt `trackId`:n joka viittaa suoraan
 * `/tracks`-endpointin `trackid`:hen — tämä KORVAA aiemman (21.9.2026)
 * NIMEEN perustuvan sallivan täsmäytyksen, joka oli tunnetusti epätarkka
 * (väärät osumat/puuttuvat osumat nimien poiketessa toisistaan).
 *
 * HUOM kenttäkartan dokumentoimasta tunnetusta rajoituksesta: 6 rataa on
 * käytössä kisoissa muttei `/tracks`-taulussa, jolloin niiden `trackId`
 * on `null` — nämä kisat eivät koskaan täsmää mihinkään rataan (oikein,
 * ei arvata mitä rataa "null" voisi tarkoittaa).
 *
 * `allSeasonsRaces` kootaan kutsujan puolella (ks. radat/[trackid]/
 * +page.server.ts) hakemalla JOKAISEN kauden kisalista erikseen — tämä
 * on RASKAS operaatio (yksi API-kutsu per kausi), tehdään siis vain
 * yksittäisen radan tarkennussivulla, ei koskaan radat-indeksisivulla.
 * (Sama N+1-rajoitus pysyy ennallaan — vain ITSE TÄSMÄYTYS parani,
 * ei se mistä data haetaan.)
 */
export function matchTrackRaceHistory(
	trackId: string,
	allSeasonsRaces: { seasonId: number; seasonName: string; races: RawRaceListEntry[] }[]
): TrackRaceHistoryEntry[] {
	const matches: TrackRaceHistoryEntry[] = [];
	for (const { seasonId, seasonName, races } of allSeasonsRaces) {
		for (const race of races) {
			if (race.trackId === trackId) {
				matches.push({
					seasonId,
					seasonName,
					raceId: race.id,
					date: parseHelsinkiDateTime(race.date, race.time)
				});
			}
		}
	}

	// Uusin ensin — `undefined`-päivät (parsimaton pvm) hännille, samalla
	// periaatteella kuin muutkin "puuttuva tieto hännille" -lajittelut
	// tällä sivustolla.
	return matches.sort((a, b) => {
		if (a.date === undefined && b.date === undefined) return 0;
		if (a.date === undefined) return 1;
		if (b.date === undefined) return -1;
		return b.date.getTime() - a.date.getTime();
	});
}

export interface SeasonListEntry {
	id: number;
	name: string;
	driversCount: number;
	/** Kauden sarjajohtaja/voittaja (pos 1) — `undefined` vain jos kaudella ei poikkeuksellisesti ole yhtään kuljettajaa. */
	leaderName?: string;
	leaderPoints?: number;
	/**
	 * Käyttäjän pyyntö 22.9.2026: `/kaudet`-listalla PÄÄTTYNEEN kauden
	 * "Sarjajohtaja"-labeli näytetään "Voittaja"-tekstillä sen sijaan
	 * (kausi ei ole enää "käynnissä", joten johtaja ON lopullinen
	 * voittaja). `true` kun `id` EI täsmää `ongoingSeasonId`:hen — SAMA
	 * periaate kuin `CurrentSeason.isOngoing`:ssa (ks. sen kommentti),
	 * vain käänteisenä ja koko listalle kerralla laskettuna sen sijaan
	 * että vain yhdelle kaudelle. Jos `ongoingSeasonId` on `undefined`
	 * (ei mitään käynnissä juuri nyt, normaali tila suurimman osan
	 * vuotta), KAIKKI listan kaudet ovat päättyneitä.
	 */
	isOver: boolean;
}

/**
 * `/kaudet`-indeksisivun listaus — KEVYT (ei kisalistaa/kisahaku per
 * kausi, vain `organiserSummary`, joka on jo haettava joka tapauksessa
 * yksittäisen kauden sivullakin). Uusin kausi ensin: sama seasonId-
 * suuruusheuristiikka kuin `pickDisplaySeasonId`:ssä (ks. sen kommentti
 * ja sama varaus — ei koodin takaama, mutta paras saatavilla oleva).
 *
 * `ongoingSeasonId` tulee `pickDisplaySeasonId`:n TAVOIN `/seasons/
 * {organiser}/current`:sta (ks. `isOver`-kentän kommentti) — kutsujan
 * (`+page.server.ts`) vastuulla hakea se, TÄSSÄ funktiossa ei tehdä
 * uutta API-kutsua.
 */
export function mapSeasonList(
	summary: RawOrganiserSummaryResponse,
	ongoingSeasonId: number | undefined
): SeasonListEntry[] {
	return summary
		.map((season) => {
			const leader = [...season.drivers].sort((a, b) => a.pos - b.pos)[0];
			return {
				id: season.seasonId,
				name: season.seasonName,
				driversCount: season.drivers.length,
				leaderName: leader?.name,
				leaderPoints: leader?.pts,
				isOver: season.seasonId !== ongoingSeasonId
			};
		})
		.sort((a, b) => b.id - a.id);
}

export interface SeasonRaceListEntry {
	raceId: number;
	/** Kauden kierrosnumero — sama ARVAUS-varaus kuin `UpcomingRace.raceNumber`:ssa (ks. sen kommentti), laskettu `/races/{season}`-taulukon järjestyksestä. */
	raceNumber: number;
	trackName: string;
	/** Viittaa `/tracks`-endpointin `trackid`:hen (ks. Track.id) — `undefined` jos rataa ei tunnistettu (API antaa `null`), ks. matchTrackRaceHistory-kommentti tunnetusta rajoituksesta. */
	trackId?: string;
	date: Date | undefined;
	/** True = kisa on jo ajettu (löytyy `/finishedraces/{season}`-joukosta) — vain näille linkitetään tulossivulle, ks. `/kaudet/[seasonId]/+page.svelte`. */
	finished: boolean;
	/**
	 * UUSI 26.9.2026 (`car_assignments` käyttöön): TÄLLE KISALLE erikseen
	 * kirjatut autot, ks. types.ts:n `RawRaceListEntry.carIds`-kommentti.
	 * TYHJÄ taulukko EI tarkoita "ei autoa" — vain ettei kisakohtaista
	 * tietoa ole vielä syötetty (kuljettajat voivat silti ajaa kausi-
	 * oletuksellaan). Eri asia kuin kauden koko pooli (`Car[]` muualla
	 * tässä tiedostossa, esim. `/kaudet/[seasonId]/+page.server.ts`:n
	 * `cars`) — tämä on VAIN tämän yhden kisan oma lista.
	 */
	cars: Car[];
}

/**
 * Kauden koko kisalista tilamerkinnällä (ajettu/tuleva) — kausisivun
 * "Kilpailut"-osiota varten. HUOM: EI lajitella uudelleen — pidetään
 * API:n oma järjestys (jota `mapUpcomingRace`/`raceNumber` jo olettavat
 * kronologiseksi, ks. niiden kommentit), jotta kierrosnumerointi pysyy
 * yhdenmukaisena koko sivustolla.
 *
 * `carDetails` on VALINNAINEN — id -> täysi RawCar-sanakirja (26.9.2026:
 * tämä on `RawSeasonRacesResponse.cars`, ks. sen kommentti historiasta —
 * NIMI on hämäävä koska se ON eri asia kuin `Car[]`-tyyppinen kauden
 * pooli, mutta backend käyttää samaa `cars`-nimeä eri muodossa eri
 * endpointeilla), jota vasten kunkin kisan `carIds` ratkaistaan täysiksi
 * `Car`-olioiksi. Kutsujat jotka eivät tarvitse per-kisa-autoja (etusivu,
 * radat/[trackid], autot/[carId]:n kausihistoria — nämä käyttävät
 * edelleen `fetchSeasonRaces`-funktiota joka ei anna tätä sanakirjaa)
 * jättävät tämän pois, jolloin jokainen rivi saa tyhjän `cars: []`:n
 * eikä mitään kaadu.
 */
export function mapSeasonRaceList(
	races: RawRaceListResponse,
	finishedRaceIds: Set<number>,
	carDetails: Record<string, RawCar> = {}
): SeasonRaceListEntry[] {
	return races.map((race, index) => ({
		raceId: race.id,
		raceNumber: index + 1,
		trackName: race.track,
		trackId: race.trackId ?? undefined,
		date: parseHelsinkiDateTime(race.date, race.time),
		finished: finishedRaceIds.has(race.id),
		cars: (race.carIds ?? [])
			.map((carId) => carDetails[String(carId)])
			.filter((raw): raw is RawCar => raw !== undefined)
			.map(mapCar)
	}));
}

/**
 * Kauden autopooli JOHDETTUNA `/races/{season}`-vastauksen `poolCarIds`+
 * `cars`-kentistä sen sijaan että haettaisiin erikseen `/cars/season/
 * {season}`:sta — UUSI 26.9.2026, kun backend yhdisti pooli-id:t ja
 * KAIKKIEN tässä vastauksessa esiintyvien autojen tiedot samaan
 * `/races/{season}`-kutsuun. Kausisivu (+page.server.ts) käyttää tätä
 * ylälaidan `<CarList>`:ia varten sen sijaan että tekisi enää erillistä
 * `/cars/season/{seasonId}`-kutsua — yksi vähemmän API-kutsu (ks.
 * API-TODO.md:n aiempi huomautus juuri tästä redundanssista).
 */
export function mapSeasonPool(response: RawSeasonRacesResponse): Car[] {
	return response.poolCarIds
		.map((id) => response.cars[String(id)])
		.filter((raw): raw is RawCar => raw !== undefined)
		.map(mapCar);
}

export interface DriverListEntry {
	driverId: number;
	name: string;
	/** Montako kautta kuljettaja on ajanut (kausia joilla on VÄHINTÄÄN yksi organiserSummary-rivi). */
	seasonsCount: number;
	/**
	 * Kaikkien kausien pisteiden SUMMA — HUOM: EI vertailukelpoinen eri
	 * kuljettajien välillä jos pistejärjestelmä/kausien pituus on
	 * vaihdellut vuosien varrella (ei tiedossa onko näin), joten tätä
	 * käytetään indeksisivulla VAIN kontekstitietona, ei ranking-
	 * perusteena — lista lajitellaan aakkosjärjestykseen (ks. `mapDriverList`
	 * -kutsuja `/kuljettajat/+page.svelte`:ssä), ei tämän mukaan.
	 */
	careerPoints: number;
	/** Kaikkien kausien ajettujen kisojen summa — `undefined` jos MIKÄÄN kausi ei antanut `races`-lukua. */
	careerRaces?: number;
	/**
	 * Paras kauden SISÄINEN yksittäisen kisan sijoitus KOSKAAN — pienin
	 * `bestFinish` kaikista kausista, `undefined` jos ei yhtään tiedossa
	 * TAI jos kaikki nähdyt arvot olivat ei-numeerisia (ks.
	 * `toFiniteNumberOrUndefined`-kommentti "PNaN"-bugista) — UI:n pitää
	 * kohdella `undefined`:ia samoin molemmissa tapauksissa (piilota
	 * kenttä), ei näyttää sitä NaN:ina.
	 */
	careerBestFinish?: number;
	/** Kaikkien kausien id:t joilla kuljettaja esiintyy — kaudittaisen pikasuodattimen perusta (ks. kuljettajat/+page.svelte). */
	seasonIds: number[];
}

/**
 * Kuljettajaindeksi — AGGREGOI `organiserSummary`:n (jo haettu muuallakin
 * sivustolla, ei uutta API-kutsua) KAIKKI kaudet kuljettajakohtaisesti.
 * HUOM: tämä EI ole sama data kuin käyttäjän 21.9.2026 liittämä raskaampi
 * `/results/organiser/{id}`-payload (joka sisältää mm. per-kisa
 * pistepolun ja paljon päällekkäisiä suomi/englanti-avaimia) — päädyttiin
 * käyttämään kevyempää, jo ennestään puhtaasti luettua `organiserSummary`
 * -rakennetta tähän listaukseen, koska se riittää (nimi, id, kausikohtaiset
 * pisteet/kisat/paras tulos) eikä vaadi uutta raakatyyppiä. Yksittäisen
 * kuljettajan OMAAN sivuun sen sijaan käytetään `/drivers/{organiser}/
 * {id}/career`:ia (ks. `mapDriverCareer`) — se antaa kisakohtaiset rivit
 * joita `organiserSummary` ei sisällä.
 */
export function mapDriverList(summary: RawOrganiserSummaryResponse): DriverListEntry[] {
	const byDriver = new Map<number, DriverListEntry>();

	for (const season of summary) {
		for (const driver of season.drivers) {
			const driverId = Number(driver.id);

			// Puolustava tarkistus: jos `driver.id` ei olisikaan numeroksi
			// muunnettavissa (esim. tyhjä merkkijono), `Number(...)` antaisi
			// `NaN`:n — ja koska KAIKKI ei-numeeriset id:t muuntuisivat
			// SAMAKSI `NaN`-avaimeksi tässä Map:issä, eri kuljettajat
			// alkaisivat ylikirjoittaa toisiaan äänettömästi. Ohitetaan
			// tällainen rivi kokonaan sen sijaan että sitä sekoitettaisiin
			// johonkin toiseen kuljettajaan.
			if (!Number.isFinite(driverId)) continue;

			const existing = byDriver.get(driverId);
			const bestFinish = toFiniteNumberOrUndefined(driver.bestFinish);

			if (!existing) {
				byDriver.set(driverId, {
					driverId,
					name: driver.name,
					seasonsCount: 1,
					careerPoints: driver.pts,
					careerRaces: driver.races,
					careerBestFinish: bestFinish,
					seasonIds: [season.seasonId]
				});
				continue;
			}

			existing.seasonsCount += 1;
			existing.careerPoints += driver.pts;
			existing.seasonIds.push(season.seasonId);
			if (driver.races !== undefined) {
				existing.careerRaces = (existing.careerRaces ?? 0) + driver.races;
			}
			if (bestFinish !== undefined) {
				existing.careerBestFinish =
					existing.careerBestFinish === undefined ? bestFinish : Math.min(existing.careerBestFinish, bestFinish);
			}
			// Käyttäjän raportoima bugi 22.9.2026: kuljettaja 1197 näkyi
			// nimellä "-", ja käyttäjä raportoi ERIKSEEN ettei hakukenttä
			// löydä toista kuljettajaa ("Ilkka Artimo") MILLÄÄN osalla
			// hänen nimeään — mahdollinen selitys: jokin kausi antaa vain
			// LYHENNETYN nimen (esim. "Ilkka" ilman sukunimeä) ja se
			// jäätyy pysyvästi jos se sattuu olemaan ENSIMMÄINEN nähty
			// kausi. Korjataan molemmat tapaukset samalla säännöllä:
			// PISIN ei-paikanpitäjä-nimi mistä tahansa kaudesta voittaa
			// (paikanpitäjä häviää aina, muuten pidempi = todennäköisemmin
			// täydellinen "Etunimi Sukunimi" lyhyemmän "Etunimi"-pelkän
			// sijaan) — sen sijaan että lukittauduttaisiin ikuisesti
			// ensimmäiseen nähtyyn arvoon.
			if (isPlaceholderName(existing.name)) {
				if (!isPlaceholderName(driver.name)) existing.name = driver.name;
			} else if (!isPlaceholderName(driver.name) && driver.name.trim().length > existing.name.trim().length) {
				existing.name = driver.name;
			}
		}
	}

	return [...byDriver.values()];
}

export interface SeasonFilterOption {
	seasonId: number;
	seasonName: string;
	/**
	 * Lyhyt nappimerkintä kaudittaiselle pikasuodattimelle (esim. "S18").
	 * Kolme lähdettä TÄRKEYSJÄRJESTYKSESSÄ: 1) backendin oma `shortName`
	 * jos joskus lisätään (ks. RawSeasonSummary-kommentti), 2) päätelty
	 * `seasonName`:sta (ks. `deriveSeasonShortLabel`), 3) KOKO `seasonName`
	 * sellaisenaan jos mikään ei tunnistu — käyttäjän nimenomainen pyyntö
	 * 22.9.2026: "olisi hyvä jos pelkät ID:t eivät näkyisi filttereinä",
	 * eli tämä EI KOSKAAN ole pelkkä numeerinen `seasonId`.
	 */
	shortLabel: string;
}

/**
 * Muotoilee sanan ISOLLA ALKUKIRJAIMELLA, loput pienellä (esim. "FIST" ->
 * "Fist") — käytetään `deriveSeasonShortLabel`:ssä kausinimen sulkeissa
 * olevalle lyhenteelle tai alaotsikon ensimmäiselle sanalle.
 */
function toTitleCase(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Päättelee lyhyen nappimerkinnän `seasonName`:stä kun backend ei (vielä)
 * anna erillistä `shortName`:a. Käyttäjän antamat kolme esimerkkimuotoa
 * (22.9.2026) joita TÄYTYY tukea:
 *
 *   "S18 — Jidé Rallye Revival Series"    -> "S18"   (jo nimen alussa)
 *   "FiSU Season 8½"                      -> "S8½"   (numero "Season"-sanan jälkeen)
 *   "Season 6: FiSU Sport Trophy (FiST)"  -> "S6 Fist" (numero + sulkeissa oleva lyhenne)
 *   "Season 6: Niki Lauda Tribute"        -> "S6 Niki" (numero + alaotsikon ensimmäinen sana)
 *
 * Jos MIKÄÄN näistä ei täsmää, palautetaan `seasonName` SELLAISENAAN
 * (ei koskaan pelkkä id, ks. `SeasonFilterOption.shortLabel`-kommentti).
 */
function deriveSeasonShortLabel(seasonName: string): string {
	// Muoto 1: numero on JO nimen alussa ("S18 — ...").
	const prefixMatch = seasonName.match(/^S(\d+½?)\b/);
	if (prefixMatch) return `S${prefixMatch[1]}`;

	// Muodot 2 ja 3: "Season <numero>" jossain kohtaa nimeä.
	const seasonMatch = seasonName.match(/Season\s+(\d+½?)/i);
	if (seasonMatch) {
		const number = seasonMatch[1];

		// Sulkeissa oleva lyhenne (esim. "(FiST)") voittaa aina, koska se
		// on TARKOITUKSELLA valittu lyhyt tunniste — parempi kuin arvata
		// alaotsikon ensimmäisestä sanasta.
		const abbreviationMatch = seasonName.match(/\(([A-Za-zÅÄÖåäö]+)\)/);
		if (abbreviationMatch) return `S${number} ${toTitleCase(abbreviationMatch[1])}`;

		// Muuten kaksoispisteen jälkeisen alaotsikon ensimmäinen sana,
		// "FiSU"-sana ohitettuna koska se on organisaation nimi, ei osa
		// kauden omaa teemaa.
		const colonIndex = seasonName.indexOf(':');
		if (colonIndex !== -1) {
			const subtitleWords = seasonName
				.slice(colonIndex + 1)
				.trim()
				.split(/\s+/)
				.filter((word) => word.toLowerCase() !== 'fisu' && word !== '');
			if (subtitleWords.length > 0) return `S${number} ${toTitleCase(subtitleWords[0])}`;
		}

		return `S${number}`;
	}

	return seasonName;
}

/**
 * Poimii `organiserSummary`:sta kausien LYHYEN listan kaudittaista
 * pikasuodatinta varten (ks. kuljettajat/+page.svelte, käyttäjän pyyntö
 * 22.9.2026: "S3, S4...S23"-napit joilla listan voi rajata yhteen
 * kauteen). HUOM: EI sama asia kuin `mapSeasonList`/`SeasonListEntry`
 * yllä — se on `/kaudet`-indeksisivun kausikortteja varten (johtaja,
 * pisteet, ym.), tämä on VAIN lyhyt nappimerkintä+id suodatinta varten.
 * Järjestetty NOUSEVASTI `seasonId`:n mukaan (vanhin ensin) —
 * TARKOITUKSELLA eri järjestys kuin muualla sivustolla ("uusin ensin"),
 * koska pikasuodatinnapit luetaan vasemmalta oikealle numerojärjestyksessä
 * ("S3, S4, S5...") eikä aikajärjestyksen käänteisenä.
 */
export function mapSeasonFilterOptions(summary: RawOrganiserSummaryResponse): SeasonFilterOption[] {
	return summary
		.map((season) => ({
			seasonId: season.seasonId,
			seasonName: season.seasonName,
			shortLabel: season.shortName ?? deriveSeasonShortLabel(season.seasonName)
		}))
		.sort((a, b) => a.seasonId - b.seasonId);
}

export interface DriverCareerRace {
	raceId: number;
	raceName: string;
	position: number;
	/** TÄMÄN kisan pisteet (ei kauden/uran kokonaispisteitä). */
	points: number;
	gapDisplay?: string;
	bestLapTime?: string;
	/**
	 * Sijoja voitettu (positiivinen) tai hävitty (negatiivinen) aika-
	 * ajoista maaliin — LASKETAAN itse `startingPosition - position`
	 * -kaavalla, EI oteta suoraan API:sta (sama, aiemmin bugin kautta
	 * opittu käytäntö kuin `normalizePositionChange`:ssa, ks. sen
	 * kommentti — tälläkään endpointilla ei tosin OLE valmista
	 * `positionChange`-kenttää lainkaan, joten tässä ei ollut samaa
	 * riskiä, mutta laskutapa pidetään silti yhtenäisenä koko sivustolla).
	 * `undefined` jos `startingPosition` on `null` (esim. aika-ajo ajamatta).
	 */
	positionChange?: number;
	win: boolean;
	podium: boolean;
	pole: boolean;
	fastestLap: boolean;
	dnf: boolean;
	/**
	 * LISÄTTY 27.9.2026 — sama merkitys kuin `RaceResultEntry.split`:ssä.
	 * Tällä sivulla EI vaikuta järjestykseen (yhden kuljettajan omat kisat
	 * näytetään aina aikajärjestyksessä, ei kilpasijoituksena muihin
	 * verrattuna) — vain kertoo että TÄMÄN kisan `position`/`points` olivat
	 * splitin sisäisiä, ei koko kentän, jottei kukaan tulkitse "P1":tä
	 * väärin koko kisan voitoksi kun se oli vain oman splitin voitto.
	 */
	split: number | null;
}

/** Sama kenttäjoukko kausi- ja urakohtaisille tilastoille, ks. RawDriverCareerStats-kommentti types.ts:ssä. `null`-arvot muunnetaan `undefined`:ksi komponenttien props-rajapinnan mukaisesti. */
export interface DriverCareerStatsBlock {
	racesEntered: number;
	bestResult?: number;
	wins: number;
	podiums: number;
	poles: number;
	fastestLaps: number;
	dnfs: number;
	dnfPct?: number;
	averagePosition?: number;
}

export interface DriverCareerSeason {
	seasonId: number;
	seasonName: string;
	races: DriverCareerRace[];
	stats: DriverCareerStatsBlock;
}

export interface DriverCareer {
	driverId: number;
	driverName: string;
	/** Uusin kausi ensin — sama järjestys kuin API antaa (vahvistettu esimerkkidatasta), ei lajitella uudelleen. */
	seasons: DriverCareerSeason[];
	careerStats: DriverCareerStatsBlock;
}

function mapDriverCareerStats(raw: RawDriverCareerStats): DriverCareerStatsBlock {
	return {
		racesEntered: raw.racesEntered,
		bestResult: raw.bestResult ?? undefined,
		wins: raw.wins,
		podiums: raw.podiums,
		poles: raw.poles,
		fastestLaps: raw.fastestLaps,
		dnfs: raw.dnfs,
		dnfPct: raw.dnfPct ?? undefined,
		averagePosition: raw.averagePosition ?? undefined
	};
}

function mapDriverCareerRace(raw: RawDriverCareerRace): DriverCareerRace {
	const positionChange =
		raw.startingPosition !== null ? raw.startingPosition - raw.position : undefined;

	return {
		raceId: raw.raceId,
		raceName: raw.raceName,
		position: raw.position,
		points: raw.points,
		gapDisplay: formatGapDisplay(raw.gap),
		bestLapTime: raw.bestLapTime,
		positionChange,
		win: raw.win,
		podium: raw.podium,
		pole: raw.pole,
		fastestLap: raw.fastestLap,
		dnf: raw.dnf,
		split: raw.split ?? null
	};
}

export function mapDriverCareer(response: RawDriverCareerResponse): DriverCareer {
	return {
		driverId: response.data.driverId,
		driverName: response.data.driverName,
		seasons: response.data.seasons.map((season) => ({
			seasonId: season.seasonId,
			seasonName: season.seasonName,
			races: season.races.map(mapDriverCareerRace),
			stats: mapDriverCareerStats(season.stats)
		})),
		careerStats: mapDriverCareerStats(response.data.careerStats)
	};
}

/**
 * Hall of Fame -rivi (`/halloffame/{organiser}`, API-kenttäkartta
 * 22.9.2026, korjattu versio). `driverName`/`stats` ovat `null` YHDESSÄ
 * kun `statsError === true` — tämä VÄLITTÄÄ sen tilan suoraan eteenpäin
 * `undefined`:na (ei yritä keksiä paikkaajaa, esim. "Tuntematon
 * kuljettaja") — +page.svelte päättää miten kortti näytetään ilman
 * nimeä/lukemia. `stats` käyttää SAMAA `mapDriverCareerStats`-muunninta
 * kuin `mapDriverCareer`, koska kenttäkartta vahvistaa rakenteen olevan
 * TARKALLEEN sama kuin `/career`-endpointin `careerStats`-lohko — ei siis
 * kahta erillistä (ja mahdollisesti eriytyvää) muunnoslogiikkaa samalle
 * datamuodolle.
 */
export interface HallOfFameEntry {
	driverId: number;
	/** `undefined` jos `statsError === true` (nimi tulee samasta statshausta joka epäonnistui). */
	driverName?: string;
	tagline: string;
	quote: string;
	/** Vapaata tekstiä (esim. "Season 9 (2021)") — EI ext_sid. */
	firstSeason: string;
	/** `undefined` jos `statsError === true`. */
	stats?: DriverCareerStatsBlock;
	statsError: boolean;
}

export function mapHallOfFameEntry(raw: RawHallOfFameEntry): HallOfFameEntry {
	return {
		driverId: raw.driverId,
		driverName: raw.driverName ?? undefined,
		tagline: raw.tagline,
		quote: raw.quote,
		firstSeason: raw.firstSeason,
		stats: raw.stats ? mapDriverCareerStats(raw.stats) : undefined,
		statsError: raw.statsError
	};
}

export function mapHallOfFameList(entries: RawHallOfFameEntry[]): HallOfFameEntry[] {
	return entries.map(mapHallOfFameEntry);
}

export interface HallOfFamePage {
	/** Ylläpidon kirjoittama johdantoteksti (LISÄTTY 2026-09-21) — `undefined` jos ei asetettu. */
	intro?: string;
	entries: HallOfFameEntry[];
}

/**
 * Koko `/halloffame/{organiser}`-vastauksen muunnos — `intro` on
 * vastauksen JUURESSA `data`:n sisarkenttänä (ei sen sisällä), joten
 * tämä ottaa koko `RawHallOfFameResponse`:n eikä pelkkää `data`-
 * taulukkoa niin kuin `mapHallOfFameList`. +page.server.ts käyttää
 * tätä (ei enää `mapHallOfFameList`:ä suoraan) sekä oikealle API-
 * vastaukselle että kehitystilan mock-vastaukselle, jotta molemmat
 * kulkevat saman muunnoslogiikan läpi.
 */
export function mapHallOfFame(response: RawHallOfFameResponse): HallOfFamePage {
	return {
		intro: response.intro ?? undefined,
		entries: mapHallOfFameList(response.data)
	};
}

/**
 * `/stats/organiser/{organiser}/complete`-endpointin muunnokset
 * `/tilastot`-sivua varten (käyttäjän liittämä API-kenttäkartta
 * 22.9.2026). Kolme osiota: leaderboardit (kuljettajakohtaiset
 * ennätykset), ratakohtainen kisamäärä (yhdistetty `/tracks`-listaan
 * nimeä varten, ks. `mapTrackUsage`), ja kausitrendit.
 */
export interface LeaderboardEntry {
	driverId: number;
	name: string;
	races: number;
	wins: number;
	podiums: number;
	poles: number;
	fastestLaps: number;
}

export interface CommunityLeaderboards {
	mostWins: LeaderboardEntry[];
	mostPodiums: LeaderboardEntry[];
	mostPoles: LeaderboardEntry[];
	mostFastestLaps: LeaderboardEntry[];
}

function mapLeaderboardEntry(raw: RawLeaderboardEntry): LeaderboardEntry {
	return {
		driverId: Number(raw.driverId),
		name: raw.name,
		races: raw.races,
		wins: raw.wins,
		podiums: raw.podiums,
		poles: raw.poles,
		fastestLaps: raw.fastestLaps
	};
}

export function mapCommunityLeaderboards(response: RawStatsCompleteResponse): CommunityLeaderboards {
	return {
		mostWins: response.leaderboards.mostWins.map(mapLeaderboardEntry),
		mostPodiums: response.leaderboards.mostPodiums.map(mapLeaderboardEntry),
		mostPoles: response.leaderboards.mostPoles.map(mapLeaderboardEntry),
		mostFastestLaps: response.leaderboards.mostFastestLaps.map(mapLeaderboardEntry)
	};
}

export interface TrackUsageEntry {
	trackId: string;
	/**
	 * `undefined` jos tätä trackId:tä ei löydy `/tracks`-listasta —
	 * TUNNETTU tilanne (ks. API-kenttäkartan kohta 4: kuusi rataa on
	 * käytössä kisoissa mutta puuttuu `tracks`-taulusta). UI näyttää
	 * tällöin pelkän id:n sulkeissa sen sijaan että arvaisi nimen.
	 */
	trackName?: string;
	/** Radan kuvakartan URL, jos saatavilla (ks. Track.imageUrl) — sama puuttumissyy kuin trackName:lla. */
	imageUrl?: string;
	raceCount: number;
}

/**
 * Yhdistää `trackStats.raceCountByTrackId`-kartan (pelkät id:t ja
 * lukumäärät) `/tracks`-listan nimiin ja kuvakarttoihin — kaksi erillistä
 * API-kutsua yhdistetään tässä yhdeksi näyttömuotoon. Järjestetty
 * eniten käytetystä radasta vähiten käytettyyn, koska sivu esittää tämän
 * "suosituimmat radat" -listana.
 */
export function mapTrackUsage(response: RawStatsCompleteResponse, tracks: Track[]): TrackUsageEntry[] {
	const trackById = new Map(tracks.map((track) => [track.id, track]));

	return Object.entries(response.trackStats.raceCountByTrackId)
		.map(([trackId, raceCount]) => {
			const track = trackById.get(trackId);
			return {
				trackId,
				trackName: track?.name,
				imageUrl: track?.imageUrl,
				raceCount
			};
		})
		.sort((a, b) => b.raceCount - a.raceCount);
}

export interface SeasonTrendEntry {
	seasonId: number;
	seasonName: string;
	driverCount: number;
	raceCount: number;
}

/**
 * HUOM: EI järjestetä uudelleen — backendin oma järjestys oletetaan
 * jo sopivaksi (ks. types.ts:n RawStatsCompleteResponse.seasonTrends-
 * kommentti), koska emme (vielä) tiedä onko `ext_sid` luotettavasti
 * aikajärjestyksessä kaikilla kausilla.
 */
export function mapSeasonTrends(response: RawStatsCompleteResponse): SeasonTrendEntry[] {
	return response.seasonTrends.map((entry) => ({ ...entry }));
}

/**
 * Autot — UUSI 2026-09-25, käyttäjän pyynnöstä ("aloitetaan autodatan
 * hyödyntäminen kausi-/kisasivuilla"). Käsin ylläpidetty sanakirja, ks.
 * types.ts:n RawCar-kommentti. `manufacturer`/`class`/`sim`/`notes` ovat
 * `null` kunnes ylläpito täyttää ne — `undefined`:ksi muunnettuna
 * komponenttien props-rajapinnan mukaisesti, sama periaate kuin muillakin
 * valinnaisilla kentillä tässä tiedostossa.
 *
 * PÄIVITYS (25.9.2026, käyttäjän palaute): aiempi `SeasonCarInfo`/
 * `singleCar`-erottelu (ks. tämän kommentin git-historia) poistettu —
 * UI näyttää nyt JOKAISEN poolin auton samalla tavalla klikattavana
 * linkkinä `/autot/{id}`:hen (ks. `<CarList>`-komponentti), joten "vain
 * yksi auto koko kaudella" -tapaus tulee automaattisesti oikein kun
 * poolissa sattuu olemaan vain yksi alkio — erillistä UI-erikoistapausta
 * ei enää tarvita. `car_assignments`-taulu (kuka kuljettaja ajoi millä
 * autolla) on edelleen tyhjä backendissä (ks. API-kenttäkartan "Autot"-
 * kohta) — tämä ei silti muuta poolin NÄYTTÖTAPAA, vain sen ettei per-
 * kuljettaja-tietoa vielä ole.
 */
export interface Car {
	id: number;
	name: string;
	manufacturer?: string;
	class?: string;
	sim?: string;
	notes?: string;
}

/**
 * BUGIKORJAUS (25.9.2026, käyttäjän raportoima: `/autot/8` — ja mikä
 * tahansa muukin id — antoi aina 404:n "autoa ei löytynyt", vaikka auto
 * OLI sanakirjassa). Syy sama, tuttu kuvio muualtakin tästä API:sta
 * (ks. esim. `RawCurrentSeasonResponse`/`RawDriverStanding`-kommentit
 * types.ts:ssä): `RawCar.id` on TYYPITETTY `number`, mutta API antaa sen
 * LIVENÄ MERKKIJONONA (esim. `"8"`). Ilman `Number(...)`-muunnosta
 * `Car.id` päätyi merkkijonoksi, jolloin `autot/[carId]/+page.server.ts`:n
 * `cars.find((c) => c.id === carId)` (numero) epäonnistui AINA hiljaisesti
 * riippumatta siitä mikä id kokeiltiin — `===` ei koskaan täsmää
 * merkkijonon ja numeron välillä JavaScriptissä.
 *
 * TOINEN BUGIKORJAUS (26.9.2026, käyttäjän raportoima `each_key_volatile`/
 * `NaN`-avain kisasivun CarList:issa): kun `raw` tulee ID:llä avatetun
 * sanakirjan ARVONA (`RawSeasonRacesResponse.cars`, `RawRaceCarsData.
 * carDetails`), backend nimeää id-kentän `carId`:ksi, EI `id`:ksi (ks.
 * types.ts:n RawCar-kommentti) — `raw.id` oli `undefined` näissä, ja
 * `Number(undefined)` on `NaN`. `raw.id ?? raw.carId` lukee kummankin
 * muodon: taulukkomuotoiset vastaukset (`/cars`, `/cars/season/{season}`)
 * antavat vain `id`:n, sanakirjamuotoiset vain `carId`:n.
 */
export function mapCar(raw: RawCar): Car {
	return {
		id: Number(raw.id ?? raw.carId),
		name: raw.name,
		manufacturer: raw.manufacturer ?? undefined,
		class: raw.class ?? undefined,
		sim: raw.sim || undefined,
		notes: raw.notes ?? undefined
	};
}

/** Sama muunnos kelpaa sekä kauden autopoolille (`/cars/season/{id}`) että koko sanakirjalle (`/cars`, ks. autot/[carId]-sivu) — molemmat ovat `RawCar[]`. */
export function mapCars(raw: RawCarListResponse): Car[] {
	return raw.map(mapCar);
}

/**
 * Auton "kaudet ja kisat" -historia auton tarkennussivulle (UUSI
 * 25.9.2026, käyttäjän pyyntö: "each car lists the seasons and races
 * they have been part of"). Sama N+1-kuvio kuin `matchTrackRaceHistory`:
 * kutsuja (autot/[carId]/+page.server.ts) hakee JOKAISEN kauden
 * autopoolin erikseen — raskasta, mutta tehdään TARKOITUKSELLA vain
 * tällä yksittäisen auton tarkennussivulla, ei /autot-indeksissä (ks.
 * saman periaatteen kommentti radat/[trackid]/+page.server.ts:ssä).
 *
 * `exclusive`: kauden autopoolissa oli TASAN yksi auto (tämä), jolloin
 * TIEDÄMME sen olleen mukana JOKAISESSA kauden kisassa (ks. Car-kommentin
 * perustelu) — kutsuja hakee tällöin kauden koko kisalistan `races`-
 * kenttään. Useamman auton kausilla EI tässä yritetä selvittää mitä
 * yksittäisiä kisoja tämä auto koski — vaikka `car_assignments`-taulu on
 * NYT käytössä (26.9.2026) ja antaisi periaatteessa tarkan vastauksen
 * `/cars/race/{season}/{race}`:n kautta, se vaatisi YHDEN kutsun PER
 * kisa PER kausi tälle jo valmiiksi raskaalle N+1-sivulle (ks. API-TODO.md)
 * — liian kallista tälle "parasta yritystä" -historialistalle. `exclusive`
 * on tällöin `false` ja `races` jää TYHJÄKSI, ei arvata.
 */
export interface CarSeasonMatch {
	seasonId: number;
	seasonName: string;
	exclusive: boolean;
}

export function matchCarSeasons(
	carId: number,
	seasonPools: { seasonId: number; seasonName: string; pool: Car[] }[]
): CarSeasonMatch[] {
	return seasonPools
		.filter((season) => season.pool.some((car) => car.id === carId))
		.map((season) => ({
			seasonId: season.seasonId,
			seasonName: season.seasonName,
			exclusive: season.pool.length === 1
		}));
}

/**
 * Auton ratkaisu kisan koko kuljettajaruudukolle — UUSI 26.9.2026,
 * `car_assignments`-taulu tuli käyttöön. Nelitasoinen ratkaisujärjestys
 * (backendin oma dokumentaatio, tarkimmasta epätarkimpaan):
 *   1. kuljettaja+kisa-kohtainen poikkeus
 *   2. kuljettajan oma kausioletus
 *   3. koko kisan varaosa-auto (kaikille joilla ei omaa riviä)
 *   4. kauden poolin auto, VAIN jos poolissa on TASAN yksi
 * `/cars/race/{season}/{race}` (ks. `mapRaceCars`) ratkaisee tasot 1-2
 * valmiiksi `data`-taulukkoon ja antaa tason 3 `raceWideCar`-kenttänä —
 * TÄMÄ tiedosto ei siis päättele niitä itse. Taso 4 EI sisälly backendin
 * vastaukseen (se soveltuu vain `/cars/{season}/{driver}/{race}`-
 * endpointilla), joten `resolveDriverCar` (alla) soveltaa sen itse
 * `mapRaceCars`:n tuloksen päälle — sama päättely kuin `matchCarSeasons`:
 * jo käyttää kausi-/kisasivujen `CarList`-listoilla.
 */
export interface RaceCarResolution {
	byDriverId: Map<number, Car>;
	raceWideCar?: Car;
}

/**
 * KORJATTU 26.9.2026 (sama päivä, käyttäjän raportoima 500-virhe, esim.
 * `/kaudet/168/kilpailut/878`): backend vaihtoi tämän endpointin muodon
 * datan turvotuksen välttämiseksi (ks. types.ts:n `RawRaceCarsResponse`-
 * kommentti) — VANHA versio tästä funktiosta oletti `response.data`:n
 * olevan TAULUKKO täysiä auto-olioita, mutta se on nyt JOKO `null` TAI
 * olio jossa `assignments` (driverId+carId-PARIT, ei täysiä olioita) ja
 * `carDetails` (id -> täysi RawCar) ovat ERILLÄÄN — `for...of response.data`
 * kaatui `TypeError`iin heti kun `data` oli olio eikä taulukko.
 */
export function mapRaceCars(response: RawRaceCarsResponse): RaceCarResolution {
	if (!response.data) return { byDriverId: new Map() };

	const { carDetails, assignments, raceWideCarId } = response.data;

	function resolveCarById(carId: number | string | null): Car | undefined {
		if (carId === null) return undefined;
		const raw = carDetails[String(carId)];
		return raw ? mapCar(raw) : undefined;
	}

	const byDriverId = new Map<number, Car>();
	for (const assignment of assignments) {
		const car = resolveCarById(assignment.carId);
		if (car) byDriverId.set(Number(assignment.driverId), car);
	}

	return {
		byDriverId,
		raceWideCar: resolveCarById(raceWideCarId)
	};
}

/**
 * Ratkaisee YHDEN kuljettajan auton tässä kisassa, tasot 1-4 (ks. yllä).
 * `undefined` on LAILLINEN, odotettu lopputulos jos mikään taso ei osu
 * (backendin oma esimerkki: `data: null` "genuinely unresolved") — EI
 * virhetila, UI näyttää tällöin "auto ei tiedossa" -tilan sen sijaan
 * että arvattaisiin tai virhettä heitettäisiin.
 */
export function resolveDriverCar(driverId: number, resolution: RaceCarResolution, seasonPool: Car[]): Car | undefined {
	return (
		resolution.byDriverId.get(driverId) ??
		resolution.raceWideCar ??
		(seasonPool.length === 1 ? seasonPool[0] : undefined)
	);
}

/**
 * Liittää `resolveDriverCar`:n tuloksen jokaiselle kisatuloksen riville —
 * ERILLINEN funktio `mapLatestRaceResult`:n PÄÄLLE (ei sotkettu siihen
 * suoraan), koska autoresoluutio on täysin valinnainen lisähaku: kisasivu
 * toimii ja näyttää tulokset normaalisti vaikka `/cars/race/{season}/{race}`
 * -haku epäonnistuisi (ks. `/kaudet/[seasonId]/kilpailut/[raceId]/
 * +page.server.ts`:n try/catch-rajaus).
 */
export function attachRaceCars(
	result: LatestRaceResult,
	resolution: RaceCarResolution,
	seasonPool: Car[]
): LatestRaceResult {
	return {
		...result,
		results: result.results.map((entry) => ({
			...entry,
			car: resolveDriverCar(entry.driverId, resolution, seasonPool)
		}))
	};
}

/**
 * Kaikki tälle KISALLE ratkaistut eri autot (kuljettajakohtaiset +
 * varaosa-auto), duplikaatit poistettuna auton id:n mukaan — kisasivun
 * ylälaidan `CarList`-listaa varten. TYHJÄ jos MITÄÄN ei ole vielä
 * kirjattu TÄLLE kisalle erikseen (ei sama asia kuin "ei autoa ajettu",
 * ks. types.ts:n `RawRaceListEntry.cars`-kommentti) — kutsuja
 * (+page.server.ts) näyttää tällöin kauden poolin sen sijaan, käyttäjän
 * ohjeen mukaisesti ("fall back to the season-level pool display").
 */
export function raceCarsUnion(resolution: RaceCarResolution): Car[] {
	const byId = new Map<number, Car>();
	for (const car of resolution.byDriverId.values()) byId.set(car.id, car);
	if (resolution.raceWideCar) byId.set(resolution.raceWideCar.id, resolution.raceWideCar);
	return [...byId.values()];
}

/**
 * Kuljettajien reittauksen kehitys (rating race) — UUSI 28.9.2026,
 * käyttäjän pyyntö. Yksi rivi `RawRaceChartFrame.standings`:in [driverIndex,
 * rating] -parista, ratkaistuna täydeksi näyttöriviksi: nimi haetaan
 * `drivers[driverIndex]`:stä (ks. types.ts:n RawRaceChartDriver-kommentti,
 * "driverIndex" on TAULUKKOINDEKSI, ei `id`-kenttä), `rank` on parin oma
 * indeksi `standings`-taulukossa + 1 (EI erillinen kenttä API:ssa).
 */
export interface RaceChartStanding {
	/** `drivers`-taulukon indeksi — VAKAA tunniste TÄMÄN datasetin sisällä (sama kuljettaja = sama indeksi joka framessa), käytetään `{#each}`-avaimena ja väriarvontaan. */
	driverIndex: number;
	/** Kuljettajan OMA id (sama arvoavaruus kuin `/kuljettajat/[driverId]`) — linkitystä varten, EI käytetä avaimena koska se on merkkijono API:ssa. */
	driverId: number;
	name: string;
	rank: number;
	rating: number;
}

export interface RaceChartFrame {
	title: string;
	standings: RaceChartStanding[];
}

export interface RaceChartData {
	frames: RaceChartFrame[];
	/** `drivers.length` — kaikki datasetissä KOSKAAN esiintyvät kuljettajat, EI saman kuin minkään yksittäisen framen kuljettajamäärä (framet kasvavat, ks. types.ts:n RawRaceChartFrame-kommentti). */
	totalDrivers: number;
}

export function mapRaceChartData(raw: RawRaceChartResponse): RaceChartData {
	return {
		totalDrivers: raw.drivers.length,
		frames: raw.frames.map((frame) => ({
			title: frame.title,
			standings: frame.standings.map(([driverIndex, rating], index) => {
				const driver = raw.drivers[driverIndex];
				return {
					driverIndex,
					driverId: Number(driver?.id),
					// Puuttuva kuljettaja (virheellinen driverIndex) EI kaada koko
					// sivua — näytetään indeksi paikkaajana sen sijaan että rivi
					// hävitettäisiin kokonaan (rank-numerointi pysyisi muuten rikki).
					name: driver?.name ?? `Kuljettaja ${driverIndex}`,
					rank: index + 1,
					rating
				};
			})
		}))
	};
}

/**
 * Arvostelut (reviews) — UUSI 2.10.2026, ks. types.ts:n RawReviewLogin
 * Response-kommentti API:n erikoisuuksista. Nämä funktiot ovat se KOHTA
 * jossa `success: false` -virhevastaukset erotetaan onnistumisesta —
 * koska `client.ts`:n `postReviewLogin`/`postReview` EIVÄT heitä HTTP-
 * virheistä (ks. niiden kommentti), tämä on AINOA paikka jossa kutsuja
 * saa tietää onnistuiko pyyntö.
 */

export interface ReviewLoginCar {
	carId: number;
	name: string;
	races: number;
}

export interface ReviewLoginTrack {
	trackId: string;
	trackName: string;
	races: number;
}

export interface ReviewLoginCombo {
	carId: number;
	trackId: string;
	races: number;
}

export interface MyReview {
	carId: number | null;
	trackId: string | null;
	score: number;
	note?: string;
	updatedAt: string;
}

export interface ReviewSession {
	token: string;
	driverName: string;
	cars: ReviewLoginCar[];
	tracks: ReviewLoginTrack[];
	combos: ReviewLoginCombo[];
	myReviews: MyReview[];
}

export type ReviewLoginResult = { ok: true; session: ReviewSession } | { ok: false; error: string };

/**
 * `ok: false` kun API antoi `success: false` (väärä SteamID/salasana,
 * 401) — `raw.message` on TÄLLÖIN käyttäjälle näytettävä valmis
 * suomenkielinen/englanninkielinen virhe suoraan API:lta (ks. API-
 * REFERENCE.md: "Wrong Steam id or password"). Ei käännetä sitä, koska
 * emme tiedä etukäteen millä kielellä API sen antaa.
 */
/**
 * API:n virheviestit (`message`/`error`/`errors.*`) ovat ENGLANNIKSI ja
 * KIINTEÄÄ tekstiä (ks. API-REFERENCE.md:n luvun 11 esimerkit) — UUSI
 * 2.10.2026, käyttäjän pyyntö: ei enää välitetä niitä sellaisenaan
 * käyttäjälle, vaan KÄÄNNETÄÄN tunnetut, dokumentoidut viestit suomeksi.
 * Tuntematon/uusi viesti (esim. jos backend joskus lisää uuden validointi-
 * säännön) saa SILTI aina suomenkielisen YLEISEN virheen alla olevassa
 * `mapReviewLogin`/`mapSubmitReview`:n fallback-ketjussa — rajapinnan
 * tarkkaa tekstiä EI koskaan näytetä kääntämättömänä, vaikka emme
 * tunnistaisikaan sitä.
 */
const KNOWN_API_MESSAGES: Record<string, string> = {
	'Wrong Steam id or password': 'Väärä Steam ID tai salasana.',
	'Authentication required': 'Istunto on vanhentunut — kirjaudu uudelleen.'
};

function translateKnownApiMessage(message: string | undefined): string | undefined {
	if (!message) return undefined;
	return KNOWN_API_MESSAGES[message];
}

export function mapReviewLogin(raw: RawReviewLoginResponse): ReviewLoginResult {
	if (!raw.success || !raw.token) {
		return { ok: false, error: translateKnownApiMessage(raw.message) ?? 'Kirjautuminen epäonnistui. Tarkista Steam ID ja salasana.' };
	}

	return {
		ok: true,
		session: {
			token: raw.token,
			driverName: raw.name ?? '',
			cars: raw.cars ?? [],
			tracks: raw.tracks ?? [],
			combos: raw.combos ?? [],
			myReviews: (raw.myReviews ?? []).map((review) => ({
				carId: review.carId,
				trackId: review.trackId,
				score: review.score,
				note: review.note ?? undefined,
				updatedAt: review.updatedAt
			}))
		}
	};
}

export type SubmitReviewResult =
	| { ok: true; carId: number | null; trackId: string | null; score: number; note?: string }
	| {
			ok: false;
			error: string;
			/** Kenttäkohtaiset validointisyyt (422) — `undefined` 401:llä (token vanhentunut/puuttuu), jolloin `error` yksin riittää. */
			fieldErrors?: { target?: string; score?: string; note?: string };
	  };

/**
 * Kenttäkohtaiset validointiviestit (`errors.target`/`score`/`note`) —
 * API:n OMA dokumentoitu esimerkki on "must be an integer 1-5" `score`:lle;
 * muita TARKKOJA viestitekstejä ei ole dokumentoitu, joten näille ei voida
 * taata täyttä käännöskattavuutta. Tunnistamattomat jätetään KÄÄNTÄMÄTTÄ
 * tässä (eivät ole toistaiseksi edes näkyvissä UI:ssa, ks. ReviewItemForm.
 * svelte — vain `error`/`message`-tason YLEINEN viesti näytetään), mutta
 * tunnetut käännetään jos/kun niitä aletaan joskus näyttää.
 */
const KNOWN_FIELD_ERROR_MESSAGES: Record<string, string> = {
	'must be an integer 1-5': 'Pisteen on oltava kokonaisluku väliltä 1-5.'
};

function translateFieldError(message: string | undefined): string | undefined {
	if (!message) return undefined;
	return KNOWN_FIELD_ERROR_MESSAGES[message] ?? message;
}

export function mapSubmitReview(raw: RawSubmitReviewResponse): SubmitReviewResult {
	if (!raw.success) {
		return {
			ok: false,
			error:
				translateKnownApiMessage(raw.message) ??
				translateFieldError(raw.error) ??
				'Arvostelun tallennus epäonnistui. Tarkista pisteet (1-5) ja yritä uudelleen.',
			fieldErrors: raw.errors && {
				target: translateFieldError(raw.errors.target),
				score: translateFieldError(raw.errors.score),
				note: translateFieldError(raw.errors.note)
			}
		};
	}

	return {
		ok: true,
		carId: raw.carId ?? null,
		trackId: raw.trackId ?? null,
		score: raw.score ?? 0,
		note: raw.note ?? undefined
	};
}

export interface ReviewNote {
	score: number;
	note: string;
	updatedAt: string;
}

export interface ReviewSummary {
	count: number;
	/** `undefined` kun ei yhtään arvostelua vielä — ei virhetila (ks. types.ts). */
	average?: number;
	/** Avaimet "1".."5" merkkijonoina, ks. types.ts:n RawReviewDistribution-kommentti. */
	distribution: Record<string, number>;
}

export interface ReviewTarget {
	carId: number | null;
	trackId: string | null;
	summary: ReviewSummary;
	notes: ReviewNote[];
}

function mapReviewSummary(raw: RawReviewTargetResponse['summary']): ReviewSummary {
	return {
		count: raw.count,
		average: raw.average ?? undefined,
		distribution: raw.distribution
	};
}

export function mapReviewTarget(raw: RawReviewTargetResponse): ReviewTarget {
	return {
		carId: raw.carId,
		trackId: raw.trackId,
		summary: mapReviewSummary(raw.summary),
		notes: raw.notes
	};
}

export interface ReviewListEntry {
	/** Auton `carId` TAI radan `trackId` riippuen siitä kumpaa listaa tämä rivi edustaa — ks. `mapReviewList`:n `idKey`-parametri. */
	id: number | string;
	summary: ReviewSummary;
}

/**
 * `/reviews/cars`/`/reviews/tracks` -listojen yhteinen muunnin — `idKey`
 * kertoo luetaanko `carId` vai `trackId` kustakin rivistä (API antaa VAIN
 * sen toisen, ei koskaan molempia samassa listassa). Palautetaan Map
 * id:n mukaan, koska kutsuja (esim. autot/+page.server.ts) yhdistää tämän
 * olemassa olevaan auto-/ratalistaan id:n perusteella — VAIN arvostellut
 * kohteet ovat tässä listassa (ks. types.ts), loput näytetään "ei
 * arvosteluja vielä" -tilassa UI:ssa.
 */
export function mapReviewList(raw: RawReviewListResponse, idKey: 'carId' | 'trackId'): Map<number | string, ReviewSummary> {
	const byId = new Map<number | string, ReviewSummary>();
	for (const entry of raw.data) {
		const id = idKey === 'carId' ? entry.carId : entry.trackId;
		if (id === undefined) continue;
		byId.set(id, mapReviewSummary(entry));
	}
	return byId;
}

export interface TrackCarReviewEntry {
	carId: number;
	summary: ReviewSummary;
}

/** `/reviews/track/{trackId}/cars` — radan tarkennussivun "parhaat autot täällä" -listaa varten. */
export function mapTrackCarReviews(raw: RawTrackCarReviewsResponse): TrackCarReviewEntry[] {
	return raw.data
		.filter((entry): entry is RawReviewListEntryWithCarId => entry.carId !== undefined)
		.map((entry) => ({ carId: entry.carId, summary: mapReviewSummary(entry) }));
}

/** Apu-tyyppi `mapTrackCarReviews`:n suodatukselle — sama rivi kuin `RawReviewListEntry`, mutta `carId` on TÄSSÄ taattu läsnäolevaksi suodatuksen jälkeen. */
type RawReviewListEntryWithCarId = RawTrackCarReviewsResponse['data'][number] & { carId: number };
