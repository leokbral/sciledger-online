<script lang="ts">
	import { page } from '$app/stores';

	let message = 'This invitation is no longer valid.';

	$effect(() => {
		const reason = $page.url.searchParams.get('reason');
		if (reason) {
			message = reason;
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-surface-100 px-4">
	<div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
		<h1 class="text-2xl font-bold text-surface-900">Invitation Invalid</h1>
		<p class="mt-3 text-surface-600">
			{message}
		</p>
		<p class="mt-4 text-sm text-surface-500">
			If you believe this is a mistake, check whether a newer invitation was sent and use the latest link, or request a new invitation from the hub manager.
		</p>
		<div class="mt-6">
			<a href="/" class="btn preset-filled-primary-500">Go to Home</a>
		</div>
	</div>
</div>
