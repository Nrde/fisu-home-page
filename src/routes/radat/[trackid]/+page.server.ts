/**
 * Yksittäisen radan tarkennussivu. Kaksi osaa:
 *
 * 1) Itse ratatiedot — haetaan KOKO `/tracks`-lista ja etsitään
 *    `params.trackid`:tä vastaava (ei tiedossa olevaa "yhden radan"
 *    endpointia, ks. client.ts:n fetchTracks-kommentti).
 *
 * 2) FISU:n oma kisahistoria tällä radalla — RASKAS mutta nyt TARKKA
 *    ratkaisu: haetaan ORGANISAATION KAIKKI kaudet (`organiserSummary`,
 *    1 kutsu) ja sen jälkeen JOKAISEN kauden kisalista erikseen
 *    (`/races/{season}`, N kutsua — yksi per kausi), ja täsmäytetään
 *    radan `trackId` kisalistan `trackId`-kenttään (ks. mappers.ts:n
 *    `matchTrackRaceHistory`). PÄIVITYS (22.9.2026): aiempi (21.9.2026)
 *    NIMEEN perustuva sallittu täsmäytys on korvattu tarkalla id-
 *    vertailulla nyt kun backend antaa `trackId`:n — itse N+1-
 *    hakukuvio (yksi kutsu per kausi) EI muuttunut, vain täsmäytystapa.
 *    Tehdään TARKOITUKSELLA vain tällä yksittäisen radan sivulla, ei
 *    radat-indeksissä, koska N+1 kutsua on liikaa listasivulle mutta
 *    hyväksyttävä yhdelle tarkennussivulle.
 */
import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { ApiError, fetchOrganiserSummary, fetchSeasonRaces, fetchTracks } from '#lib/server/api/client.ts';
import { mapTracks, matchTrackRaceHistory, type Track, type TrackRaceHistoryEntry } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO (sama huomio kuin +page.server.ts:ssä): organisaation tunnus on
// kovakoodattu koska sivusto näyttää vain FISUn dataa.
const ORGANISER = 'fisu';

const MOCK_TRACK: Track = {
	id: 'ahvenisto',
	name: 'Ahvenisto Race Circuit',
	location: 'Hämeenlinna, Suomi',
	length: '2.840km',
	turns: 10,
	elevation: '32m',
	built: '1967',
	lapRecord: '1:28,533 (2017)',
	lapRecordDriver: 'Mathias Hertén',
	lapRecordCar: 'Legends Ford -34 Sedan',
	info: 'Suomen vanhin ja ehkäpä legendaarisin moottorirata joka tunnetaan erittäin teknisenä ja haastavana ratana joka vaatii kuljettajilta kunnioitusta.',
	// Sama trackid+".svg"-konventio-arvaus kuin radat/+page.server.ts:n MOCK_TRACKS:ssä.
	imageUrl: 'https://simu.fi/images/tracks/ahvenisto.svg'
};

const MOCK_RACE_HISTORY: TrackRaceHistoryEntry[] = [
	{ seasonId: 161, seasonName: 'S18 — Jidé Rallye Revival Series', raceId: 878, date: new Date('2026-08-30T17:00:00Z') }
];

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const tracks = mapTracks(await fetchTracks(fetch));
		const track = tracks.find((t) => t.id === params.trackid);
		if (!track) {
			throw error(404, `Rataa "${params.trackid}" ei löytynyt.`);
		}

		// Kisahistoria on "parasta yritystä" -lisätieto — jos SEN haku
		// epäonnistuu, näytetään silti itse ratatiedot tyhjällä
		// historialla sen sijaan että koko sivu kaatuisi.
		let raceHistory: TrackRaceHistoryEntry[] = [];
		try {
			const summary = await fetchOrganiserSummary(fetch, ORGANISER);
			const seasonRaceLists = await Promise.all(
				summary.map(async (season) => ({
					seasonId: season.seasonId,
					seasonName: season.seasonName,
					races: await fetchSeasonRaces(fetch, season.seasonId)
				}))
			);
			raceHistory = matchTrackRaceHistory(track.id, seasonRaceLists);
		} catch (historyError) {
			if (dev) {
				console.warn(
					`[radat/[trackid]/+page.server.ts] Kisahistorian haku epäonnistui, näytetään silti ratatiedot.`,
					historyError
				);
			}
		}

		return { track, raceHistory, isMockData: false };
	} catch (err) {
		// HUOM: 404 (yllä heitetty `error(404, ...)`) pitää päästää LÄPI
		// sellaisenaan sekä kehitys- että tuotantotilassa — se EI ole
		// API-virhe jota mock-data korjaisi, vaan oikea "sivua ei ole".
		// TÄRKEÄÄ: pelkkä `'status' in err` EI riitä tunnistamaan sitä,
		// koska myös `ApiError` (esim. tämän hiekkalaatikon 403-vastaus
		// verkon allowlistiltä) kantaa julkista `status`-kenttää — se
		// pitää siis sulkea pois erikseen, tai muuten oikea API-virhe
		// heitetään tässä eteenpäin ennen kuin kehitystilan mock-data
		// ehtii ottaa sen kiinni.
		if (!(err instanceof ApiError) && err && typeof err === 'object' && 'status' in err) throw err;

		if (dev) {
			console.warn(
				`[radat/[trackid]/+page.server.ts] /tracks-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.`,
				err
			);
			if (params.trackid !== MOCK_TRACK.id) {
				throw error(404, `Rataa "${params.trackid}" ei löytynyt (kehitystilan esimerkkidatassa on vain "${MOCK_TRACK.id}").`);
			}
			return { track: MOCK_TRACK, raceHistory: MOCK_RACE_HISTORY, isMockData: true };
		}
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe radan haussa: ${String(err)}`);
	}
};
