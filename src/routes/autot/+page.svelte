<script lang="ts">
	import CarCard from '#lib/components/ui/CarCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Autot — FISU</title>
	<meta name="description" content="FISU:n autosanakirja — mallit, valmistajat ja luokat." />
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Autot</h1>

	{#if data.cars.length === 0}
		<p class="empty">Autoja ei löytynyt.</p>
	{:else}
		<div class="fluid-grid car-grid" data-gap="4">
			{#each data.cars as car (car.id)}
				<CarCard id={car.id} name={car.name} manufacturer={car.manufacturer} carClass={car.class} sim={car.sim} />
			{/each}
		</div>
	{/if}
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
		margin-bottom: var(--space-6);
	}

	.empty {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	/* Sama syy kuin radat/+page.svelte:n `.fluid-grid.track-grid`:ssä —
	   saman rivin kortit samankorkuisiksi. */
	.fluid-grid.car-grid {
		align-items: stretch;
	}
</style>
