<script lang="ts">
	/**
	 * Badge lukee oman värinsä data-accent-attribuutista tavallisella
	 * CSS-attribuuttiselektorilla ([data-accent="success"] jne.).
	 *
	 * HUOM (suunnitelman luku 3.4 vs. tämä komponentti): tyypitetty
	 * attr() + container style query -yhdistelmä on tarkoitettu
	 * tilanteisiin joissa VANHEMPI elementti asettaa data-*-attribuutin
	 * ja USEAMPI eri LAPSIKOMPONENTTI lukee sen resoluution (esim.
	 * DriverCard.svelte, jossa data-density valuu kortin useaan eri
	 * sisäosaan). Badge lukee VAIN OMAN itsensä attribuutin — silloin
	 * tavallinen attribuuttiselektori on yksinkertaisempi, laajemmin
	 * tuettu ja täsmälleen yhtä oikea valinta. Ei kannata käyttää
	 * monimutkaisempaa työkalua kuin tarvitaan.
	 */
	import type { Snippet } from 'svelte';

	type Accent = 'success' | 'danger' | 'warning' | 'info' | 'special';

	let { accent = 'info', children }: { accent?: Accent; children: Snippet } = $props();
</script>

<span class="badge" data-accent={accent}>
	{@render children()}
</span>

<style>
	.badge {
		--badge-color: var(--color-info);

		display: inline-flex;
		align-items: center;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		background: color-mix(in oklch, var(--badge-color) 20%, var(--color-bg));
		color: var(--badge-color);
		border: 1px solid color-mix(in oklch, var(--badge-color) 45%, transparent);
	}

	.badge[data-accent='success'] {
		--badge-color: var(--color-success);
	}
	.badge[data-accent='danger'] {
		--badge-color: var(--color-danger);
	}
	.badge[data-accent='warning'] {
		--badge-color: var(--color-warning);
	}
	.badge[data-accent='info'] {
		--badge-color: var(--color-info);
	}
	.badge[data-accent='special'] {
		--badge-color: var(--color-special);
	}
</style>
