/**
 * Raakatyypit sille MITÄ API PALAUTTAA `{ success, data }` -kääreen
 * `data`-kentän SISÄLLÄ — nämä kuvaavat JSONin muodon, ei sitä miten
 * sivu näyttää datan (se on mappers.ts:n työ). Itse kääre puretaan
 * `client.ts`:n `apiFetchEnvelope`-funktiossa, joka on YKSI paikka
 * jossa `{ success, data }` tunnetaan — nämä tyypit kuvaavat siis vain
 * `data`-kentän sisältöä, eivät kääre-oliota (paitsi `RawCurrentSeason
 * Response` ja `RawRaceResultResponse`, jotka tarvitsevat myös kääreen,
 * ks. niiden omat kommentit ja `client.ts`).
 *
 * KONVENTIO (linjattu käyttäjän kanssa 20.9.2026): kääre on aina läsnä.
 * Jos joltain endpointilta joskus tulee kääreetön vastaus, se on
 * backend-bugi — sitä EI siedetä hiljaisesti täällä tai UI:ssa, vaan
 * `apiFetchEnvelope` heittää siitä selkeän virheen.
 *
 * `/results/organiser/{organiser}/summary` pitää TARKOITUKSELLA vanhat
 * lyhyet avaimensa (`pos`/`pts`) sisäisesti — se EI ole osa backendin
 * muuta uudelleennimeämistä (nimi→name, sijoitus→position jne.), joka
 * koskee vain muita endpointeja (season, organiser-täysversio, race,
 * prediction).
 */

/** GET /results/organiser/{organiser}/summary — `data`-kentän sisältö (kääre puretaan client.ts:ssä). */
export type RawOrganiserSummaryResponse = RawSeasonSummary[];

export interface RawSeasonSummary {
	seasonId: number;
	seasonName: string;
	/**
	 * VALINNAINEN, EI VIELÄ BACKENDISSÄ (22.9.2026) — käyttäjä tarjoutui
	 * mahdollisesti lisäämään tämän API:iin kaudittaisen pikasuodattimen
	 * napinnimiä varten (ks. mappers.ts:n `mapSeasonFilterOptions`), koska
	 * `seasonName`:sta lyhyen napin nimen PÄÄTTELY on epäluotettavaa
	 * kaikille nimimuodoille (esim. "Season 6: FiSU Sport Trophy (FiST)").
	 * Jos/kun tämä kenttä ilmestyy, mapperin pitäisi käyttää sitä
	 * SUORAAN päättelyn sijaan — koodi tukee tätä jo (optional-kenttä,
	 * ei riko mitään jos se puuttuu).
	 */
	shortName?: string;
	drivers: RawDriverStanding[];
}

export interface RawDriverStanding {
	/** HUOM: tulee livenä merkkijonona (esim. "1023"), ei numerona — emme käytä tätä kenttää vielä mihinkään. */
	id: number | string;
	name: string;
	/** Kauden sijoitus (kokonaispisteiden mukaan), EI yksittäisen kisan sijoitus. */
	pos: number;
	/** Kauden kokonaispisteet. */
	pts: number;
	/**
	 * Kauden SISÄINEN paras yksittäisen kisan sijoitus (ei koko uran
	 * paras koskaan) — null jos kuljettajalla ei ole vielä yhtään
	 * valmista kisatulosta tällä kaudella. Vahvistettu API-tsätiltä
	 * 20.9.2026.
	 */
	bestFinish: number | null;
	/**
	 * Kuinka monta kauden kilpailua kuljettaja on ajanut. Käyttäjän
	 * antama esimerkki 21.9.2026: `"races":4` samassa oliossa kuin
	 * `pos`/`pts`/`bestFinish` — sama `/results/organiser/{organiser}
	 * /summary`-endpoint, ei erillistä hakua. Valinnainen varmuuden
	 * vuoksi (jos joku vanhempi kausi/backend-versio ei sitä antaisi).
	 */
	races?: number;
}

/**
 * GET /stats/organiser/{organiser} — uusi, osittainen (20.9.2026).
 * `firstSeasonYear`/`totalLaps`/`simulators` ovat tällä hetkellä aina
 * null/[] backendillä ("ei datalähdettä ilman lisätyötä") — muut kolme
 * ovat oikeasti laskettuja kaikkien kausien yli.
 */
export interface RawStatsResponse {
	totalRaces: number;
	totalActiveDrivers: number;
	totalSeasonsCount: number;
	firstSeasonYear: number | null;
	totalLaps: number | null;
	simulators: string[];
}

/**
 * GET /stats/organiser/{organiser}/complete — UUSI (käyttäjän liittämä
 * API-kenttäkartta 22.9.2026). Yksi raskas mutta pitkään cachettu kutsu,
 * kaikki yhteisö-/vertailunäkymät kerralla (backendin oma tavoite:
 * minimoida kutsujen määrä). HUOM tunnetut rajoitukset (ks. kartan
 * kohta 4): EI sisällä DNF-tilastoja (tietoinen rajaus,
 * points===0-heuristiikan virhepositiiviset kertautuisivat koko
 * historian yli), ja endpoint on tuotannossa vasta juuri deployattu —
 * ensimmäinen kutsu voi antaa hetken puutteellista/tyhjää dataa cachen
 * lämmetessä.
 */
export interface RawLeaderboardEntry {
	driverId: number | string;
	name: string;
	races: number;
	wins: number;
	podiums: number;
	poles: number;
	fastestLaps: number;
}

export interface RawSeasonTrendEntry {
	seasonId: number;
	seasonName: string;
	driverCount: number;
	raceCount: number;
}

export interface RawStatsCompleteResponse {
	leaderboards: {
		/** Kaikki neljä listaa: sama olion muoto (RawLeaderboardEntry), top 10, eri sarakkeen mukaan järjestettynä — backend on jo järjestänyt, emme järjestä uudelleen. */
		mostWins: RawLeaderboardEntry[];
		mostPodiums: RawLeaderboardEntry[];
		mostPoles: RawLeaderboardEntry[];
		mostFastestLaps: RawLeaderboardEntry[];
	};
	trackStats: {
		/** trackId (ks. RawTrack.trackid) => kisamäärä. Avaimet EIVÄT kata kaikkia /tracks-radoista, eivätkä kaikki avaimet välttämättä löydy /tracks:sta (ks. kartan kohta 4: 6 tunnettua puuttuvaa rataa). */
		raceCountByTrackId: Record<string, number>;
		/** Kisoja joiden rataa ei tunnistettu lainkaan (trackId null tuloshausta) — ei liity mihinkään yksittäiseen trackId:hen. */
		racesWithUnknownTrack: number;
	};
	/** Backendin oma järjestys, EI uudelleenjärjestetty tässä tiedostossa — oletetaan (ei erikseen vahvistettu) samaksi käytännöksi kuin muut kausilistat (uusin ensin). */
	seasonTrends: RawSeasonTrendEntry[];
}

/**
 * GET /seasons/{organiser}/current — vahvistettu 20.9.2026. Aito
 * `WHERE start_date <= NOW() AND end_date >= NOW()` -kysely, EI arvaus
 * kausilistan järjestyksestä. `data: null` jos mikään kausi ei ole juuri
 * nyt käynnissä (suurin osa vuodesta, ks. +page.svelte:n TODO historia-
 * painotuksesta) — TÄMÄ EI OLE VIRHETILA, on täysin normaali vastaus.
 * Toimii vain `organiser === 'fisu'`:lle (AKK-data on hylätty) — muilla
 * organisaattorinimillä `data` on aina null, ei virhettä.
 *
 * HUOM (bugi löydetty tuotannosta 20.9.2026): `data.id` tulee livenä
 * MERKKIJONONA ("168"), vaikka `organiserSummary`:n vastaava `seasonId`
 * on numero — tyyppi kuvaa tätä nyt rehellisesti (`number | string`).
 * `mappers.ts`:n `pickDisplaySeasonId` tekee `Number(...)`-muunnoksen
 * ennen käyttöä, muuten `===`-vertailu epäonnistuisi hiljaisesti aina.
 * Tämä sama epäjohdonmukaisuus (numero joskus merkkijonona) näkyy myös
 * `organiserSummary`:n `driver.id`:ssä (esim. `"1023"`) — emme
 * tällä hetkellä käytä sitä kenttää mihinkään, joten se ei riko mitään,
 * mutta on syytä pitää mielessä jos sitä joskus aletaan käyttää.
 */
export interface RawCurrentSeasonResponse {
	success: boolean;
	data: { id: number | string; name: string } | null;
	message?: string;
}

/**
 * GET /races/{season} — kauden kaikki kisat, ajetut ja ajamattomat.
 * HUOM (22.9.2026, käyttäjän liittämä API-kenttäkartta): `trackId`
 * lisätty backendiin — VIITTAA `/tracks`-endpointin `trackid`:hen
 * (sama arvoavaruus, esim. `"ahvenisto"`), `null` jos rataa ei
 * tunnistettu (kenttäkartan mukaan 6 tunnettua rataa on tällä hetkellä
 * tässä tilanteessa, ks. mappers.ts:n matchTrackRaceHistory-kommentti).
 * TÄMÄ KORVAA aiemman NIMEEN perustuvan täsmäytyksen (`track`-kenttä
 * pelkkänä vapaana tekstinä ei riittänyt luotettavaan linkitykseen) —
 * käytä AINA `trackId`:tä kun se on olemassa, `track`-teksti on nyt
 * VAIN näyttöä varten (kisakalenterin rivin otsikko).
 */
export interface RawRaceListEntry {
	id: number;
	/** Alkuperäinen yhdistetty merkkijono ennen date/time-splittiä — emme käytä tätä, date+time riittävät. */
	dateFull?: string;
	/** Muoto "pp.k.vvvv" (EI nollatäytettä), esim. "7.1.2026". Vahvistettu 20.9.2026. */
	date: string;
	/** Muoto "hh:mm", EI "klo "-etuliitettä. Vahvistettu 20.9.2026. */
	time: string;
	track: string;
	trackId: string | null;
}

export type RawRaceListResponse = RawRaceListEntry[];

/**
 * GET /finishedraces/{season} — PALJAS taulukko kisa-id:tä, ei olioita.
 * HUOM järjestyksestä (vahvistettu 20.9.2026): EI ole koodin takaama
 * invariantti, on simracing.fi:n oman kalenteritaulukon HTML-rivijärjestys
 * sellaisenaan. "Käytännössä kronologinen" muttei taattu — jos tämä
 * joskus näyttää väärän "viimeisimmän kisan", tämä on ensimmäinen syy
 * jota epäillä.
 */
export type RawFinishedRaceIdsResponse = number[];

/**
 * GET /results/race/{id} — VAHVISTETTU 21.9.2026 oikeaa tuotantovastausta
 * vasten (käyttäjän liittämä esimerkkidata). Backend on nyt julkaissut
 * englanninkieliset kanoniset avaimet — vanhat suomenkieliset avaimet
 * (`sijoitus`/`nimi`/`ero`/`nop. kier.`/`lähtöruutu`/`muutos`/`pisteet`)
 * ja vanha pienaakkosinen `driverid` ovat TOISTAISEKSI vielä mukana
 * vastauksessa rinnakkain, mutta niitä EI enää lueta täältä — käyttäjän
 * ohje 21.9.2026: käytä vain uusia englanninkielisiä avaimia, älä
 * ylläpidä kahta avainsarjaa turhaan. `drivers` on AVAINPARI-OLIO
 * (object) keyta driverId:llä, EI TAULUKKO — täytyy lukea
 * `Object.entries(data.drivers)`, ei indeksoida kuin taulukkoa.
 *
 * PÄIVITYS (22.9.2026, API-kenttäkartta): toisin kuin 21.9.2026 vielä
 * uskottiin, API antaa NYT `fastestLap: true/false` VALMIINA jokaiselle
 * kuljettajalle — EI enää tarvitse päätellä sitä `bestLapTime`-arvoja
 * vertaamalla (mappers.ts:n `mapLatestRaceResult` käyttää nyt suoraan
 * tätä kenttää). Myös vastauksen JUURESSA (ei per-kuljettaja) on nyt
 * `trackId: string | null` — sama arvoavaruus kuin `/tracks`-endpointin
 * `trackid`:ssä ja `/races/{season}`:n uudessa `trackId`-kentässä.
 */
export interface RawRaceResultResponse {
	success: boolean;
	data: {
		racename: string;
		seasonname: string;
		trackId: string | null;
		drivers: Record<string, RawRaceResultDriver>;
	};
}

/**
 * GET /tracks — VAHVISTETTU 21.9.2026 käyttäjän liittämästä oikeasta
 * payloadista. HUOM: tämä on RATATIETOKANTA (reaalimaailman radat,
 * esim. Le Mans, Ahvenisto) — `laprecord`/`laprecorddriver`/
 * `laprecordcar` ovat radan VIRALLINEN reaalimaailman ennätys, EI FISU:n
 * oma sim-racing-ennätys. Tällä endpointilla EI ole mitään suoraa
 * yhteyttä `/races/{season}`:n `track`-kenttään (pelkkä nimimerkkijono,
 * ei trackid:tä) — käyttäjän oma päätös 21.9.2026: linkitys FISU:n
 * kisahistoriaan tehdään TOISTAISEKSI nimeä täsmäyttämällä (ks.
 * mappers.ts:n `matchTrackRaceHistory`), kunnes `trackid` mahdollisesti
 * lisätään `/races/{season}`-vastaukseen backendissä.
 *
 * KENTÄT OVAT VALTAOSIN VALMIIKSI MUOTOILTUJA NÄYTTÖMERKKIJONOJA, EI
 * dataa laskentaa varten: `length`/`elevation`/`laprecord` käyttävät
 * epäjohdonmukaista muotoilua eri radoilla (esim. `length`: "13,6 km"
 * vs. "2.840km" — pilkku/piste ja välilyönti vaihtelevat), joten niitä
 * EI pureta numeroiksi täällä — näytetään sellaisenaan, ks. mappers.ts.
 *
 * PÄIVITYS (22.9.2026): `/races/{season}`-endpointissa on NYT `trackId`
 * (ks. RawRaceListEntry-kommentti) joka VIITTAA suoraan tämän `trackid`-
 * kenttään — aiempi nimeen perustuva täsmäytys (`matchTrackRaceHistory`)
 * on korvattu tarkalla id-vertailulla, ei enää tarpeen kuvata tässä
 * väliaikaisena kiertotienä.
 */
export interface RawTrack {
	trackid: string;
	/** HUOM: sisältää joskus ylimääräisen alkuvälilyönnin (esim. " Circuit de la Sarthe") — trimmataan mappers.ts:ssä. */
	trackname: string;
	location: string;
	length?: string;
	turns?: string;
	elevation?: string;
	built?: string;
	/** Lisähuomio rakennusvuoteen, esim. "1990 (nro 10)" — tyhjä merkkijono jos ei ole. */
	builtextra?: string;
	laprecord?: string;
	laprecorddriver?: string;
	laprecordcar?: string;
	/**
	 * Kuvatiedoston NIMI (esim. "lemans_91.svg"), EI täysi URL. PÄIVITYS
	 * (22.9.2026): base-URL VAHVISTETTU käyttäjältä —
	 * `https://simu.fi/images/tracks/` (esimerkki: "jarama.svg" ->
	 * `https://simu.fi/images/tracks/jarama.svg`). HUOM: eri isäntä kuin
	 * `api2.simu.fi` (pelkkä `simu.fi`) — SVG haetaan siis suoraan
	 * selaimesta `<img>`-tagilla, ei tämän API-kääreen kautta. Ks.
	 * mappers.ts:n `TRACK_IMAGE_BASE_URL` ja `Track.imageUrl`.
	 */
	trackimage?: string;
	info?: string;
	/** Tarkoitus epäselvä (21.9.2026) — kaikissa nähdyissä esimerkeissä tyhjä merkkijono. ARVAUS: mahdollisesti radan eri konfiguraation nimi (esim. lyhyt/GP-layout). */
	layout?: string;
}

export type RawTrackListResponse = RawTrack[];

export interface RawRaceResultDriver {
	driverId: number | string;
	position: number | string;
	name: string;
	/** "0" voittajalle, muille sekunteja merkkijonona (esim. "20.857") tai "N lap"/"N laps". */
	gap?: string;
	/** Kuljettajan oma paras kierrosaika tässä kisassa, muoto "M:SS.sss" (esim. "1:27.480"). */
	bestLapTime?: string;
	startingPosition?: string | number | null;
	positionChange?: string | number | null;
	points?: number | string;
	/** Ajoi KOKO KISAN nopeimman kierroksen — API:n antama valmis totuusarvo (22.9.2026 alkaen, ks. RawRaceResultResponse-kommentti), EI enää päätelty. */
	fastestLap?: boolean;
}

/**
 * GET /drivers/{organiser}/{driverId}/career — VAHVISTETTU 21.9.2026
 * käyttäjän liittämästä oikeasta esimerkkivastauksesta (kuljettaja
 * Panu Artimo, driverId 732, 18 kautta). Palauttaa YHDEN kuljettajan
 * KOKO uran: kaudet UUSIN ENSIN (vahvistettu esimerkkidatasta — seasonId
 * laskee järjestyksessä 168 -> 59), jokaisella kaudella sen kisat
 * (jokainen `RawDriverCareerRace` on tämän YHDEN kuljettajan oma rivi
 * kyseisestä kisasta, EI koko kisan tulostaulukko), sekä kausi- ja
 * urakohtaiset valmiiksi lasketut tilastot (`stats`/`careerStats`, sama
 * kenttäjoukko molemmissa).
 *
 * HUOM: `win`/`podium`/`pole`/`fastestLap`/`dnf` tulevat tällä
 * endpointilla VALMIINA totuusarvoina (toisin kuin `/results/race/{id}`,
 * jossa DNF piti PÄÄTELLÄ `points === 0`:sta, ks. RawRaceResultDriver-
 * kommentti ja mappers.ts:n normalizeDnf) — käytetään siis suoraan,
 * EI päätellä uudelleen. `positionChange`-kenttää EI ole tälläkään
 * endpointilla — se lasketaan edelleen itse `startingPosition - position`
 * -kaavalla (sama käytäntö kuin muuallakin, ks. mappers.ts:n
 * normalizePositionChange-kommentti), koska `startingPosition` voi olla
 * `null` (esim. aika-ajo ajamatta, nähty esimerkkidatassa).
 */
export interface RawDriverCareerRace {
	raceId: number;
	raceName: string;
	position: number;
	/** TÄMÄN kisan pisteet (ei kauden/uran kokonaispisteitä). */
	points: number;
	/** Sama muoto kuin RawRaceResultDriver.gap:ssa ("N lap"/"N laps"/sekunteja merkkijonona) — HUOM: nähty myös kirjaimellinen "DNF"-merkkijono tässä kentässä (ei vain numeroarvoa), formatGapDisplay palauttaa tällöin undefined (ei arvata). */
	gap?: string;
	bestLapTime?: string;
	startingPosition: number | null;
	win: boolean;
	podium: boolean;
	pole: boolean;
	fastestLap: boolean;
	dnf: boolean;
}

/** Sama kenttäjoukko sekä kausikohtaisessa (`RawDriverCareerSeason.stats`) että urakohtaisessa (`RawDriverCareerResponse.data.careerStats`) tilastossa. */
export interface RawDriverCareerStats {
	racesEntered: number;
	bestResult: number | null;
	wins: number;
	winPct: number | null;
	podiums: number;
	podiumPct: number | null;
	poles: number;
	polePct: number | null;
	/** Kisat joissa lähtöruutu on tiedossa (startingPosition !== null) — tekninen apuluku, ei näytetä UI:ssa sellaisenaan. */
	racesWithKnownGrid: number;
	fastestLaps: number;
	fastestLapPct: number | null;
	dnfs: number;
	dnfPct: number | null;
	averagePosition: number | null;
}

export interface RawDriverCareerSeason {
	seasonId: number;
	seasonName: string;
	races: RawDriverCareerRace[];
	stats: RawDriverCareerStats;
}

/** HUOM: KOKO kääre (success+data), sama syy kuin RawRaceResultResponse:ssa — mappers.ts lukee response.data.* itse. */
export interface RawDriverCareerResponse {
	success: boolean;
	data: {
		driverId: number;
		driverName: string;
		seasons: RawDriverCareerSeason[];
		careerStats: RawDriverCareerStats;
	};
}

/**
 * Hall of Fame -rivi — API-kenttäkartta 22.9.2026 (korjattu versio:
 * `driverName` nostettu omaksi kentäksi, `stats` rajattu TARKALLEEN
 * samaan muotoon kuin `RawDriverCareerResponse.data.careerStats`, ei
 * koko /career-vastausta). `driverName` ja `stats` ovat `null` YHDESSÄ
 * kun `statsError === true` (yksittäisen kuljettajan statshaku
 * epäonnistui palvelimella, esim. simracing.fi hetkellisesti poissa) —
 * `tagline`/`quote`/`firstSeason` ovat silti aina läsnä koska ne ovat
 * ylläpidon omaa dataa, riippumattomia ulkoisesta statshausta.
 */
export interface RawHallOfFameEntry {
	driverId: number;
	driverName: string | null;
	tagline: string;
	quote: string;
	/** Vapaata tekstiä (esim. "Season 9 (2021)") — EI ext_sid, ei parsittavaa rakennetta. */
	firstSeason: string;
	stats: RawDriverCareerStats | null;
	statsError: boolean;
}

/**
 * HUOM: KOKO kääre (success+data), sama konventio kuin
 * RawDriverCareerResponse:ssa — TÄRKEÄÄ tässä koska `intro` on
 * `data`:n SISARUSKENTTÄ (ei sen sisällä), joten `apiFetchEnvelope`
 * (joka purkaisi vain `.data`:n) ei riitä tälle endpointille, ks.
 * client.ts:n `fetchHallOfFame`-kommentti.
 */
export interface RawHallOfFameResponse {
	success: boolean;
	/**
	 * Sivun johdantoteksti, ylläpidon kirjoittama (LISÄTTY 2026-09-21,
	 * API-kenttäkartta) — organiser-kohtainen, `null` jos ei asetettu.
	 */
	intro: string | null;
	data: RawHallOfFameEntry[];
}
