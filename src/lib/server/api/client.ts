/**
 * Ohut kääre FISU-API:n ympärille. TÄRKEÄÄ: tämä tiedosto asuu
 * `#lib/server/`-polun alla — SvelteKit estää build-aikana KAIKKI
 * `$lib/server/*`-tiedostojen importit selainpuolen koodista (esim.
 * `.svelte`-komponenteista), joten API-osoite/mahdolliset avaimet
 * eivät voi koskaan päätyä vahingossa selaimeen. Ainoa paikka josta
 * tätä saa kutsua on `+page.server.ts` (tai muu `.server.ts`-tiedosto).
 *
 * TS-huomio: `fetch`-parametri otetaan SISÄÄN eikä käytetä globaalia
 * `fetch`-funktiota suoraan. SvelteKitin oma `load`-funktion `fetch`
 * (ks. +page.server.ts) osaa mm. periä evästeet ja optimoida saman
 * palvelimen sisäiset kutsut — siksi se pitää AINA välittää eteenpäin
 * eikä koskaan käyttää suoraan `globalThis.fetch`ia palvelinkoodissa.
 *
 * KONVENTIO (linjattu käyttäjän kanssa 20.9.2026): KAIKKI backendin
 * vastaukset oletetaan olevan `{ success, data }` -kääreen sisällä —
 * tämä on API:n vakiokonventio, ei endpoint-kohtainen erikoistapaus
 * (yksi API-tsätin esimerkeistä näytti erehdyksessä paljaan taulukon,
 * mutta oikea palvelin käyttää kääre-muotoa myös siellä). Jos joltain
 * endpointilta joskus tulee kääreetön vastaus, se on BACKEND-bugi —
 * `apiFetchEnvelope` heittää tällöin selkeän virheen sen sijaan että
 * UI/consumer-koodi yrittäisi tunnistaa/sietää molempia muotoja. Näin
 * virhe näkyy heti eikä jää piiloon "kestävän" purkulogiikan taakse.
 */
import { dev } from '$app/env';
import { FISU_API_BASE_URL } from '$app/env/private';
import type {
	RawCurrentSeasonResponse,
	RawDriverCareerResponse,
	RawFinishedRaceIdsResponse,
	RawHallOfFameResponse,
	RawOrganiserSummaryResponse,
	RawRaceListResponse,
	RawRaceResultResponse,
	RawStatsCompleteResponse,
	RawStatsResponse,
	RawTrackListResponse
} from './types.ts';

// Muuttuja on määritelty (nimi + oletusarvo) src/env.ts:ssä — ks. sen
// kommentit. SvelteKit 3:n eksplisiittinen env-järjestelmä korvaa tässä
// projektissa vanhan $env/dynamic/private -tuonnin.
const API_BASE_URL = FISU_API_BASE_URL;

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

interface ApiEnvelope<T> {
	success: boolean;
	data: T;
	message?: string;
}

async function apiFetch<T>(fetchFn: typeof fetch, path: string): Promise<T> {
	const url = `${API_BASE_URL}${path}`;

	// HUOM (käyttäjän pyynnöstä 20.9.2026): lokitetaan JOKAINEN API-kutsu
	// VAIN kehitystilassa, jotta terminaalista näkee suoraan mitä
	// endpointtia yritetään tavoittaa ja mitä sieltä oikeasti tuli —
	// ei tarvitse arvailla/debugata pelkän lopullisen virheen perusteella.
	if (dev) {
		console.log(`[api] GET ${url}`);
	}

	const response = await fetchFn(url);

	if (!response.ok) {
		if (dev) {
			const bodyText = await response.text().catch(() => '(vastauksen runkoa ei saatu luettua)');
			console.warn(`[api] ${url} → HTTP ${response.status}\n${bodyText}`);
		}
		throw new ApiError(`API-kutsu epäonnistui: ${path} (HTTP ${response.status})`, response.status);
	}

	const json = (await response.json()) as T;

	if (dev) {
		console.log(`[api] ${url} → 200, vastaus:`, JSON.stringify(json).slice(0, 500));
	}

	return json;
}

/**
 * Hakee `{ success, data }` -kääreen ja palauttaa `data`-kentän sellaisenaan
 * (voi olla `null`, jos endpoint sallii sen — ks. esim. `fetchCurrentSeason`).
 * Jos vastaus ei ole kääre-muodossa lainkaan, tämä on backend-bugi, ei
 * tilanne jota consumer-koodin pitäisi yrittää sietää — heitetään selkeä
 * virhe kiinni jotta se huomataan ja korjataan API:sta.
 */
async function apiFetchEnvelope<T>(fetchFn: typeof fetch, path: string): Promise<T> {
	const raw = await apiFetch<Partial<ApiEnvelope<T>>>(fetchFn, path);

	if (!raw || typeof raw !== 'object' || !('data' in raw)) {
		throw new ApiError(`API-vastaus ei ollut odotetussa { success, data } -kääreessä: ${path} — tämä on backend-bugi.`);
	}

	return raw.data as T;
}

/**
 * Hakee kevyen kausiyhteenvedon organisaatiolle (kaudet + ajajien
 * sijoitukset ja kokonaispisteet, EI kisakohtaisia pisteitä/droppeja —
 * ks. suunnitelman luku 2.0 organiserSummary vs. organiserResults).
 */
export function fetchOrganiserSummary(fetchFn: typeof fetch, organiser: string) {
	return apiFetchEnvelope<RawOrganiserSummaryResponse>(fetchFn, `/results/organiser/${organiser}/summary`);
}

/**
 * Hakee organisaation koko historian kattavat kokonaisluvut ("Yhteisö
 * numeroina" -osio). HUOM: ei /v1-etuliitettä — backend ei käytä
 * polkuversiointia (vahvistettu API-tsätiltä 20.9.2026), joten kaikki
 * tämän tiedoston polut ovat ilman sitä.
 */
export function fetchOrganiserStats(fetchFn: typeof fetch, organiser: string) {
	return apiFetchEnvelope<RawStatsResponse>(fetchFn, `/stats/organiser/${organiser}`);
}

/**
 * Hakee AIDOSTI juuri nyt käynnissä olevan kauden (tietokantakysely,
 * ei arvaus kausilistan järjestyksestä) — vahvistettu 20.9.2026. Toimii
 * vain `organiser === 'fisu'`:lle; muilla nimillä `data` on aina null.
 * `data: null` on normaali vastaus (ei käynnissä olevaa kautta juuri
 * nyt) — EI heitä `ApiError`ia sen takia, HTTP-status on silti 200.
 * HUOM: tämä palauttaa KOKO kääreen (`{ id, name } | null`), ei pelkkää
 * dataa, koska `data: null` on tässä laillinen arvo eikä virhetila
 * (mappers.ts:n `pickDisplaySeasonId` tarkistaa sen erikseen).
 */
export function fetchCurrentSeason(fetchFn: typeof fetch, organiser: string) {
	return apiFetch<RawCurrentSeasonResponse>(fetchFn, `/seasons/${organiser}/current`);
}

/** Hakee kauden kaikki kisat (ajetut ja ajamattomat), ks. types.ts. */
export function fetchSeasonRaces(fetchFn: typeof fetch, seasonId: number) {
	return apiFetchEnvelope<RawRaceListResponse>(fetchFn, `/races/${seasonId}`);
}

/** Hakee kauden AJETTUJEN kisojen id:t (paljas taulukko, ei olioita). */
export function fetchFinishedRaceIds(fetchFn: typeof fetch, seasonId: number) {
	return apiFetchEnvelope<RawFinishedRaceIdsResponse>(fetchFn, `/finishedraces/${seasonId}`);
}

/**
 * Hakee yksittäisen kisan tulokset. HUOM: `RawRaceResultResponse`
 * (types.ts) mallintaa jo itse KOKO `{ success, data }` -kääreen, joten
 * tämä käyttää suoraan `apiFetch`ia eikä `apiFetchEnvelope`-purkajaa —
 * `mapLatestRaceResult` lukee `response.data.drivers` itse.
 */
export function fetchRaceResult(fetchFn: typeof fetch, raceId: number) {
	return apiFetch<RawRaceResultResponse>(fetchFn, `/results/race/${raceId}`);
}

/**
 * Hakee ratatietokannan (kaikki radat kerralla, ei organisaatio- tai
 * kausikohtainen) — käyttäjän liittämä esimerkkidata 21.9.2026,
 * `/radat`-sivua varten. HUOM: EI organiser/season-parametria polussa,
 * sama lista kaikille.
 */
export function fetchTracks(fetchFn: typeof fetch) {
	return apiFetchEnvelope<RawTrackListResponse>(fetchFn, `/tracks`);
}

/**
 * Hakee YHDEN kuljettajan koko uran (kaikki kaudet, kisat, tilastot) —
 * käyttäjän liittämä esimerkkidata 21.9.2026, `/kuljettajat/[driverId]`-
 * sivua varten. HUOM: sama `apiFetch`-suorakäyttö kuin `fetchRaceResult`
 * issa (ei `apiFetchEnvelope`), koska `RawDriverCareerResponse` (types.ts)
 * mallintaa jo itse koko `{ success, data }` -kääreen.
 */
export function fetchDriverCareer(fetchFn: typeof fetch, organiser: string, driverId: number) {
	return apiFetch<RawDriverCareerResponse>(fetchFn, `/drivers/${organiser}/${driverId}/career`);
}

/**
 * Hakee yhteisön vertailustatsit (leaderboardit, ratakohtainen käyttö,
 * kausitrendit) yhdellä raskaalla mutta pitkään cachetulla kutsulla —
 * UUSI endpoint, käyttäjän liittämä API-kenttäkartta 22.9.2026,
 * `/tilastot`-sivua varten. HUOM: backendin oma huomautus — ENSIMMÄINEN
 * kutsu tuotannossa deployn jälkeen voi olla hidas tai antaa
 * puutteellista dataa kunnes cache lämpenee (ks. types.ts:n kommentti).
 */
export function fetchStatsComplete(fetchFn: typeof fetch, organiser: string) {
	return apiFetchEnvelope<RawStatsCompleteResponse>(fetchFn, `/stats/organiser/${organiser}/complete`);
}

/**
 * Hakee Hall of Fame -listan (ylläpidon käsin kirjoittama sisältö +
 * elävät uratilastot samasta funktiosta kuin kuljettajaprofiili) —
 * UUSI endpoint, API-kenttäkartta 22.9.2026, `/hall-of-fame`-sivua
 * varten. Backendin dokumentoima käytös: yksittäisen kuljettajan
 * statshaun kaatuminen ei kaada koko listaa — ko. rivi tulee mukaan
 * `driverName: null, stats: null, statsError: true` (ks. types.ts:n
 * RawHallOfFameEntry-kommentti).
 *
 * HUOM (päivitetty 22.9.2026, `intro`-kenttä lisätty): tämä käyttää
 * suoraa `apiFetch`ia (SAMA periaate kuin `fetchDriverCareer`/
 * `fetchRaceResult`issa), EI `apiFetchEnvelope`ia — `intro` on `data`:n
 * SISARUSKENTTÄ vastauksen juuressa, ei sen sisällä, joten
 * `apiFetchEnvelope` (joka purkaisi vain `.data`:n ja hukkaisi
 * `intro`:n) ei riitä tähän. mappers.ts:n `mapHallOfFame` lukee
 * `response.intro`/`response.data` itse.
 */
export function fetchHallOfFame(fetchFn: typeof fetch, organiser: string) {
	return apiFetch<RawHallOfFameResponse>(fetchFn, `/halloffame/${organiser}`);
}
