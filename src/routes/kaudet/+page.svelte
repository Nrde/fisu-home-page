<script lang="ts">
	import SeasonCard from '#lib/components/ui/SeasonCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Kaudet — FISU</title>
	<meta name="description" content="FISU:n kaikki kaudet — sarjataulukot ja kisatulokset." />
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Kaudet</h1>

	{#if data.isMockData}
		<p class="mock-notice">⚠ Kehitystila: API-yhteys epäonnistui, sivu näyttää esimerkkidataa.</p>
	{/if}

	<div class="fluid-grid" data-minsize="280px" data-gap="4">
		{#each data.seasons as season (season.id)}
			<SeasonCard
				id={season.id}
				name={season.name}
				driversCount={season.driversCount}
				leaderName={season.leaderName}
				leaderPoints={season.leaderPoints}
			/>
		{/each}
	</div>
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

	.mock-notice {
		margin-bottom: var(--space-6);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: color-mix(in oklch, var(--color-warning) 15%, var(--color-bg));
		border: 1px solid color-mix(in oklch, var(--color-warning) 40%, transparent);
		color: var(--color-warning);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}
</style>
