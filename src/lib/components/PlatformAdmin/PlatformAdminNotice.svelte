<script lang="ts">
	import Icon from '@iconify/svelte';

	/**
	 * Explains to a platform super administrator why a paper they have no Hub role
	 * for is open in front of them.
	 *
	 * Without this, the page is indistinguishable from the one a Hub owner or an
	 * assigned reviewer sees, and nothing tells the person that they are outside
	 * the editorial team of this Hub — or that the visit was recorded.
	 *
	 * Rendered only when the platform role is what granted the access. Someone who
	 * is both a super administrator and a member of the Hub sees the ordinary page,
	 * because for that paper they are there by their own Hub role.
	 */
	interface Props {
		/** Which lens the page is being shown through. */
		view?: 'reader' | 'reviewer' | 'editor';
		/** Links to the same paper seen through another role's page. */
		otherViews?: Array<{ label: string; href: string }>;
	}

	let { view = 'reader', otherViews = [] }: Props = $props();

	const VIEW_LABEL: Record<NonNullable<Props['view']>, string> = {
		reader: 'the read-only view',
		reviewer: "a reviewer's view",
		editor: "an editor's view"
	};
</script>

<aside
	class="mb-6 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-950/40"
	role="note"
>
	<div class="flex items-start gap-3">
		<Icon
			icon="mdi:shield-account-outline"
			class="mt-0.5 size-5 shrink-0 text-primary-700 dark:text-primary-300"
		/>
		<div class="space-y-1">
			<p class="text-sm font-semibold text-primary-900 dark:text-primary-100">
				You are seeing this paper because you are a super user
			</p>
			<p class="text-sm leading-6 text-primary-800 dark:text-primary-200">
				You are not a member of this Hub. You are looking at {VIEW_LABEL[view]} as a platform administrator,
				so nothing here can be edited or decided, and this visit was recorded in the platform activity
				log.
			</p>
		</div>
	</div>

	{#if otherViews.length > 0}
		<div class="flex flex-wrap items-center gap-2 pl-8">
			<span
				class="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300"
			>
				See the same paper as
			</span>
			{#each otherViews as other (other.href)}
				<a
					href={other.href}
					class="rounded-full border border-primary-300 bg-white px-3 py-1 text-xs font-medium text-primary-800 transition hover:bg-primary-100 dark:border-primary-700 dark:bg-surface-900 dark:text-primary-200"
				>
					{other.label}
				</a>
			{/each}
		</div>
	{/if}
</aside>
