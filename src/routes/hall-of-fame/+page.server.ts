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
import { error } from '@sveltejs/kit';
import { ApiError, fetchHallOfFame } from '#lib/server/api/client.ts';
import { mapHallOfFame, type HallOfFamePage } from '#lib/server/api/mappers.ts';

const ORGANISER = 'fisu';

export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	try {
		const response = await fetchHallOfFame(fetch, ORGANISER);
		const page: HallOfFamePage = mapHallOfFame(response);
		return { ...page };
	} catch (err) {
		// KORJAUS 15.10.2026: ks. `/+page.server.ts`:n kommentti — `ApiError`
		// pitää kääriä SvelteKitin `error()`-apuriin, muuten se näkyy aina
		// geneerisenä 500:na oikean statuksen sijaan.
		if (err instanceof ApiError) throw error(err.status ?? 500, err.message);
		throw error(500, `Odottamaton virhe Hall of Fame -listan haussa: ${String(err)}`);
	}
};
