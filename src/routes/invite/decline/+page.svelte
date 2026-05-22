<script lang="ts">
	let { data, form } = $props();

	const categoryLabels: Record<string, string> = {
		lack_of_time: 'I do not have enough time right now',
		conflict_of_interest: 'I have a conflict of interest',
		outside_expertise: 'This topic is outside my expertise',
		already_overloaded: 'I already have too many review assignments',
		other: 'Other reason'
	};
</script>

<div class="min-h-screen flex items-center justify-center bg-surface-100 px-4 py-8">
	<div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
		{#if form?.success}
			<h1 class="text-2xl font-bold text-surface-900">Invitation Declined</h1>
			<p class="mt-3 text-surface-600">
				Thank you for your response. The hub manager has been informed that you declined this review invitation.
			</p>
			<div class="mt-6">
				<a href="/" class="btn preset-filled-primary-500">Go to Home</a>
			</div>
		{:else if !data.valid}
			<h1 class="text-2xl font-bold text-surface-900">Unable to Decline Invitation</h1>
			<p class="mt-3 text-surface-600">{data.error}</p>
			<div class="mt-6">
				<a href="/" class="btn preset-filled-primary-500">Go to Home</a>
			</div>
		{:else}
			<h1 class="text-2xl font-bold text-surface-900">Decline Reviewer Invitation</h1>
			<p class="mt-2 text-sm text-surface-600">
				Email: <strong>{data.email}</strong>
			</p>
			<p class="mt-1 text-sm text-surface-600">
				Please help us by sharing why you cannot accept this invitation.
			</p>

			<form method="POST" class="mt-6 space-y-4">
				<input type="hidden" name="token" value={data.token || ''} />

				<div>
					<label for="category" class="label">Reason</label>
					<select id="category" name="category" class="input mt-1" required>
						<option value="" disabled selected>Select a reason</option>
						{#each data.categories as category}
							<option value={category}>{categoryLabels[category] || category}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="reason" class="label">Additional details (optional)</label>
					<textarea
						id="reason"
						name="reason"
						rows="5"
						maxlength="1000"
						class="input mt-1"
						placeholder="You can add extra context to help the hub manager."
					></textarea>
				</div>

				{#if form?.error}
					<p class="text-sm text-error-600">{form.error}</p>
				{/if}

				<div class="flex gap-3">
					<button type="submit" class="btn preset-filled-error-500">Submit Decline</button>
					<a href="/" class="btn preset-tonal-surface-500">Cancel</a>
				</div>
			</form>
		{/if}
	</div>
</div>
