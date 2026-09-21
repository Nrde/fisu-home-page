/**
 * Kuljettajat-indeksisivu. KEVYT: `organiserSummary` riittää (sama data
 * jota etusivu/kaudet-sivut jo hakevat) — aggregoidaan kuljettajakohtaisesti
 * mapDriverList:llä, ks. sen kommentti mappers.ts:ssä. Sama vastaus
 * antaa myös kausilistan (mapSeasonFilterOptions) kaudittaista
 * pikasuodatinta varten (käyttäjän pyyntö 22.9.2026) — ei tarvitse toista
 * API-kutsua.
 */
import { dev } from '$app/env';
import { ApiError, fetchOrganiserSummary } from '#lib/server/api/client.ts';
import {
	mapDriverList,
	mapSeasonFilterOptions,
	type DriverListEntry,
	type SeasonFilterOption
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

const MOCK_DRIVERS: DriverListEntry[] = [
	{
		driverId: 732,
		name: 'Panu Artimo',
		seasonsCount: 18,
		careerPoints: 612,
		careerRaces: 69,
		careerBestFinish: 7,
		seasonIds: [44, 59, 60, 64, 70, 71, 80, 81, 82, 92, 96, 97, 104, 117, 125, 134, 149, 161]
	},
	{
		driverId: 617,
		name: 'Anssi Hyytiäinen',
		seasonsCount: 6,
		careerPoints: 1204,
		careerRaces: 38,
		careerBestFinish: 1,
		seasonIds: [139, 149, 152, 155, 161, 165]
	},
	{
		driverId: 1023,
		name: 'Ville Lyttinen',
		seasonsCount: 5,
		careerPoints: 980,
		careerRaces: 31,
		careerBestFinish: 1,
		seasonIds: [149, 152, 155, 161, 165]
	},
	{
		driverId: 580,
		name: 'Esa Mikkola',
		seasonsCount: 9,
		careerPoints: 1540,
		careerRaces: 54,
		careerBestFinish: 2,
		seasonIds: [96, 97, 104, 117, 125, 134, 139, 149, 152]
	},
	// Havainnollistaa käyttäjän raportoimaa 22.9.2026-bugia (kuljettaja
	// 1197, nimi näkyi "-":na, paras tulos "PNaN":na) — kehitystilan
	// mock-datassa tämä kuljettaja on TARKOITUKSELLA mukana JO KORJATUSSA
	// muodossa (oikea nimi, kelvollinen paras tulos), koska mock-datan
	// tarkoitus on näyttää miltä sivun PITÄISI näyttää, ei toistaa bugia.
	{
		driverId: 1197,
		name: 'Jere Salonen',
		seasonsCount: 2,
		careerPoints: 84,
		careerRaces: 9,
		careerBestFinish: 12,
		seasonIds: [161, 165]
	}
];

// HUOM: kolme näistä (134, 139, 149) käyttävät TARKOITUKSELLA käyttäjän
// 22.9.2026 antamia "hankalia" nimimuotoja `shortLabel`:n sijaan
// SUORAAN täältä kirjoitettuna (EI ajettu `mapSeasonFilterOptions`:in
// läpi, koska tämä on staattinen mock-taulukko) — arvot on kuitenkin
// laskettu KÄSIN samalla logiikalla jota `deriveSeasonShortLabel`
// mappers.ts:ssä noudattaa, jotta kehitystilan esimerkkidata näyttää
// oikeasti miltä nuo kolme nimimuotoa tuottavat: "FiSU Season 8½" ->
// "S8½", "Season 6: FiSU Sport Trophy (FiST)" -> "S6 Fist" (sulkeissa
// oleva lyhenne voittaa), "Season 6: Niki Lauda Tribute" -> "S6 Niki"
// (alaotsikon ensimmäinen sana).
const MOCK_SEASONS: SeasonFilterOption[] = [
	{ seasonId: 44, seasonName: 'S3 — Alkukausi', shortLabel: 'S3' },
	{ seasonId: 59, seasonName: 'S4 — Talvisarja', shortLabel: 'S4' },
	{ seasonId: 60, seasonName: 'S5 — Kevätkausi', shortLabel: 'S5' },
	{ seasonId: 64, seasonName: 'S6 — Kesäsarja', shortLabel: 'S6' },
	{ seasonId: 70, seasonName: 'S7 — Syyskausi', shortLabel: 'S7' },
	{ seasonId: 71, seasonName: 'S8 — Talvisarja II', shortLabel: 'S8' },
	{ seasonId: 80, seasonName: 'S9 — Kevätsarja', shortLabel: 'S9' },
	{ seasonId: 81, seasonName: 'S10 — Kesäkausi', shortLabel: 'S10' },
	{ seasonId: 82, seasonName: 'S11 — Syyssarja', shortLabel: 'S11' },
	{ seasonId: 92, seasonName: 'S12 — Talvikausi', shortLabel: 'S12' },
	{ seasonId: 96, seasonName: 'S13 — Kevätsarja II', shortLabel: 'S13' },
	{ seasonId: 97, seasonName: 'S14 — Kesäsarja II', shortLabel: 'S14' },
	{ seasonId: 104, seasonName: 'S15 — Syyskausi II', shortLabel: 'S15' },
	{ seasonId: 117, seasonName: 'S16 — Talvisarja III', shortLabel: 'S16' },
	{ seasonId: 125, seasonName: 'S17 — Kevätkausi III', shortLabel: 'S17' },
	{ seasonId: 134, seasonName: 'Season 6: FiSU Sport Trophy (FiST)', shortLabel: 'S6 Fist' },
	{ seasonId: 139, seasonName: 'Season 6: Niki Lauda Tribute', shortLabel: 'S6 Niki' },
	{ seasonId: 149, seasonName: 'FiSU Season 8½', shortLabel: 'S8½' },
	{ seasonId: 152, seasonName: 'S17e — Talvikausi IV', shortLabel: 'S17e' },
	{ seasonId: 155, seasonName: 'S17f — Kevätkausi IV', shortLabel: 'S17f' },
	{ seasonId: 161, seasonName: 'S18 — Jidé Rallye Revival Series', shortLabel: 'S18' },
	{ seasonId: 165, seasonName: 'S19 — Pappa Betalar II', shortLabel: 'S19' }
];

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const summary = await fetchOrganiserSummary(fetch, ORGANISER);
		return { drivers: mapDriverList(summary), seasons: mapSeasonFilterOptions(summary), isMockData: false };
	} catch (error) {
		if (dev) {
			console.warn(
				'[kuljettajat/+page.server.ts] organiserSummary-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.',
				error
			);
			return { drivers: MOCK_DRIVERS, seasons: MOCK_SEASONS, isMockData: true };
		}
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe kuljettajalistan haussa: ${String(error)}`);
	}
};
