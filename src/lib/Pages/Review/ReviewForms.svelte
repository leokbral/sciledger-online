<script lang="ts">
    export let paperTitle: string;
    
	let form = {
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

<div class="max-w-2xl mx-auto space-y-6">
    <div class="space-y-2">
        <h1 class="text-2xl font-bold">Review Form</h1>
        <h2 class="text-xl text-gray-700">{paperTitle}</h2>
    </div>

    <!-- Dynamic Select Fields -->
    {#each fields as { key, label, options }}
        <div class="space-y-1">
            <label class="block font-semibold">{label}</label>
            <select bind:value={form[key]} class="w-full border p-2 rounded" required>
                <option value="" disabled selected>Select an option</option>
                {#each options as option}
                    <option value={option}>{option}</option>
                {/each}
            </select>
        </div>
    {/each}

    <!-- Comments -->
    <div class="space-y-2">
        <label class="block font-semibold">11. Confidential Comments to Editors</label>
        <textarea bind:value={form.confidentialComments} rows="3" class="w-full border p-2 rounded" />

        <label class="block font-semibold">12. Comments to Authors</label>
        <textarea bind:value={form.commentsToAuthor} rows="5" class="w-full border p-2 rounded" required />
    </div>

    <!-- Submit -->
    <button on:click={handleSubmit} class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Submit Review
    </button>
</div>
