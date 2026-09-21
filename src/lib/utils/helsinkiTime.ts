/**
 * Muuntaa backendin palauttaman suomalaisen päivämäärä+kellonaika-parin
 * (esim. "7.1.2026" + "17:30" — ei nollatäytettä päivässä/kuukaudessa,
 * ks. `/races/{season}`, vahvistettu API-tsätiltä 20.9.2026) oikeaksi
 * `Date`-olioksi.
 *
 * OLETUS: aika on Suomen paikallisaikaa (Europe/Helsinki). Tätä ei ole
 * backendin toimesta eksplisiittisesti vahvistettu, mutta perusteltu
 * oletus — koko sivusto on suomalainen sim-racing-yhteisö eikä mikään
 * viittaa siihen että ajat tallennettaisiin jossain muussa vyöhykkeessä.
 *
 * DST-turvallinen: EI oleteta kiinteää +02:00 (talvi) tai +03:00 (kesä)
 * -siirtymää, koska kumpi tahansa olisi väärä puolet vuodesta — sen
 * sijaan lasketaan Helsingin TODELLINEN UTC-offset juuri kyseiselle
 * päivämäärälle `Intl.DateTimeFormat`in avulla.
 */
export function parseHelsinkiDateTime(date: string, time: string): Date | undefined {
	const dateMatch = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
	const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
	if (!dateMatch || !timeMatch) return undefined;

	const [, day, month, year] = dateMatch;
	const [, hour, minute] = timeMatch;

	// Ensimmäinen arvaus: tulkitaan annetut kellonlukemat suoraan UTC:na.
	// Tätä käytetään VAIN Helsingin sen hetken offsetin selvittämiseen —
	// muutaman tunnin virhe tässä vaiheessa ei vaikuta offsettiin paitsi
	// aivan DST-siirtymähetken ympärillä (ei ongelma kilpailuaikatauluille).
	const roughUtc = new Date(
		Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
	);
	const offsetMinutes = helsinkiOffsetMinutesAt(roughUtc);

	// Todellinen UTC-hetki = paikallinen kellonaika miinus Helsingin offset
	// (offset positiivinen kun Helsinki on UTC:n edellä, kuten aina on).
	return new Date(roughUtc.getTime() - offsetMinutes * 60_000);
}

function helsinkiOffsetMinutesAt(atUtc: Date): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Helsinki',
		timeZoneName: 'shortOffset'
	}).formatToParts(atUtc);
	const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
	const match = raw.match(/GMT([+-]\d+)/);
	return match ? Number(match[1]) * 60 : 120;
}
