<script lang="ts">
	/**
	 * Muutosloki-modaali — UUSI 27.9.2026, käyttäjän pyyntö ("kun klikataan
	 * avautuu sivu, tai modaali tai jotain ei-häiritsevää"). Natiivi
	 * `<dialog>`-elementti valittu TARKOITUKSELLA sen sijaan että
	 * rakennettaisiin oma overlay+fokuslukko käsin: selain hoitaa
	 * fokusloukun, Esc-sulkemisen ja `::backdrop`:n ilmaiseksi, eikä
	 * projektiin tarvitse uutta riippuvuutta pelkän modaalin takia.
	 *
	 * Avaus/sulkeutuminen ohjataan KUTSUJALTA (Footer.svelte) `dialogRef`:n
	 * kautta (`$bindable`) — tämä komponentti ei itse tiedä MILLOIN sen
	 * pitäisi olla auki, vain MITÄ näyttää kun se on.
	 */
	import type { ChangelogEntry } from '#lib/utils/changelog.ts';
	import { formatChangelogDate } from '#lib/utils/changelog.ts';

	let {
		entries,
		dialogRef = $bindable()
	}: {
		entries: ChangelogEntry[];
		dialogRef?: HTMLDialogElement;
	} = $props();

	/**
	 * Klikkaus `<dialog>`-elementin OMAAN taustaan (ei sisällön päälle)
	 * sulkee sen — natiivi `<dialog>` ei tee tätä itsestään, `showModal()`
	 * avattu dialogi täyttää koko `::backdrop`-alueen omana laatikkonaan,
	 * joten `event.target === dialogRef` erottaa "klikattiin taustaa"
	 * -tapauksen "klikattiin sisältöä" -tapauksesta ilman erillistä
	 * overlay-diviä.
	 */
	function onBackdropClick(event: MouseEvent) {
		if (event.target === dialogRef) dialogRef?.close();
	}
</script>

<dialog bind:this={dialogRef} class="changelog-dialog" onclick={onBackdropClick}>
	<div class="changelog-dialog__content">
		<div class="changelog-dialog__header">
			<h2 class="changelog-dialog__title">Muutosloki</h2>
			<button
				type="button"
				class="changelog-dialog__close"
				aria-label="Sulje muutosloki"
				onclick={() => dialogRef?.close()}
			>
				✕
			</button>
		</div>

		{#if entries.length === 0}
			<p class="changelog-dialog__empty">Ei vielä muutoslokimerkintöjä.</p>
		{:else}
			<ul class="changelog-dialog__list">
				{#each entries as entry, index (entry.date?.getTime() ?? index)}
					<li class="changelog-entry">
						<h3 class="changelog-entry__date">
							{entry.date ? formatChangelogDate(entry.date) : 'Ajankohta tuntematon'}
						</h3>
						<ul class="changelog-entry__items">
							{#each entry.items as item, itemIndex (itemIndex)}
								<li>{item}</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</dialog>

<style>
	.changelog-dialog {
		width: min(560px, calc(100vw - var(--space-8)));
		max-height: min(720px, calc(100vh - var(--space-12)));
		padding: 0;
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text);
		/*
		 * BUGIKORJAUS (29.9.2026, käyttäjän raportoima kaksi pystyvierityspalkkia):
		 * natiivi `<dialog>` saa selaimen OMASTA UA-tyylitiedostosta valmiiksi
		 * `overflow: auto`in — kun sisältö ylitti `max-height`in, SEKÄ tämä
		 * elementti ETTÄ `.changelog-dialog__list` (oma `overflow-y: auto`,
		 * ks. alempana) vierittivät samaan aikaan. `overflow: hidden` tässä
		 * poistaa ULOMMAN vierityksen — otsikko+sulje-nappi pysyvät aina
		 * paikallaan, VAIN `.changelog-dialog__list` vierittää.
		 */
		overflow: hidden;
	}

	/* Natiivi `<dialog>`:n oma taustahimmennys — sama tummuusaste kaikkialla sivustolla käytetylle overlaylle. */
	.changelog-dialog::backdrop {
		background: color-mix(in oklch, black 60%, transparent);
	}

	.changelog-dialog__content {
		display: flex;
		flex-direction: column;
		max-height: inherit;
		/* Ilman tätä flex-lapsen oletus min-height on "auto" (= sisällön oma
		   korkeus), jolloin tämä laatikko kasvaisi sisältönsä mukana YLI
		   `max-height inherit`:in sen sijaan että antaisi tilaa alla olevan
		   `.changelog-dialog__list`:in OMALLE vieritykselle. */
		min-height: 0;
		padding: var(--space-6);
	}

	.changelog-dialog__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.changelog-dialog__title {
		font-size: var(--font-size-lg);
		font-weight: 800;
	}

	.changelog-dialog__close {
		flex-shrink: 0;
		padding: var(--space-1) var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-base);
		transition: color var(--duration-fast) var(--ease-out-quart);
	}

	.changelog-dialog__close:hover {
		color: var(--color-text);
	}

	.changelog-dialog__empty {
		color: var(--color-text-faint);
	}

	.changelog-dialog__list {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		/* `flex: 1 1 auto` + `min-height: 0` antavat TÄMÄN elementin kutistua
		   pienemmäksi kuin oma sisältönsä flex-kontainerin (`.changelog-dialog__
		   content`) sisällä — ilman `min-height: 0`:aa flex-lapsen oletus on
		   sisällön oma korkeus, jolloin `overflow-y: auto` ei koskaan pääsisi
		   vaikuttamaan (tila loppuisi aina ensin YLEMMÄLTÄ elementiltä). */
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		/* `reset.css` nollaa vain marginaalin, ei `<ul>`:n oletuspaddingia/pisteitä — sama tunnettu korjaus kuin muuallakin sivustolla. */
		list-style: none;
		padding: 0;
	}

	.changelog-entry__date {
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.changelog-entry__items {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		list-style: none;
		padding: 0;
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.changelog-entry__items li {
		padding-left: var(--space-4);
		position: relative;
	}

	.changelog-entry__items li::before {
		content: '–';
		position: absolute;
		left: 0;
		color: var(--color-text-faint);
	}
</style>
