<script lang="ts">
	let name = $state('');
	let email = $state('');
	let topic = $state('General support');
	let message = $state('');

	const supportEmail = 'sciledger@imd.ufrn.br';

	function contactSupport() {
		const subject = encodeURIComponent(`SciLedger support - ${topic}`);
		const body = encodeURIComponent(
			[`Name: ${name}`, `Email: ${email}`, `Topic: ${topic}`, '', 'Message:', message].join('\n')
		);

		window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
	}
</script>

<svelte:head>
	<title>Contact Support | SciLedger Help</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<a href="/help" class="text-sm font-medium text-primary-700 hover:text-primary-800"
			>Back to Help</a
		>
		<h1 class="mt-3 text-3xl font-bold text-gray-900">Contact Support</h1>
		<p class="mt-2 text-gray-600">Need help with SciLedger? Send a message to our support team.</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<form
			class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
			onsubmit={(event) => {
				event.preventDefault();
				contactSupport();
			}}
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="space-y-2">
					<span class="text-sm font-semibold text-gray-800">Name</span>
					<input
						bind:value={name}
						required
						type="text"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none"
						placeholder="Your name"
					/>
				</label>

				<label class="space-y-2">
					<span class="text-sm font-semibold text-gray-800">Email</span>
					<input
						bind:value={email}
						required
						type="email"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none"
						placeholder="you@example.com"
					/>
				</label>
			</div>

			<label class="mt-4 block space-y-2">
				<span class="text-sm font-semibold text-gray-800">Topic</span>
				<select
					bind:value={topic}
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none"
				>
					<option>General support</option>
					<option>Account access</option>
					<option>Paper submission</option>
					<option>Review process</option>
					<option>Hub management</option>
					<option>Payment issue</option>
					<option>Bug report</option>
				</select>
			</label>

			<label class="mt-4 block space-y-2">
				<span class="text-sm font-semibold text-gray-800">Message</span>
				<textarea
					bind:value={message}
					required
					rows="7"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none"
					placeholder="Tell us what happened and include links, paper titles, or screenshots if useful."
				></textarea>
			</label>

			<div class="mt-6 flex flex-wrap items-center gap-3">
				<button type="submit" class="btn preset-filled-primary-500">Contact Support</button>
				<a href={`mailto:${supportEmail}`} class="btn preset-outlined">Email directly</a>
			</div>
		</form>

		<aside class="rounded-xl border border-blue-200 bg-blue-50 p-6">
			<h2 class="text-lg font-semibold text-blue-950">Support email</h2>
			<a
				class="mt-2 block font-semibold text-primary-700 hover:text-primary-800"
				href={`mailto:${supportEmail}`}
			>
				{supportEmail}
			</a>
			<p class="mt-4 text-sm leading-6 text-gray-700">
				For faster support, include your account email, the page where the issue happened, and any
				relevant paper or hub name.
			</p>
		</aside>
	</div>
</div>
