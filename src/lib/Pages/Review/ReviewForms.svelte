<script lang="ts">
	export let paperTitle: string;

	type FormKey =
		| 'paperId'
		| 'paperTitle'
		| 'technicalCorrectness'
		| 'novelty'
		| 'figuresQuality'
		| 'experimentalQuality'
		| 'reproducibility'
		| 'importance'
		| 'clarity'
		| 'length'
		| 'generalOverview'
		| 'recommendation'
		| 'confidentialComments'
		| 'commentsToAuthor';

	type Form = {
		[key in FormKey]: string | number;
	};

	let form: Form = {
		paperId: 0,
		paperTitle: '',
		technicalCorrectness: '',
		novelty: '',
		figuresQuality: '',
		experimentalQuality: '',
		reproducibility: '',
		importance: '',
		clarity: '',
		length: '',
		generalOverview: '',
		recommendation: '',
		confidentialComments: '',
		commentsToAuthor: ''
	};

	const ratings = ['Excellent', 'Good', 'Acceptable', 'Fair', 'Very Poor'];
	const lengths = ['Too Short', 'Acceptable', 'Too Long'];
	const recommendations = ['Accept', 'Weak accept', 'Indifferent', 'Weak reject', 'Reject'];

	const fields = [
		{ key: 'technicalCorrectness', label: '1. Technical Correctness', options: ratings },
		{ key: 'novelty', label: '2. Novelty/Originality', options: ratings },
		{ key: 'figuresQuality', label: '3. Quality of Figures and Tables', options: ratings },
		{ key: 'experimentalQuality', label: '4. Quality of Experimental Results', options: ratings },
		{ key: 'reproducibility', label: '5. Reproducibility and Replicability', options: ratings },
		{ key: 'importance', label: '6. Importance of the Field', options: ratings },
		{ key: 'clarity', label: '7. Organization and Clarity', options: ratings },
		{ key: 'length', label: '8. Length', options: lengths },
		{ key: 'generalOverview', label: '9. General Overview', options: ratings },
		{ key: 'recommendation', label: '10. Recommendation', options: recommendations }
	];

	function handleSubmit() {
		console.log('Review submitted:', form);
		// aqui vai o POST para sua API
	}
</script>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8 space-y-8">
		<div class="border-b pb-4">
			<h1 class="text-3xl font-bold text-gray-800">Review Form</h1>
			<h2 class="text-xl text-gray-600 mt-2">{paperTitle}</h2>
		</div>

		<!-- Dynamic Select Fields -->
		<div class="grid gap-6">
			{#each fields as { key, label, options }, i}
				<div class="space-y-2">
					<label class="block text-sm font-medium text-gray-700" for={'review-' + key}>
						{label}
					</label>
					<select
						id={'review-' + key}
						bind:value={form[key]}
						class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
						required
					>
						<option value="" disabled selected>Select an option</option>
						{#each options as option}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</div>
			{/each}
		</div>

		<!-- Comments -->
		<div class="space-y-6">
			<div class="space-y-2">
				<label for="confidential-comments" class="block text-sm font-medium text-gray-700">
					11. Confidential Comments to Editors
				</label>
				<textarea
					id="confidential-comments"
					bind:value={form.confidentialComments}
					rows="3"
					class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
				></textarea>
			</div>

			<div class="space-y-2">
				<label for="comments-to-authors" class="block text-sm font-medium text-gray-700">
					12. Comments to Authors
				</label>
				<textarea
					id="comments-to-authors"
					bind:value={form.commentsToAuthor}
					rows="5"
					class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
					required
				></textarea>
			</div>
		</div>

		<!-- Submit -->
		<div class="pt-4 border-t">
			<button
				on:click={handleSubmit}
				class="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
			>
				Submit Review
			</button>
		</div>
	</div>
</div>
