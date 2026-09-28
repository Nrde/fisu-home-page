<script lang="ts">
	/**
	 * RatingListRow — reittauslistan rivi (sijoitus + reittausluku).
	 * Ohut ListRow-kääre, sama periaate kuin DriverCard/RaceResultRow:ssa
	 * (ks. niiden kommentit) — UUSI 28.9.2026, käyttäjän pyyntö
	 * reittausdatan "tavallisesta listanäkymästä" animoidun kaavion
	 * rinnalle (ks. RaceChart.svelte).
	 */
	import ListRow from './ListRow.svelte';

	let { position, name, rating }: { position: number; name: string; rating: number } = $props();
</script>

<ListRow {position} {name} metaAccent="warning">
	{#snippet meta()}
		{rating.toLocaleString('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pistettä
	{/snippet}
</ListRow>
