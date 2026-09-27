<script lang="ts">
	/**
	 * UUSI 27.9.2026, käyttäjän pyyntö: julkaisun ajankohta footeriin,
	 * klikattavana avaa muutosloki-modaalin (ks. ChangelogDialog.svelte).
	 * `latestChangelogDate` luetaan `src/lib/content/changelog.md`:stä
	 * BUILD-aikana (`?raw`-tuonti, ks. changelog.ts) — ei erillistä API-
	 * kutsua eikä versionumeroa ylläpidetä kahdessa paikassa.
	 */
	import ChangelogDialog from '#lib/components/ui/ChangelogDialog.svelte';
	import { changelogEntries, formatChangelogDate, latestChangelogDate } from '#lib/utils/changelog.ts';

	const year = new Date().getFullYear();

	let changelogDialogRef = $state<HTMLDialogElement>();
</script>

<footer class="site-footer page-grid bleed">
	<div class="site-footer__inner">
		<p>&copy; {year} Finnish Simracing United</p>
		<div class="site-footer__right">
			{#if latestChangelogDate}
				<button type="button" class="site-footer__changelog-trigger" onclick={() => changelogDialogRef?.showModal()}>
					Muutosloki – {formatChangelogDate(latestChangelogDate)}
				</button>
			{/if}
			<p class="site-footer__muted">fisu.simu.fi</p>
		</div>
	</div>
</footer>

<ChangelogDialog entries={changelogEntries} bind:dialogRef={changelogDialogRef} />

<style>
	.site-footer {
		border-top: 1px solid var(--color-surface-border);
		margin-top: var(--space-16);
	}

	.site-footer__inner {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-2) var(--space-4);
		padding-block: var(--space-6);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.site-footer__right {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-2) var(--space-4);
	}

	.site-footer__muted {
		color: var(--color-text-faint);
	}

	/*
	 * "Ei-häiritsevä" (käyttäjän oma sana) laukaisin: näyttää tekstiltä
	 * eikä isolta napilta, sama hillitty tyyli kuin `.site-footer__muted`,
	 * VAIN alleviivaus hover:issa paljastaa että se on klikattava — footer
	 * ei ole paikka isoille CTA-napeille.
	 */
	.site-footer__changelog-trigger {
		color: inherit;
		font-size: inherit;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 0.2em;
		transition: text-decoration-color var(--duration-fast) var(--ease-out-quart);
	}

	.site-footer__changelog-trigger:hover {
		text-decoration-color: currentColor;
	}
</style>
