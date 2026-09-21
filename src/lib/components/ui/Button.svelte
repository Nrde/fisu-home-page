<script lang="ts">
	/**
	 * TS-huomio: `Snippet` on Svelte 5:n oma tyyppi lapsisisällölle
	 * (children) — korvaa vanhan `slot`-elementin. Kun komponentti
	 * hyväksyy `children: Snippet`, kutsuva puoli kirjoittaa tavallista
	 * HTML:ää `<Button>...</Button>`-tagien väliin, ja se päätyy tänne
	 * `{@render children()}`-kutsun kautta.
	 */
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'ghost';

	let {
		variant = 'primary',
		href,
		onclick,
		children
	}: {
		variant?: Variant;
		/** Jos annettu, renderöityy <a>-elementtinä napin sijaan. */
		href?: string;
		onclick?: () => void;
		children: Snippet;
	} = $props();
</script>

{#if href}
	<a class="button button--{variant}" {href}>
		{@render children()}
	</a>
{:else}
	<button class="button button--{variant}" {onclick}>
		{@render children()}
	</button>
{/if}

<style>
	.button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-6);
		border-radius: var(--radius-full);
		font-weight: 700;
		font-size: var(--font-size-sm);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition:
			transform var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart),
			background var(--duration-fast) var(--ease-out-quart);
	}

	.button:hover {
		transform: translateY(-2px);
	}

	.button--primary {
		background: var(--color-info);
		color: var(--color-bg);
		box-shadow: var(--glow-info);
	}

	.button--primary:hover {
		background: var(--color-primary-hover);
	}

	.button--ghost {
		background: transparent;
		border: 1px solid var(--color-surface-border);
		color: var(--color-text);
	}

	.button--ghost:hover {
		border-color: var(--color-info);
		color: var(--color-info);
	}
</style>
