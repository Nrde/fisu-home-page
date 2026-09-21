<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/styles/tokens.css';
	import '#lib/styles/reset.css';
	import '#lib/styles/global.css';
	import Header from '#lib/components/layout/Header.svelte';
	import Footer from '#lib/components/layout/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a href="#main" class="skip-link">Siirry pääsisältöön</a>

<Header />

<main id="main">
	{@render children()}
</main>

<Footer />
