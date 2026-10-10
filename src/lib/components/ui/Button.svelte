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
	type Size = 'base' | 'sm';

	let {
		variant = 'primary',
		size = 'base',
		href,
		onclick,
		children
	}: {
		variant?: Variant;
		/**
		 * UUSI 1.10.2026, käyttäjän pyyntö ("the [discord] button could be
		 * slightly smaller"): `'sm'` pienentää paddingia/fonttia. Oma propsi
		 * `variant`:in RINNALLA (ei `'ghost-sm'`-variantti) koska koko ja
		 * tyyli (väri/reuna) ovat eri ulottuvuuksia — näin esim. Hero.svelte:n
		 * `ghost`-CTA pysyy ENNALLAAN isompana, vain Header.svelte:n Discord-
		 * nappi pienenee.
		 */
		size?: Size;
		/** Jos annettu, renderöityy <a>-elementtinä napin sijaan. */
		href?: string;
		onclick?: () => void;
		children: Snippet;
	} = $props();
</script>

{#if href}
	<a class="button button--{variant} button--{size}" {href}>
		{@render children()}
	</a>
{:else}
	<button class="button button--{variant} button--{size}" {onclick}>
		{@render children()}
	</button>
{/if}

<style>
	/* Padding kutistettu ja kulmat `corner-shape: squircle`:lla hieman
	   kulmikkaammaksi — käyttäjän pyyntö 10.10.2026, ks. saman muutoksen
	   kommentti SegmentedControl.svelte:ssä (koskee KAIKKIA napeja). */
	.button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		corner-shape: squircle;
		font-weight: 700;
		font-size: var(--font-size-sm);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition:
			transform var(--duration-fast) var(--ease-out-quart),
			border-color var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart),
			background var(--duration-fast) var(--ease-out-quart),
			color var(--duration-fast) var(--ease-out-quart);
	}

	.button--primary {
		background: var(--color-info);
		color: var(--color-bg);
		box-shadow: var(--glow-info);
	}

	/* `transform`-nosto rajattu TÄHÄN (ei enää jaettuun `.button:hover`:iin) — käyttäjän pyyntö 1.10.2026 ("discord button... could be without shifting effect"), sama periaate kuin projektin aiempi kortit-eivät-nouse-hoverissa-päätös. */
	.button--primary:hover {
		transform: translateY(-2px);
		background: var(--color-primary-hover);
	}

	/*
	 * PÄIVITETTY (1.10.2026, käyttäjän pyyntö): Discord-nappi käyttää tätä
	 * varianttia — EI enää hover-nostoa ("plain border color change would
	 * be good"), VAIN reunan/tekstin värinvaihto, sama periaate kuin
	 * `.button--primary`:lla PÄÄTETTIIN pitää vain sillä, ei tällä.
	 */
	.button--ghost {
		background: transparent;
		border: 1px solid var(--color-surface-border);
		color: var(--color-text);
	}

	.button--ghost:hover {
		border-color: var(--color-info);
		color: var(--color-info);
	}

	/*
	 * `size="sm"` — UUSI 1.10.2026, ks. script-lohkon `Size`-kommentti.
	 * HUOM: `0.75rem` on KIRJAIMELLINEN arvo, ei token-viittaus — tokens.css:n
	 * fonttikokoskaala alkaa `--font-size-sm`:stä (ei ole erillistä "xs"-
	 * tasoa), eikä tätä yhtä nappia varten ollut syytä lisätä uutta
	 * globaalia tokenia.
	 */
	.button--sm {
		padding: var(--space-1) var(--space-3);
		font-size: 0.75rem;
	}
</style>
