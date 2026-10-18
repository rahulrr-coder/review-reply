<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<!-- Anek covers Latin and all eight Indic scripts we reply in; unicode-range means only scripts on screen download. -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Anek+Latin:wdth,wght@75..125,400..800&family=Anek+Devanagari:wght@400..700&family=Anek+Tamil:wght@400..700&family=Anek+Telugu:wght@400..700&family=Anek+Kannada:wght@400..700&family=Anek+Malayalam:wght@400..700&family=Anek+Bangla:wght@400..700&family=Anek+Gujarati:wght@400..700&family=IBM+Plex+Mono:wght@500;600&display=swap"
	/>
</svelte:head>

{@render children()}
