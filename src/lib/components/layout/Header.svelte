<script lang="ts">
	import { DISCORD_INVITE_URL } from '$app/env/public';
	import Button from '#lib/components/ui/Button.svelte';

	const navLinks = [
		{ href: '/kaudet', label: 'Kaudet' },
		{ href: '/kuljettajat', label: 'Kuljettajat' },
		{ href: '/radat', label: 'Radat' },
		{ href: '/tilastot', label: 'Tilastot' },
		{ href: '/hall-of-fame', label: 'Hall of Fame' }
	];

	// Mobiilivalikon auki/kiinni-tila. Pelkkä $state riittää — ei
	// tarvita $effectiä, koska mikään ei "synkronoidu" tämän kanssa,
	// vain napin klikkaus vaihtaa arvon suoraan.
	let mobileMenuOpen = $state(false);
</script>

<header class="site-header page-grid bleed">
	<div class="site-header__inner">
		<a href="/" class="site-header__logo">
			FISU<span class="site-header__logo-accent">.</span>
		</a>

		<nav aria-label="Päänavigaatio" class="site-header__nav site-header__nav--desktop">
			<ul>
				{#each navLinks as link (link.href)}
					<li><a href={link.href}>{link.label}</a></li>
				{/each}
			</ul>
		</nav>

		<div class="site-header__cta site-header__cta--desktop">
			<Button variant="ghost" href={DISCORD_INVITE_URL}>Discord</Button>
		</div>

		<button
			class="site-header__menu-toggle"
			aria-expanded={mobileMenuOpen}
			aria-controls="mobile-nav"
			onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
		>
			<span class="visually-hidden">{mobileMenuOpen ? 'Sulje valikko' : 'Avaa valikko'}</span>
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
				{#if mobileMenuOpen}
					<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				{:else}
					<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				{/if}
			</svg>
		</button>
	</div>

	{#if mobileMenuOpen}
		<nav id="mobile-nav" aria-label="Mobiilinavigaatio" class="site-header__nav--mobile">
			<ul>
				{#each navLinks as link (link.href)}
					<li><a href={link.href} onclick={() => (mobileMenuOpen = false)}>{link.label}</a></li>
				{/each}
				<li>
					<a href={DISCORD_INVITE_URL} onclick={() => (mobileMenuOpen = false)}>Discord</a>
				</li>
			</ul>
		</nav>
	{/if}
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in oklch, var(--color-bg) 85%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--color-surface-border);
	}

	.site-header__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding-block: var(--space-4);
	}

	.site-header__logo {
		font-size: var(--font-size-lg);
		font-weight: 900;
		letter-spacing: 0.02em;
	}

	.site-header__logo-accent {
		color: var(--color-info);
	}

	.site-header__nav ul {
		display: flex;
		gap: var(--space-6);
		list-style: none;
	}

	.site-header__nav a {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-muted);
		transition: color var(--duration-fast) var(--ease-out-quart);
	}

	.site-header__nav a:hover {
		color: var(--color-text);
	}

	.site-header__menu-toggle {
		display: flex;
		padding: var(--space-2);
		color: var(--color-text);
	}

	.site-header__nav--mobile {
		border-top: 1px solid var(--color-surface-border);
		padding-block: var(--space-2);
	}

	.site-header__nav--mobile ul {
		display: flex;
		flex-direction: column;
		list-style: none;
	}

	.site-header__nav--mobile a {
		display: block;
		padding: var(--space-3) 0;
		font-size: var(--font-size-base);
		font-weight: 600;
		color: var(--color-text);
	}

	/* Työpöytäversio näkyy, mobiiliversio piilossa — ja toisin päin */
	@media (max-width: 55rem) {
		.site-header__nav--desktop,
		.site-header__cta--desktop {
			display: none;
		}
	}

	@media (min-width: 55.01rem) {
		.site-header__menu-toggle,
		.site-header__nav--mobile {
			display: none;
		}
	}
</style>
