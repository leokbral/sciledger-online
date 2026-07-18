<script lang="ts">
	interface Props {
		title: string;
		subtitle: string;
		label?: string;
	}

	let { title, subtitle, label }: Props = $props();
</script>

<header class="rounded-lg border border-surface-200 bg-surface-50 p-5 md:p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
		<div class="max-w-3xl space-y-2">
			{#if label}
				<span
					class="inline-flex w-fit rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase text-primary-700"
				>
					{label}
				</span>
			{/if}
			<h1 class="text-2xl font-semibold leading-tight text-surface-950 md:text-3xl">{title}</h1>
			<p class="text-sm leading-relaxed text-surface-600 md:text-base">{subtitle}</p>
		</div>
	</div>
</header>
