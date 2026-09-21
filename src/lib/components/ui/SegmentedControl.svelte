<script lang="ts" generics="T extends string">
	/**
	 * SegmentedControl — geneerinen 2+ vaihtoehdon "pilleri"-valitsin
	 * (esim. "Lopputulokset" / "Nopein kierros" -näkymän vaihto).
	 *
	 * TS-huomio: `value = $bindable()` tekee propista Svelte 5:n
	 * kaksisuuntaisen sidonnan — kutsuja käyttää `bind:value`:a, ja tämä
	 * komponentti voi päivittää sitä suoraan (`value = opt.value`) ilman
	 * erillistä `onchange`-callbackia. Geneerinen `T extends string`
	 * pitää `options`- ja `value`-tyypit synkassa kutsujan oman union-
	 * tyypin kanssa (esim. `'position' | 'lapTime'`) sen sijaan että
	 * tässä oltaisiin sidottu mihinkään tiettyyn käyttötapaukseen.
	 */
	let {
		options,
		value = $bindable(),
		label
	}: {
		options: { value: T; label: string }[];
		value: T;
		/** Saavutettavuutta varten — kertoo ruudunlukijalle mitä tämä valitsin ohjaa. */
		label: string;
	} = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			class="segmented__option"
			data-active={option.value === value}
			role="radio"
			aria-checked={option.value === value}
			onclick={() => (value = option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: inline-flex;
		flex-wrap: wrap;
		padding: 0.25rem;
		border-radius: var(--radius-full);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		gap: 0.125rem;
	}

	.segmented__option {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: 700;
		color: var(--color-text-muted);
		transition:
			background var(--duration-fast) var(--ease-out-quart),
			color var(--duration-fast) var(--ease-out-quart);
	}

	.segmented__option:hover {
		color: var(--color-text);
	}

	.segmented__option[data-active='true'] {
		background: var(--color-info);
		color: var(--color-bg);
	}
</style>
