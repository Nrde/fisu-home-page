/**
 * Muuntaa raa'an API-vastauksen (types.ts) siihen muotoon jota
 * komponentit jo odottavat propseinaan (ks. DriverCard.svelte).
 * Tämä on AINOA paikka jossa raakakenttänimet (`pos`, `pts`, ...) ja
 * komponenttien propsit (`position`, `points`, ...) kohtaavat — jos
 * backend joskus vaihtaa kenttänimiä tai koko endpointin muodon, vain
 * tätä tiedostoa (ja types.ts:ää) pitää korjata. +page.server.ts ja
 * komponentit eivät tiedä mitään raakamuodosta.
 */
import { parseHelsinkiDateTime } from '#lib/utils/helsinkiTime.ts';
import type {
	RawCurrentSeasonResponse,
	RawDriverCareerRace,
	RawDriverCareerResponse,
	RawDriverCareerStats,
	RawHallOfFameEntry,
	RawHallOfFameResponse,
	RawLeaderboardEntry,
	RawOrganiserSummaryResponse,
	RawRaceListEntry,
	RawRaceListResponse,
	RawRaceResultDriver,
	RawRaceResultResponse,
	RawSeasonSummary,
	RawStatsCompleteResponse,
	RawStatsResponse,
	RawTrack,
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
 */
function computeDisplayPositions<T extends { position: number }>(
	items: T[]
): (T & WithDisplayPosition)[] {
	return items.map((item, index) => ({
		...item,
		displayPosition: index > 0 && items[index - 1].position === item.position ? '=' : String(item.position)
	}));
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
 */
function normalizeDriverRow(
	driverKey: string,
	raw: RawRaceResultDriver
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
		dnf: normalizeDnf(raw)
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
 */
function normalizePositionChange(raw: RawRaceResultDriver): number | undefined {
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

export function mapLatestRaceResult(raceId: number, response: RawRaceResultResponse): LatestRaceResult {
	const results = Object.entries(response.data.drivers)
		.map(([driverKey, raw]) => normalizeDriverRow(driverKey, raw))
		.filter((entry): entry is Omit<RaceResultEntry, 'displayPosition'> => entry !== undefined)
		.sort((a, b) => a.position - b.position);

	return {
		raceId,
		trackName: response.data.racename,
		trackId: response.data.trackId ?? undefined,
		seasonName: response.data.seasonname,
		results: computeDisplayPositions(results)
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
	 * URL` + `RawTrack.trackimage`:sta. `undefined` jos backend ei anna
	 * `trackimage`:a tälle radalle (ei kaikilla radoilla, ei bugi) —
	 * UI:n pitää näyttää kuva ehdollisesti, ei olettaa sitä aina läsnä
	 * olevaksi.
	 */
	imageUrl?: string;
}

/**
 * Käyttäjän vahvistama base-URL (22.9.2026) rataprofiilien SVG-kartoille
 * — ERI ISÄNTÄ kuin `api2.simu.fi` (pelkkä `simu.fi`), joten näitä EI
 * haeta tämän API-kääreen kautta vaan suoraan selaimesta `<img>`-tagilla
 * (ks. radat/[trackid]/+page.svelte). Ei siis tarvetta network-
 * allowlistille palvelinpuolella.
 */
const TRACK_IMAGE_BASE_URL = 'https://simu.fi/images/tracks/';

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
	/** Kauden sarjajohtaja (pos 1) — `undefined` vain jos kaudella ei poikkeuksellisesti ole yhtään kuljettajaa. */
	leaderName?: string;
	leaderPoints?: number;
}

/**
 * `/kaudet`-indeksisivun listaus — KEVYT (ei kisalistaa/kisahaku per
 * kausi, vain `organiserSummary`, joka on jo haettava joka tapauksessa
 * yksittäisen kauden sivullakin). Uusin kausi ensin: sama seasonId-
 * suuruusheuristiikka kuin `pickDisplaySeasonId`:ssä (ks. sen kommentti
 * ja sama varaus — ei koodin takaama, mutta paras saatavilla oleva).
 */
export function mapSeasonList(summary: RawOrganiserSummaryResponse): SeasonListEntry[] {
	return summary
		.map((season) => {
			const leader = [...season.drivers].sort((a, b) => a.pos - b.pos)[0];
			return {
				id: season.seasonId,
				name: season.seasonName,
				driversCount: season.drivers.length,
				leaderName: leader?.name,
				leaderPoints: leader?.pts
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
}

/**
 * Kauden koko kisalista tilamerkinnällä (ajettu/tuleva) — kausisivun
 * "Kilpailut"-osiota varten. HUOM: EI lajitella uudelleen — pidetään
 * API:n oma järjestys (jota `mapUpcomingRace`/`raceNumber` jo olettavat
 * kronologiseksi, ks. niiden kommentit), jotta kierrosnumerointi pysyy
 * yhdenmukaisena koko sivustolla.
 */
export function mapSeasonRaceList(
	races: RawRaceListResponse,
	finishedRaceIds: Set<number>
): SeasonRaceListEntry[] {
	return races.map((race, index) => ({
		raceId: race.id,
		raceNumber: index + 1,
		trackName: race.track,
		trackId: race.trackId ?? undefined,
		date: parseHelsinkiDateTime(race.date, race.time),
		finished: finishedRaceIds.has(race.id)
	}));
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
		dnf: raw.dnf
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
