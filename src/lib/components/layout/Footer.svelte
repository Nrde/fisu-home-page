<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="site-footer page-grid bleed">
	<div class="site-footer__inner">
		<p>&copy; {year} Finnish Simracing United</p>
		<p class="site-footer__muted">fisu.simu.fi</p>
	</div>
</footer>

<style>
	.site-footer {
		border-top: 1px solid var(--color-surface-border);
		margin-top: var(--space-16);
	}

	.site-footer__inner {
		display: flex;
		justify-content: space-between;
		padding-block: var(--space-6);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.site-footer__muted {
		color: var(--color-text-faint);
	}
</style>
