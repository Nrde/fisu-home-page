/**
 * Ympäristömuuttujien EKSPLISIITTINEN määrittely — SvelteKit 3 (RC)
 * -ominaisuus (ks. suunnitelman luku 1.2). Korvaa vanhan SvelteKit 2:n
 * "tuo mikä tahansa muuttuja $env/dynamic/private:sta" -tavan: jokainen
 * muuttuja pitää nimetä TÄSSÄ, ja sille voi antaa validoinnin/oletus-
 * arvon (`schema`). Näin esim. kirjoitusvirhe muuttujan nimessä toisaalla
 * koodissa on TYPE ERROR eikä hiljainen `undefined` ajossa asti.
 *
 * Muuttujat päätyvät käyttöön reittikohtaisesti `$app/env/private`
 * (palvelin-only, ks. `#lib/server/api/client.ts`) tai `$app/env/public`
 * -moduulin kautta, riippuen `public`-asetuksesta alla.
 */
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	// FISU-API:n perusosoite. `static: false` (oletus) tarkoittaa että
	// arvo luetaan ympäristöstä JOKAISELLA sovelluksen käynnistyksellä
	// build-aikaan "polttamisen" sijaan — tarpeen koska sama build-
	// artefakti voi ajaa sekä production- että preview-ympäristöä
	// Vercelissä eri API-osoitteilla.
	FISU_API_BASE_URL: {
		description: 'FISU-API:n perusosoite, esim. https://api2.simu.fi',
		// Funktio-muotoinen schema (ei tarvitse erillistä valibot/zod-
		// riippuvuutta yhden merkkijonon oletusarvolle): palauttaa arvon
		// jos asetettu, muuten kovakoodatun oletuksen.
		schema: (value: string | undefined) => value ?? 'https://api2.simu.fi'
	},

	// Käyttäjän pyyntö 22.9.2026: rataprofiilien SVG-karttojen base-URL
	// (ks. mappers.ts:n `Track.imageUrl`-kommentti) siirretty kovakoodatusta
	// vakiosta tänne — ERI ISÄNTÄ kuin `FISU_API_BASE_URL` (kartat ladataan
	// SUORAAN selaimesta, ei tämän sovelluksen API-kääreen kautta), joten
	// tämä on oma muuttujansa eikä sidottu API-osoitteeseen. Oletusarvo on
	// käyttäjän VAHVISTAMA nykyinen osoite — muuttuu vain jos rataprofiili-
	// kuvat joskus siirtyvät toiseen paikkaan.
	TRACK_IMAGE_BASE_URL: {
		description: 'Rataprofiilien SVG-karttojen base-URL, esim. https://fisu.simracing.fi/media/radat/',
		schema: (value: string | undefined) => value ?? 'https://fisu.simracing.fi/media/radat/'
	}
});
