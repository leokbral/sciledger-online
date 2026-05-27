<script lang="ts">
	import NegotiationPage from '../../negotiation/[slug]/+page.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

{#if data?.assignmentLockedForAuthor}
	<div class="container page max-w-[700px] p-4 m-auto">
		<h4 class="h4 px-4 text-primary-500 font font-semibold">Reviewer Assignment</h4>
		<hr class="mt-2 mb-4 border-t-2!" />
		<div class="mt-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
			<div class="flex gap-3">
				<div class="text-sm text-blue-900">
					<strong>This paper is waiting for reviewer assignment by the Manager or Editor-in-Chief.</strong>
					<p class="mt-2">Authors cannot choose, assign, or invite reviewers while this paper is linked to a hub and is in review/correction.</p>
				</div>
			</div>
		</div>
	</div>
{:else}
	<NegotiationPage {data} />
{/if}
