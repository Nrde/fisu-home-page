/**
 * Hall of Fame -sivu.
 *
 * PÄIVITYS (22.9.2026, API-kenttäkartta): backendiin on nyt valmis
 * `GET /halloffame/{organiser}`-endpoint (ei vielä tuotannossa) joka
 * palauttaa YHDELLÄ kutsulla sekä ylläpidon käsin kirjoittaman
 * editoriaalisen sisällön (tagline/quote/firstSeason) ETTÄ elävät
 * uratilastot SAMASTA funktiosta kuin kuljettajan profiilisivu
 * (`SeasonService::getDriverCareerStats()`) — ei siis enää tarvitse
 * (eikä pidäkään) tehdä erillistä `fetchDriverCareer`-kutsua per
 * kuljettaja niin kuin edellisessä versiossa, jossa tätä endpointtia
 * ei vielä ollut olemassa.
 *
 * `statsError`-kenttä: jos YHDEN kuljettajan statshaku epäonnistuu
 * palvelimella (esim. simracing.fi hetkellisesti poissa), backend
 * palauttaa silti koko listan — kyseisellä rivillä `driverName: null,
 * stats: null, statsError: true`. `mapHallOfFameEntry` (mappers.ts)
 * välittää tämän `undefined`:na eteenpäin, ja +page.svelte päättää
 * miten kortti näytetään ilman nimeä/lukemia.
 *
 * PÄIVITYS (22.9.2026, `intro`-kenttä): sivun johdantoteksti tulee nyt
 * API:sta (`hall_of_fame_intro`-taulu, ylläpidon muokattavissa) sen
 * sijaan että se olisi kovakoodattu +page.svelte:en — käyttäjän oma
 * huomio: "ei mainintaa mistä data tulee, mutta pitäisikö johdantokin
 * tulla API:sta... lisään sen apiin". `mapHallOfFame` (mappers.ts)
 * purkaa KOKO vastauksen (`intro` + `data`) yhdellä kertaa, ei enää
 * `mapHallOfFameList`:ä suoraan.
 */
import { dev } from '$app/env';
import { ApiError, fetchHallOfFame } from '#lib/server/api/client.ts';
import { mapHallOfFame, type HallOfFamePage } from '#lib/server/api/mappers.ts';
import type { RawHallOfFameResponse } from '#lib/server/api/types.ts';

const ORGANISER = 'fisu';

// Kehitystilan varadata — käyttäjän pyytämät neljä esimerkkinimeä
// 22.9.2026, nyt API:n VAHVISTAMASSA raakamuodossa (KOKO
// RawHallOfFameResponse, `intro` mukaan lukien) jotta sama
// `mapHallOfFame`-muunnin ajaa myös tämän läpi täsmälleen samalla
// logiikalla kuin oikean API-vastauksen — ei erillistä jo-muunnettua
// mock-dataa joka voisi hiljalleen eriytyä oikeasta muotoilulogiikasta.
// `intro`-teksti on käyttäjän valitsema vaihtoehto A (22.9.2026):
// kevyt "iso kala" -vitsi joka toimii myös ilman FISU/kala-yhteyden
// huomaamista, koska "isompi kala" on tavallinen suomen idiomi.
const MOCK_HALL_OF_FAME: RawHallOfFameResponse = {
	success: true,
	intro:
		'Tälle listalle ei pääse ihan kuka tahansa. Hall of Fame kokoaa yhteen kuljettajat, jotka ovat nousseet FISU:n kärkeen kauden toisensa jälkeen — muutama isompi kala muiden joukossa.',
	data: [
		{
			driverId: 845,
			driverName: 'Dani Korpi',
			tagline: 'Sarjan pitkäaikaisin tasaisen varma mies',
			quote:
				'”En mä ikinä ajanut nopeinta kierrosta, mutta olin lähes aina maalissa. Sillä pärjää pitkässä juoksussa yllättävän hyvin.”',
			firstSeason: 'Season 3 (2015)',
			stats: {
				racesEntered: 132,
				bestResult: 1,
				wins: 18,
				winPct: 13.6,
				podiums: 54,
				podiumPct: 40.9,
				poles: 9,
				polePct: 6.8,
				racesWithKnownGrid: 130,
				fastestLaps: 12,
				fastestLapPct: 9.1,
				dnfs: 3,
				dnfPct: 2.3,
				averagePosition: 4.8
			},
			statsError: false
		},
		{
			driverId: 910,
			driverName: 'lipi',
			tagline: 'Yhteisön suosikki ja aina lähtöruudun rohkein veto',
			quote:
				'”Mä ajan aina niin kuin viimeisellä kierroksella olisi vielä jotain haettavana. Joskus se kostautuu, mutta useimmiten ei.”',
			firstSeason: 'Season 9 (2021)',
			stats: {
				racesEntered: 58,
				bestResult: 1,
				wins: 9,
				winPct: 15.5,
				podiums: 21,
				podiumPct: 36.2,
				poles: 6,
				polePct: 10.3,
				racesWithKnownGrid: 55,
				fastestLaps: 14,
				fastestLapPct: 24.1,
				dnfs: 11,
				dnfPct: 19,
				averagePosition: 8.2
			},
			statsError: false
		},
		{
			driverId: 1055,
			driverName: 'Heikki Mehtänen',
			tagline: 'Debyyttikauden yllättäjä, joka jäi taloksi',
			quote:
				'”Ensimmäinen kauteni piti olla vain kokeilu kaverin porukassa. Nyt tässä ollaan monta vuotta myöhemmin.”',
			firstSeason: 'Season 10 (2021)',
			stats: {
				racesEntered: 46,
				bestResult: 1,
				wins: 2,
				winPct: 4.3,
				podiums: 9,
				podiumPct: 19.6,
				poles: 1,
				polePct: 2.2,
				racesWithKnownGrid: 44,
				fastestLaps: 3,
				fastestLapPct: 6.5,
				dnfs: 5,
				dnfPct: 10.9,
				averagePosition: 10.4
			},
			statsError: false
		},
		{
			driverId: 1240,
			driverName: 'Matias Vitikainen',
			tagline: 'Teknisten ratojen mestari',
			quote:
				'”Kapeat, mutkaiset radat ovat mun juttu — siellä ajotaidolla saa enemmän irti kuin suoralla vauhdilla.”',
			firstSeason: 'Season 7 (2019)',
			stats: {
				racesEntered: 63,
				bestResult: 1,
				wins: 5,
				winPct: 7.9,
				podiums: 17,
				podiumPct: 27,
				poles: 7,
				polePct: 11.1,
				racesWithKnownGrid: 61,
				fastestLaps: 8,
				fastestLapPct: 12.7,
				dnfs: 6,
				dnfPct: 9.5,
				averagePosition: 9.1
			},
			statsError: false
		}
	]
};

export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	try {
		const response = await fetchHallOfFame(fetch, ORGANISER);
		const page: HallOfFamePage = mapHallOfFame(response);
		return { ...page, isMockData: false };
	} catch (error) {
		if (dev) {
			console.warn(
				'[hall-of-fame/+page.server.ts] halloffame-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.',
				error
			);
			const page: HallOfFamePage = mapHallOfFame(MOCK_HALL_OF_FAME);
			return { ...page, isMockData: true };
		}
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe Hall of Fame -listan haussa: ${String(error)}`);
	}
};
