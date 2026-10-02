/**
 * Arvostelujen kirjautumis- ja lähetyssivu — UUSI 2.10.2026, käyttäjän
 * pyyntö. "Kevyt suojaus, ei oikea kirjautuminen" (API-REFERENCE.md:n oma
 * sanamuoto): kuljettaja syöttää SteamID64:n + jaetun Discord-salasanan,
 * saa takaisin 6h voimassa olevan tokenin + listan asioista joita hän on
 * oikeasti ajanut (ja siis saa arvostella) + hänen omat aiemmat
 * arvostelunsa esitäyttöä varten.
 *
 * TIETOISESTI EI mitään palvelinpuolen istuntoa/evästettä — token ja koko
 * "mitä saan arvostella" -lista pidetään VAIN selaimen muistissa
 * (+page.svelte:n `$state`), koska API:lla EI ole erillistä "päivitä
 * istunto pelkällä tokenilla" -endpointia: AINOA tapa saada cars/tracks/
 * combos/myReviews-lista on `/reviews/me`, joka vaatii salasanan joka
 * kerta. Sivun päivitys tyhjentäisi siis joka tapauksessa näkyvän listan
 * ja vaatisi uudelleenkirjautumisen vaikka token olisi evästeessä —
 * eväste ei siis toisi mitään oikeaa hyötyä tässä, vain valheellisen
 * tunteen "pysyvästä" kirjautumisesta. Tämä sopii yhteen API:n oman
 * "kevyt suojaus" -luonnehdinnan kanssa, ei ole tarkoitus rakentaa
 * täyttä istunnonhallintaa jaetulle Discord-salasanalle.
 */
import { fail } from '@sveltejs/kit';
import { postReview, postReviewLogin } from '#lib/server/api/client.ts';
import { mapReviewLogin, mapSubmitReview } from '#lib/server/api/mappers.ts';
import type { Config } from '@sveltejs/adapter-vercel';
import type { Actions } from './$types';

/**
 * UUSI 2.10.2026 — API-tiimin diagnoosi: kuljettajan ENSIMMÄINEN
 * `/reviews/me`-kirjautuminen joutuu kävelemään koko hänen urahistoriansa
 * läpi jos välimuisti on kylmä, ja voi kestää kymmeniä sekunteja (ylärajana
 * backendin oma `set_time_limit(120)`). TÄMÄ reitti ajetaan Vercelin
 * serverless-funktiona (`adapter-vercel`) jolla on OMA, ERILLINEN
 * suoritusaikakatto — ilman tätä `config`-vientiä Hobby-tilin OLETUS on
 * VAIN 10s, jolloin funktio aikakatkaisisi kauan ENNEN backendin 120s-
 * rajaa. `maxDuration: 60` on Hobby-tilin OMA DOKUMENTOITU YLÄRAJA (ei voi
 * asettaa korkeammaksi ilman Pro-tiliä) — EI siis täysin kata backendin
 * 120s-pahinta tapausta, mutta nostaa kattoa 10s:stä 60s:ään, mikä
 * kattanee valtaosan tapauksista. Tunnettu jäännösriski: poikkeuksellisen
 * pitkän urahistorian omaava kuljettaja TÄYSIN kylmällä välimuistilla voi
 * silti saada Vercel-aikakatkaisun (eri virhe kuin backendin 500, mutta
 * sama lopputulos käyttäjälle) — API-tiimin oma ehdotus ("pre-warm" tunnettujen
 * testaajien välimuisti kutsumalla `/drivers/fisu/{driverId}/career` kertaalleen
 * etukäteen) on tällä hetkellä AINOA täysi korjaus tähän jäännösriskiin.
 */
export const config: Config = {
	maxDuration: 60
};

export const actions: Actions = {
	login: async ({ request, fetch }) => {
		const form = await request.formData();
		const steamId = String(form.get('steamId') ?? '').trim();
		const pw = String(form.get('pw') ?? '');

		if (!steamId || !pw) {
			return fail(400, { loginError: 'Täytä sekä Steam ID että salasana.' });
		}

		const raw = await postReviewLogin(fetch, steamId, pw);
		const result = mapReviewLogin(raw);

		if (!result.ok) {
			return fail(401, { loginError: result.error });
		}

		return { session: result.session };
	},

	submit: async ({ request, fetch }) => {
		const form = await request.formData();
		const token = String(form.get('token') ?? '');
		const carIdRaw = form.get('carId');
		const trackIdRaw = form.get('trackId');
		const carId = carIdRaw ? Number(carIdRaw) : undefined;
		const trackId = trackIdRaw ? String(trackIdRaw) : undefined;
		const score = Number(form.get('score'));
		const noteRaw = String(form.get('note') ?? '').trim();
		const note = noteRaw.length > 0 ? noteRaw : undefined;

		if (!token) {
			return fail(401, { submitError: 'Istunto on vanhentunut — kirjaudu uudelleen.', carId, trackId });
		}

		const raw = await postReview(fetch, token, { carId, trackId, score, note });
		const result = mapSubmitReview(raw);

		if (!result.ok) {
			return fail(422, { submitError: result.error, fieldErrors: result.fieldErrors, carId, trackId });
		}

		return {
			submitted: { carId: result.carId, trackId: result.trackId, score: result.score, note: result.note }
		};
	}
};
