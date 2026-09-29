<script lang="ts">
	/**
	 * Reittaussivu — UUSI 28.9.2026, käyttäjän pyyntö: kuljettajien
	 * reittauksen (Elo-tyyppinen luku) kehitys kisa kisalta, sekä
	 * animoituna "rating race" -kaaviona (RaceChart.svelte) ETTÄ
	 * tavallisena nykyisen sijoituksen listana ("näyttää ... normaalilla
	 * sivulla listana"). Kumpikin näkymä käyttää SAMAA `+page.server.ts`:n
	 * hakemaa dataa — lista on vain viimeisimmän framen `standings`.
	 *
	 * HUOM: sivua ei ole (vielä) lisätty Header.svelte:n päänavigaatioon —
	 * käyttäjä ei pyytänyt sitä, joten linkki jätetty lisäämättä ettei
	 * navigaatio täyty ominaisuudesta jota ei vielä ole vahvistettu
	 * valmiiksi.
	 *
	 * PÄIVITYS (29.9.2026, käyttäjän pyyntö): erillinen `<h1>Rating</h1>` +
	 * johdantokappale POISTETTU tästä kokonaan — käyttäjän oma perustelu:
	 * "tällä sivulla olisi tärkeää saada mahtumaan mahdollisimman monta
	 * graafin riviä näytölle", eikä sivun oma otsikkorivi (sama whitespace-
	 * käytäntö kuin muillakin sivuilla) ollut sen arvoinen pystytilan
	 * kuluttaja tällä NIMENOMAISELLA sivulla. Sama "brändäys" ("Rating")
	 * on nyt RaceChart.svelte:n OMA himmeä `.chart-watermark`-tausta-
	 * teksti kaavion laatikon sisällä — vie NOLLA ylimääräistä pystytilaa,
	 * koska se on asemoitu laatikon SISÄLLE, ei omaksi rivikseen sen
	 * yläpuolelle. Sivun oikea `<title>`/kuvaus säilyvät silti
	 * `<svelte:head>`:ssä hakukoneita/välilehteä varten.
	 */
	import RaceChart from '#lib/components/ui/RaceChart.svelte';
	import RatingListRow from '#lib/components/ui/RatingListRow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Uusin frame = kisa jonka jälkeen tilanne on TÄLLÄ HETKELLÄ — ei
	// erillistä "nykyinen sijoitus" -kenttää API:ssa, `frames`-taulukon
	// oma järjestys (aikajärjestys) riittää poimimaan sen viimeisenä.
	const latestFrame = $derived(data.raceChart.frames.at(-1));
</script>

<svelte:head>
	<title>Kuljettaja Rating — FISU</title>
	<meta name="description" content="Kuljettajien rating kehitys kisa kisalta." />
</svelte:head>

<section class="page-grid section">
	<RaceChart frames={data.raceChart.frames} totalDrivers={data.raceChart.totalDrivers} />

	<h2 class="section-title">Nykyinen sijoitus</h2>
	{#if latestFrame && latestFrame.standings.length > 0}
		<ul class="rating-list">
			{#each latestFrame.standings as driver (driver.driverIndex)}
				<li>
					<a href="/kuljettajat/{driver.driverId}" class="rating-list__link">
						<RatingListRow position={driver.rank} name={driver.name} rating={driver.rating} />
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="rating-list__empty">Ei vielä rating tietoja.</p>
	{/if}
</section>

<style>
	/* Käyttäjän pyyntö 29.9.2026: YLÄpadding pieneksi (ei enää sama kuin muilla sivuilla) — kaavio itse tarvitsee pystytilan, ks. script-lohkon PÄIVITYS-kommentti. */
	.section {
		padding-block: var(--space-4) var(--space-12);
	}

	.section-title {
		margin-top: var(--space-12);
		margin-bottom: var(--space-4);
		font-size: var(--font-size-xl);
		font-weight: 800;
	}

	.rating-list__empty {
		color: var(--color-text-faint);
	}

	/* `reset.css` nollaa vain marginaalin, ei `<ul>`:n oletuspaddingia/pisteitä — sama tunnettu korjaus kuin muuallakin sivustolla. */
	.rating-list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	/* Koko rivi on linkki kuljettajan omalle sivulle — sama kääre-periaate kuin kuljettajaprofiilin `.race-row-link`:issa. */
	.rating-list__link {
		display: block;
		color: inherit;
		text-decoration: none;
	}
</style>
