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

	<!-- Käyttäjän pyyntö 22.9.2026: `data-gap` pienennetty (oli "4") —
	     korttien välinen tila oli turhan suuri. -->
	<div class="fluid-grid" data-minsize="280px" data-gap="3">
		{#each data.seasons as season (season.id)}
			<SeasonCard
				id={season.id}
				name={season.name}
				driversCount={season.driversCount}
				leaderName={season.leaderName}
				leaderPoints={season.leaderPoints}
				isOver={season.isOver}
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

</style>
