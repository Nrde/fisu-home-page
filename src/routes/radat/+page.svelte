<script lang="ts">
	import TrackCard from '#lib/components/ui/TrackCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Radat — FISU</title>
	<meta name="description" content="FISU:n ratatietokanta — radat, pituudet, mutkat ja viralliset ennätykset." />
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Radat</h1>

	<div class="fluid-grid" data-minsize="280px" data-gap="4">
		{#each data.tracks as track (track.id)}
			<TrackCard
				id={track.id}
				name={track.name}
				location={track.location}
				length={track.length}
				turns={track.turns}
				built={track.built}
				imageUrl={track.imageUrl}
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
