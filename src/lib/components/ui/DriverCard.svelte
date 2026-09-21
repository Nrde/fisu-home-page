<script lang="ts">
	/**
	 * DriverCard — kauden SARJATAULUKON rivi (sijoitus + pisteet).
	 *
	 * Tämä on ohut, domain-spesifinen kääre yleiskäyttöisen ListRow'n
	 * päällä (ks. ListRow.svelte) — se tietää MITÄ näytetään (pisteet),
	 * mutta ei MITEN rivi piirretään (se on ListRow'n vastuulla).
	 * Rinnakkainen esimerkki samasta ListRow-pohjasta on
	 * RaceResultRow.svelte, joka näyttää yksittäisen kisan
	 * aikaeron ja nopeimman kierroksen sarjataulukon pisteiden sijaan.
	 *
	 * HUOM (käyttäjän palaute 20.9.2026): aiempi "Voittaja"-badge
	 * (bestFinish === 1 -perusteella) poistettiin tästä turhana —
	 * sarjataulukossa tärkeämpää on näyttää tasapelit oikein (ks.
	 * `displayPosition`) kuin merkitä ketä tahansa "voittajaksi" pelkän
	 * yhden hyvän tuloksen perusteella.
	 */
	import ListRow from './ListRow.svelte';

	let {
		position,
		displayPosition,
		name,
		points,
		racesCount,
		totalRaces,
		featured = false
	}: {
		position: number;
		/** "=" jos jakaa sijoituksen edellisen rivin kanssa, muuten position merkkijonona — ks. mappers.ts:n computeDisplayPositions. */
		displayPosition: string;
		name: string;
		points: number;
		/**
		 * Kauden aikana ajettujen kilpailujen määrä — käyttäjän pyyntö
		 * 21.9.2026, API:n uusi `races`-kenttä (ks. mappers.ts:n
		 * SeasonStanding.racesCount). `undefined` jos API ei sitä
		 * antanut, jolloin toista riviä ei näytetä ollenkaan (sama
		 * "tyhjä snippet piiloutuu" -periaate kuin RaceResultRow'ssa).
		 */
		racesCount?: number;
		/**
		 * Kauden tähän mennessä ajettujen kisojen KOKONAISMÄÄRÄ (sama
		 * kaikille kuljettajille tällä kaudella) — ks. mappers.ts:n
		 * CurrentSeason.totalRaces. Käytetään `racesCount`:in RINNALLA
		 * "7/8 kilpailua" -muotoon (käyttäjän valitsema notaatio
		 * 21.9.2026). `undefined` jos ei tiedossa, jolloin pudotaan
		 * vanhaan "7 kilpailua" -muotoon ilman nimittäjää.
		 */
		totalRaces?: number;
		featured?: boolean;
	} = $props();

	/* HUOM (käyttäjän palaute 21.9.2026): pelkkä numero, ei enää "P"-etuliitettä. */
	const positionLabel = $derived(displayPosition === '=' ? '=' : String(position));

	/*
	 * Pisteet/kisa-keskiarvo — käyttäjän pyyntö 21.9.2026, valittu
	 * VAIHTOEHTO 3 kolmesta ehdotetusta näyttötavasta (ei omaa riviä,
	 * yhdistetty pisteet-tekstin perään). `undefined` jos racesCount
	 * puuttuu TAI on 0 (nolla-jaon välttäminen — uudella kuljettajalla
	 * jolla ei vielä ole yhtään ajettua kisaa ei ole mielekästä
	 * keskiarvoa, vaikka pts olisikin jostain syystä >0).
	 * HUOM (käyttäjän oma huomio 21.9.2026): tätä EI värikoodata
	 * vihreäksi/punaiseksi verrattuna naapurikuljettajien keskiarvoihin
	 * — käyttäjä itse totesi tämän harhaanjohtavaksi pienillä
	 * kisamäärillä (muutama hyvä/huono tulos vääristäisi vertailua),
	 * joten luku näytetään neutraalina faktana ilman tulkintaa.
	 */
	const pointsPerRace = $derived(
		racesCount !== undefined && racesCount > 0 ? points / racesCount : undefined
	);
</script>

<ListRow {position} {positionLabel} {name} {featured} metaAccent="warning">
	{#snippet meta()}
		{points.toLocaleString('fi-FI')} pistettä{#if pointsPerRace !== undefined}
			<span class="points-per-race"
				>Ø{pointsPerRace.toLocaleString('fi-FI', {
					minimumFractionDigits: 1,
					maximumFractionDigits: 1
				})}</span
			>
		{/if}
	{/snippet}
	{#snippet metaSecondary()}
		{#if racesCount !== undefined}
			{#if totalRaces !== undefined}
				<!--
					HUOM (21.9.2026): "kisaa" eikä "kilpailua" TÄSSÄ tarkoituksella
					— sama lyhyempi, jo projektissa käytössä oleva sana kuin
					UpcomingRaceCardin "KISAN TIEDOT" -painikkeessa. Tilaa säästävä
					valinta: "X/Y kilpailua" ei mahtunut enää samalle riville
					pisteet+keskiarvo-tekstin kanssa (mitattu Playwrightilla, ks.
					.points-per-race-kommentti), "X/Y kisaa" mahtuu.
				-->
				{racesCount}/{totalRaces} kisaa
			{:else if racesCount === 1}
				1 kilpailu
			{:else}
				{racesCount} kilpailua
			{/if}
		{/if}
	{/snippet}
</ListRow>

<style>
	/* Pisteet/kisa-keskiarvo — hillitympi kuin itse pistemäärä (joka
	   perii metaAccent="warning"-värin ListRow'lta), jotta pistemäärä
	   pysyy rivin ENSISIJAISENA silmäänpistävänä lukuna ja keskiarvo on
	   selvästi lisätietoa sen perässä. Ei omaa fluidia cqi-kokoa —
	   perii emin kautta ympäröivän .list-row__meta:n koon suhteessa. */
	.points-per-race {
		/* Suluton "Ø60,3"-muoto (ei "(Ø 60,3)") + pieni oma fontti — kaksi
		   syytä. 1) Visuaalinen hierarkia: keskiarvo on lisätietoa, ei
		   pääluku, joten se saa olla pienempi ja hillitympi kuin
		   pistemäärä. 2) TILA (mitattu Playwrightilla 21.9.2026): täysi
		   "362 pistettä (Ø 60,3)" + "6/6 kilpailua" ei mahtunut enää
		   samalle riville 3-sarakkeisessa ruudukossa (metaRow 281px,
		   sisältö olisi vaatinut ~297px) — käyttäjä valitsi TARKOITUKSELLA
		   vaihtoehdon jossa EI ole omaa kolmatta riviä, joten tiivistetty
		   muoto + pienempi fontti vapauttavat juuri sen verran tilaa että
		   molemmat mahtuvat taas samalle riville. */
		margin-left: 0.35em;
		font-size: 0.78em;
		color: var(--color-text-faint);
		font-weight: 600;
	}
</style>
