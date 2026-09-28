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
	<title>Reittaus — FISU</title>
	<meta name="description" content="Kuljettajien reittauksen kehitys kisa kisalta." />
</svelte:head>

<section class="page-grid section">
	<h1 class="page-title">Reittaus</h1>
	<p class="page-intro">Kuljettajien reittauksen (Elo-tyyppinen luku) kehitys kisa kisalta.</p>

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
		<p class="rating-list__empty">Ei vielä reittaustietoja.</p>
	{/if}
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.page-title {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.page-intro {
		margin-top: var(--space-1);
		margin-bottom: var(--space-8);
		color: var(--color-text-muted);
		font-weight: 600;
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
