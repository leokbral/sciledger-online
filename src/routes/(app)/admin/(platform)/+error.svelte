<script lang="ts">
	import { page } from '$app/state';

	const titles: Record<number, string> = {
		401: 'Sign in required',
		403: 'Forbidden',
		404: 'Not found'
	};

	const descriptions: Record<number, string> = {
		401: 'This area requires an authenticated session. Sign in and try again.',
		403: 'Your account does not hold platform super administrator access. If you believe it should, ask a platform operator to run the super administrator bootstrap for your account.',
		404: 'That administration record does not exist, or it was removed.'
	};

	let status = $derived(page.status);
	let title = $derived(titles[status] ?? 'Something went wrong');
	let description = $derived(
		descriptions[status] ?? 'The administration area could not load this view.'
	);
</script>

<svelte:head>
	<title>{title} | SciLedger Administration</title>
</svelte:head>

<section class="mx-auto max-w-2xl py-12">
	<div class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
		<p class="text-sm font-semibold uppercase tracking-wide text-slate-500">{status}</p>
		<h1 class="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
		<p class="mt-3 text-sm leading-6 text-slate-600">{description}</p>

		{#if page.error?.message && status >= 500}
			<p class="mt-4 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
				{page.error.message}
			</p>
		{/if}

		<div class="mt-6 flex flex-wrap gap-3">
			{#if status === 401}
				<a href="/login" class="btn preset-filled-primary-500">Sign in</a>
			{/if}
			<a href="/" class="btn preset-outlined">Back to SciLedger</a>
		</div>
	</div>
</section>
