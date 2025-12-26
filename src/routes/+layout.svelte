<script lang="ts">
	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: "Inter", sans-serif;
		background-color: #0f172a;
		color: #e0e0e0;
	}

	:global(:root) {
		--term-bg: #0c0c0c;
		--term-session-bg: #000000;
		--term-border: #333333;
		--term-text: #cccccc;
		--term-green: #00ff41;
		--term-cyan: #00ffff;
		--term-red: #ff3333;
		--term-yellow: #ffff00;
		--term-font: "Consolas", "Monaco", "Courier New", monospace;
	}

	:global(.inline-error-message) {
		color: #f48771;
		font-style: italic;
		margin-left: 0.5em;
	}

	:global(.error-line-highlight) {
		background-color: rgba(255, 0, 0, 0.1);
	}

	:global(.error-glyph) {
		background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="%23f48771"/><text x="8" y="11" text-anchor="middle" font-size="10" fill="white" font-weight="bold">✕</text></svg>')
			center center no-repeat;
		width: 16px;
	}
</style>
