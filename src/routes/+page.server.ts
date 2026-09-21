/**
 * Etusivun data. TILANNE (20.9.2026): KAIKKI NELJÄ osiota hakevat nyt
 * oikeasti API:sta — "Sarjataulukko", "Yhteisö numeroina", "Tuleva
 * kilpailu" ja "Viimeisimmät tulokset". Kaikki raakamuodot on
 * vahvistettu API-tsätin kanssa (ks. `types.ts`/`mappers.ts`:n
 * kommentit) paitsi muutama nimenomaisesti merkitty ARVAUS (kierros-
 * numero, kausi- ja kisajärjestykset) joita ei ole koodin puolesta
 * taattu — nämä ovat kuitenkin parhaita saatavilla olevia tulkintoja,
 * eivät sokkoarvauksia.
 *
 * Haku etenee kahdessa aallossa koska toinen aalto tarvitsee ensimmäisen
 * tuloksia (mikä kausi näytetään): 1) organiserSummary + stats +
 * "käynnissä oleva kausi" rinnakkain, 2) sen kauden kisalista +
 * ajettujen kisojen id:t rinnakkain, 3) tarvittaessa vielä viimeisimmän
 * ajetun kisan tulokset. KAIKKI tämä on saman try/catchin sisällä: jos
 * MIKÄ TAHANSA osa epäonnistuu, koko sivu putoaa esimerkkidataan (vain
 * kehitystilassa) — yksinkertaisempi ja johdonmukaisempi kuin osioiden
 * erillinen virhekäsittely, hyväksytty tietoinen yksinkertaistus.
 */
// HUOM: $app/environment on tässä SvelteKit-versiossa (3 RC) merkitty
// vanhentuneeksi `$app/env`:n hyväksi — sama `dev`-lippu löytyy sieltä.
import { dev } from '$app/env';
import {
	ApiError,
	fetchCurrentSeason,
	fetchFinishedRaceIds,
	fetchOrganiserStats,
	fetchOrganiserSummary,
	fetchRaceResult,
	fetchSeasonRaces
} from '#lib/server/api/client.ts';
import {
	mapCommunityStats,
	mapCurrentSeason,
	mapLatestRaceResult,
	mapUpcomingRace,
	pickDisplaySeasonId,
	pickLatestFinishedRaceId,
	type CommunityStat,
	type CurrentSeason,
	type LatestRaceResult,
	type UpcomingRace
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO organisaation tunnus on kovakoodattu tässä koska sivusto näyttää
// vain FISUn omaa dataa — jos joskus tarvitaan useampi organisaatio
// samalta sivustolta, tämä siirtyy esim. reitin parametriksi. HUOM:
// `/seasons/{organiser}/current` toimii JUURI NYT vain 'fisu':lle
// (vahvistettu API-tsätiltä) — jos organisaatio joskus muuttuu
// parametriksi, tämä rajoitus on hyvä pitää mielessä.
const ORGANISER = 'fisu';

const MOCK_CURRENT_SEASON: CurrentSeason = {
	id: 161,
	name: 'S18 — Jidé Rallye Revival Series',
	// HUOM (21.9.2026): MOCK_UPCOMING_RACE.raceNumber on 7 (seuraava,
	// AJAMATON kisa) — kaudella on siis tähän mennessä ajettu 6 kisaa,
	// sama luku kuin alla olevien kuljettajien racesCount:in YLÄRAJA
	// (kukaan ei voi olla ajanut enempää kuin kauden ajetut kisat).
	totalRaces: 6,
	standings: [
		{
			driverId: 1,
			displayPosition: '1',
			position: 1,
			name: 'Anssi Hyytiäinen',
			points: 362,
			bestFinish: 1,
			racesCount: 6
		},
		// Tasapeli demonstroitu tarkoituksella (2. ja 3. sija) — ks.
		// mappers.ts:n computeDisplayPositions ja käyttäjän palaute 20.9.2026.
		{
			driverId: 2,
			displayPosition: '2',
			position: 2,
			name: 'Ville Lyttinen',
			points: 341,
			bestFinish: 2,
			racesCount: 6
		},
		{
			driverId: 3,
			displayPosition: '=',
			position: 2,
			name: 'Simo Holm',
			points: 341,
			bestFinish: 4,
			racesCount: 5
		},
		{ driverId: 4, displayPosition: '4', position: 4, name: 'Matti Meikäläinen', points: 276, racesCount: 6 },
		{ driverId: 5, displayPosition: '5', position: 5, name: 'Jari Järvinen', points: 251, racesCount: 4 },
		// HUOM: tarkoituksella IHAN yksi kilpailu, testaa "1 kilpailu"
		// (ei "1 kilpailua") -yksikkömuodon, ks. DriverCard.svelte.
		{ driverId: 6, displayPosition: '6', position: 6, name: 'Pekka Peltola', points: 233, racesCount: 1 }
	]
};

const MOCK_COMMUNITY_STATS: CommunityStat[] = [
	{ value: 1847, label: 'Ajettua kilpailua' },
	{ value: 23, label: 'Kautta vuodesta 2019' },
	{ value: 32406, label: 'Ajettua kierrosta' },
	{ value: 214, label: 'Kuljettajaa' },
	{ value: 3, label: 'Simulaattoria käytössä', context: 'AC, ACC, ACEVO' }
];

const MOCK_UPCOMING_RACE: UpcomingRace = {
	raceId: 879,
	trackName: 'Rally de Finlande — Ouninpohja',
	// Muutaman päivän päähän NYT-hetkestä, jotta laskuri näyttää järkeviä
	// arvoja demoympäristössä eikä mene suoraan menneisyyteen.
	date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4 + 1000 * 60 * 60 * 3),
	raceNumber: 7
};

const MOCK_LATEST_RACE_RESULT: LatestRaceResult = {
	raceId: 878,
	trackName: 'Ruuhimäki',
	seasonName: 'S18 — Jidé Rallye Revival Series',
	results: [
		{
			driverId: 2,
			displayPosition: '1',
			position: 1,
			name: 'Ville Lyttinen',
			bestLapTime: '1:27.480',
			fastestLap: false,
			positionChange: 1,
			dnf: false
		},
		{
			driverId: 1,
			displayPosition: '2',
			position: 2,
			name: 'Anssi Hyytiäinen',
			gapDisplay: '+20.857',
			bestLapTime: '1:27.670',
			fastestLap: true,
			positionChange: -1,
			dnf: false
		},
		{
			driverId: 3,
			displayPosition: '3',
			position: 3,
			name: 'Simo Holm',
			gapDisplay: '+1:13.018',
			bestLapTime: '1:28.746',
			fastestLap: false,
			positionChange: 0,
			dnf: false
		},
		{
			driverId: 5,
			displayPosition: '4',
			position: 4,
			name: 'Jari Järvinen',
			gapDisplay: '+1 kierros',
			bestLapTime: '1:29.205',
			fastestLap: false,
			positionChange: 3,
			dnf: false
		},
		{
			driverId: 6,
			displayPosition: '5',
			position: 5,
			name: 'Pekka Peltola',
			gapDisplay: '+2 kierrosta',
			bestLapTime: '1:31.092',
			fastestLap: false,
			positionChange: -2,
			dnf: false
		},
		{
			driverId: 7,
			displayPosition: '6',
			position: 6,
			name: 'Tapio Töysä',
			gapDisplay: '+2 kierrosta',
			bestLapTime: '1:31.092',
			fastestLap: false,
			positionChange: 0,
			dnf: false
		},
		// HUOM (laajennettu 21.9.2026 käyttäjän oikean tuotantodatan
		// mukaiseksi, ks. käyttäjän kuvakaappaus samalta päivältä):
		// pisin odotettavissa oleva nimi ("Lucky like Fauntleroy") +
		// isoja kierroseroja pitää MYÖS kehitystilan esimerkkidatassa
		// jotta ListRow'n rivitys-/leveyskorjaukset pysyvät testattuina
		// jatkossakin, ei vain kertaluontoisena tarkistuksena.
		{
			driverId: 8,
			displayPosition: '7',
			position: 7,
			name: 'Lucky like Fauntleroy',
			gapDisplay: '+3 kierrosta',
			bestLapTime: '1:31.263',
			fastestLap: false,
			positionChange: 2,
			dnf: false
		},
		{
			driverId: 9,
			displayPosition: '8',
			position: 8,
			name: 'Sami Rantamäki',
			gapDisplay: '+4 kierrosta',
			bestLapTime: '1:30.210',
			fastestLap: false,
			positionChange: -4,
			dnf: false
		},
		{
			driverId: 10,
			displayPosition: '9',
			position: 9,
			name: 'Joni Vähäkuopus',
			gapDisplay: '+25 kierrosta',
			bestLapTime: undefined,
			fastestLap: false,
			positionChange: undefined,
			dnf: true
		},
		{
			driverId: 11,
			displayPosition: '10',
			position: 10,
			name: 'Ilari Siltanen',
			gapDisplay: '+32 kierrosta',
			bestLapTime: '1:30.126',
			fastestLap: false,
			positionChange: 5,
			dnf: false
		},
		{
			driverId: 12,
			displayPosition: '11',
			position: 11,
			name: 'Issias',
			gapDisplay: '+44 kierrosta',
			bestLapTime: '1:31.055',
			fastestLap: false,
			positionChange: -4,
			dnf: false
		}
	]
};

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Aalto 1: mitä kautta näytetään ja sen sarjataulukko/yhteisöluvut.
		const [summary, stats, currentSeasonInfo] = await Promise.all([
			fetchOrganiserSummary(fetch, ORGANISER),
			fetchOrganiserStats(fetch, ORGANISER),
			fetchCurrentSeason(fetch, ORGANISER)
		]);

		const seasonId = pickDisplaySeasonId(summary, currentSeasonInfo);
		const currentSeason = mapCurrentSeason(summary, seasonId);
		if (!currentSeason) {
			// Diagnostiikka mukaan virheviestiin (näkyy console.warnissa alla
			// dev-tilassa) — kertoo SUORAAN oliko ongelma tyhjä summary,
			// current-season-haku, vai ettei seasonId täsmännyt mihinkään
			// summaryn kauteen, sen sijaan että pitäisi arvata.
			throw new ApiError(
				`organiserSummary ei sisältänyt yhtään kautta. Diagnostiikka: ` +
					`summary.length=${summary.length}, ` +
					`summary-kausien id:t=[${summary.map((s) => s.seasonId).join(', ')}], ` +
					`currentSeasonInfo.data=${JSON.stringify(currentSeasonInfo.data)}, ` +
					`valittu seasonId=${seasonId}`
			);
		}

		// Aalto 2: näytettävän kauden kisalista + ajetut kisat.
		const [races, finishedRaceIds] = await Promise.all([
			fetchSeasonRaces(fetch, currentSeason.id),
			fetchFinishedRaceIds(fetch, currentSeason.id)
		]);

		const upcomingRace = mapUpcomingRace(races, new Set(finishedRaceIds));

		// Aalto 3: viimeisimmän ajetun kisan tulokset, jos kaudella on
		// ajettu yhtään kisaa (uuden kauden alussa ei välttämättä ole).
		const latestFinishedRaceId = pickLatestFinishedRaceId(finishedRaceIds);
		const latestRaceResult = latestFinishedRaceId
			? mapLatestRaceResult(latestFinishedRaceId, await fetchRaceResult(fetch, latestFinishedRaceId))
			: undefined;

		return {
			// `totalRaces` liitetään tässä (ei mapCurrentSeason:ssa, ks. sen
			// kommentti CurrentSeason-tyypissä) — `finishedRaceIds.length` on
			// jo haettu Aalto 2:ssa upcomingRacea varten, joten tämä on
			// ILMAINEN, ei uusi API-kutsu.
			currentSeason: { ...currentSeason, totalRaces: finishedRaceIds.length },
			communityStats: mapCommunityStats(stats),
			upcomingRace,
			latestRaceResult,
			isMockData: false
		};
	} catch (error) {
		// HUOM: mock-data palautetaan VAIN kehitystilassa (`dev` tulee
		// $app/envistä, true vain `vite dev`:in alla). Tuotannossa virhe
		// heitetään eteenpäin ja SvelteKitin virhesivu näyttää sen oikeasti
		// — emme halua koskaan HILJAA näyttää esimerkkidataa tuotannossa,
		// koska se näyttäisi siltä että kaikki toimii vaikka API olisi
		// oikeasti poikki.
		//
		// Tämä haara laukeaa TÄLLÄ HETKELLÄ AINA tässä hiekkalaatikossa,
		// koska ulospäin suuntautuvat verkkoyhteydet on rajattu eikä
		// api2.simu.fi ole sallittujen osoitteiden listalla — en siis ole
		// voinut oikeasti testata tätä oikeaa APIa vasten. Testaa tämä
		// ympäristössä jossa API on oikeasti tavoitettavissa.
		if (dev) {
			console.warn(
				'[+page.server.ts] etusivun API-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.',
				error
			);
			return {
				currentSeason: MOCK_CURRENT_SEASON,
				communityStats: MOCK_COMMUNITY_STATS,
				upcomingRace: MOCK_UPCOMING_RACE,
				latestRaceResult: MOCK_LATEST_RACE_RESULT,
				isMockData: true
			};
		}

		throw error;
	}
};
