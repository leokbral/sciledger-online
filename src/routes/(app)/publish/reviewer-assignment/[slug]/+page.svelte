<script lang="ts">
	import NegotiationPage from '../../negotiation/[slug]/+page.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<NegotiationPage {data} />
