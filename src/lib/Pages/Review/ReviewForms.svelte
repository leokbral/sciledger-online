<script lang="ts">
	import type { FormType } from '$lib/types/FormType';
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Paper } from '$lib/types/Paper';

	export let paperTitle: string;
	export let paperId: string;
	export let reviewerId: string; // Adicionar prop para o ID do revisor
	export let paper: Paper | undefined = undefined; // Paper completo para verificar fase

	// Step state
	let currentStep = 0;
	const totalSteps = 4;

	// Controle de rodadas de revisão
	let hasSubmittedInCurrentRound = false;
	let currentRound: number = 1; // Default é primeira rodada
	let previousReview: any = null;
	let viewingPreviousReview = false; // Toggle para visualizar revisão anterior

	let form: FormType = {
		// Part I – Quantitative Evaluation
		originality: 0,
		clarity: 0,
		literatureReview: 0,
		theoreticalFoundation: 0,
		methodology: 0,
		reproducibility: 0,
		results: 0,
		figures: 0,
		limitations: 0,
		language: 0,
		impact: 0,

		// Part II – Qualitative Evaluation
		strengths: '',
		weaknesses: '',

		// Part III – Ethics
		involvesHumanResearch: '',
		ethicsApproval: '',

		// Part IV – Recommendation
		recommendation: ''
	};

	const criteria = [
		{
			name: 'originality',
			title: 'Originality and Contribution',
			description:
				'Does the article present new ideas, an innovative approach, and relevant contributions to the field?',
			options: [
				'1 – No originality',
				'2 – Slightly original',
				'3 – Moderately innovative',
				'4 – Quite original',
				'5 – Highly innovative'
			],
			weight: '15%'
		},
		{
			name: 'clarity',
			title: 'Clarity and Organization',
			description: 'Is the text well structured, with clear sections and logical presentation?',
			options: [
				'1 – Confusing and disorganized',
				'2 – Slightly clear',
				'3 – Acceptable',
				'4 – Clear and well-organized',
				'5 – Exceptionally clear'
			],
			weight: '8%'
		},
		{
			name: 'literatureReview',
			title: 'Literature Review',
			description: 'Is the literature review sufficient, current, and relevant?',
			options: [
				'1 – Missing or outdated',
				'2 – Incomplete',
				'3 – Satisfactory',
				'4 – Comprehensive',
				'5 – Very comprehensive and up-to-date'
			],
			weight: '7%'
		},
		{
			name: 'theoreticalFoundation',
			title: 'Theoretical Foundation',
			description:
				'Does the article present a solid conceptual basis well connected to the research problem?',
			options: [
				'1 – No theoretical basis',
				'2 – Weak or irrelevant theoretical basis',
				'3 – Adequate foundation',
				'4 – Good foundation and coherence',
				'5 – Excellent, deep and well-integrated foundation'
			],
			weight: '8%'
		},
		{
			name: 'methodology',
			title: 'Methodology',
			description:
				'Is the methodological design appropriate and well described for the proposed objectives?',
			options: [
				'1 – Inadequate',
				'2 – Slightly adequate',
				'3 – Partially adequate',
				'4 – Adequate',
				'5 – Very well grounded'
			],
			weight: '15%'
		},
		{
			name: 'reproducibility',
			title: 'Reproducibility / Transparency',
			description:
				'Do the described procedures allow the study to be replicated by other researchers?',
			options: [
				'1 – No reproducible information',
				'2 – Insufficient description',
				'3 – Moderately reproducible information',
				'4 – Clear and replicable methodology',
				'5 – Highly transparent and reproducible'
			],
			weight: '7%'
		},
		{
			name: 'results',
			title: 'Results and Analysis',
			description: 'Are the results clearly presented and critically analyzed?',
			options: [
				'1 – Weak or poorly presented',
				'2 – Unclear',
				'3 – Adequate',
				'4 – Good',
				'5 – Excellent and well discussed'
			],
			weight: '15%'
		},
		{
			name: 'figures',
			title: 'Figures and Tables',
			description: 'Are visual elements clear, useful, and well integrated with the text?',
			options: [
				'1 – Inadequate or missing',
				'2 – Unclear or excessive',
				'3 – Satisfactory',
				'4 – Well presented',
				'5 – Clear and high quality'
			],
			weight: '5%'
		},
		{
			name: 'limitations',
			title: 'Limitations Statement',
			description: 'Does the article acknowledge its limitations critically and honestly?',
			options: [
				'1 – Limitations ignored',
				'2 – Poorly discussed limitations',
				'3 – Adequate discussion of limitations',
				'4 – Well recognized and contextualized limitations',
				'5 – Excellent critical analysis of limitations'
			],
			weight: '5%'
		},
		{
			name: 'language',
			title: 'Language and Style',
			description: 'Is the article well written, without grammatical or stylistic errors?',
			options: [
				'1 – Many errors',
				'2 – Several errors',
				'3 – Some errors',
				'4 – Well written',
				'5 – Impeccable'
			],
			weight: '5%'
		},
		{
			name: 'impact',
			title: 'Impact Potential',
			description:
				'Does the work have theoretical, practical, or applied impact potential in the field?',
			options: [
				'1 – Irrelevant',
				'2 – Slightly relevant',
				'3 – Moderately relevant',
				'4 – Relevant',
				'5 – Highly relevant'
			],
			weight: '10%'
		}
	];

	function nextStep() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function goToStep(step: number) {
		currentStep = step;
	}

	let isSubmitting = false;
	let submitError = '';
	let submitSuccess = false;
	let isCollapsed = false;
	
	// Draft saving state
	let isSavingDraft = false;
	let draftSaveError = '';
	let draftSaveSuccess = false;
	let lastSavedTime = '';
	let isDraftLoaded = false;

	const dispatch = createEventDispatcher();

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
		dispatch('collapseToggle', { collapsed: isCollapsed });
	}

	// Load existing draft on component mount
	onMount(async () => {
		// Determinar a rodada atual baseada no paper.reviewRound
		if (paper) {
			// Use reviewRound from paper document (1 or 2)
			currentRound = paper.reviewRound || 1;
		}

		// Verificar se já existe uma revisão enviada nesta rodada
		await checkExistingReview();
		
		// Load previous review if in round 2
		if (currentRound === 2) {
			await loadPreviousReview();
		}
		
		// Carregar draft apenas se ainda não enviou revisão nesta rodada
		if (!hasSubmittedInCurrentRound) {
			await loadDraft();
		}
	});

	async function checkExistingReview() {
		try {
			const response = await fetch(`/api/reviews?paperId=${paperId}&reviewerId=${reviewerId}&reviewRound=${currentRound}`);
			
			if (response.ok) {
				const result = await response.json();
				hasSubmittedInCurrentRound = result.hasSubmitted;
				previousReview = result.review;
				
				if (hasSubmittedInCurrentRound && previousReview) {
					// Carregar os dados da revisão anterior para visualização
					form = { ...form, ...previousReview.form };
				}
			}
		} catch (error) {
			console.error('Error checking existing review:', error);
		}
	}

	async function loadPreviousReview() {
		try {
			const response = await fetch(`/api/reviews?paperId=${paperId}&reviewerId=${reviewerId}&reviewRound=1`);
			
			if (response.ok) {
				const result = await response.json();
				previousReview = result.review;
			}
		} catch (error) {
			console.error('Error loading previous review:', error);
		}
	}

	async function loadDraft() {
		try {
			const response = await fetch(`/api/reviews/draft?paperId=${paperId}&reviewerId=${reviewerId}`);
			
			if (response.ok) {
				const result = await response.json();
				if (result.draft) {
					form = { ...form, ...result.draft.form };
					isDraftLoaded = true;
					lastSavedTime = new Date(result.draft.updatedAt).toLocaleString();
				}
			}
		} catch (error) {
			console.error('Error loading draft:', error);
		}
	}

	async function saveDraft() {
		if (isSavingDraft) return;
		
		isSavingDraft = true;
		draftSaveError = '';
		draftSaveSuccess = false;

		try {
			const response = await fetch('/api/reviews/draft', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					paperId,
					reviewerId,
					paperTitle,
					form: {
						// Part I – Quantitative Evaluation
						originality: form.originality,
						clarity: form.clarity,
						literatureReview: form.literatureReview,
						theoreticalFoundation: form.theoreticalFoundation,
						methodology: form.methodology,
						reproducibility: form.reproducibility,
						results: form.results,
						figures: form.figures,
						limitations: form.limitations,
						language: form.language,
						impact: form.impact,

						// Part II – Qualitative Evaluation
						strengths: form.strengths,
						weaknesses: form.weaknesses,

						// Part III – Ethics
						involvesHumanResearch: form.involvesHumanResearch,
						ethicsApproval: form.ethicsApproval,

						// Part IV – Recommendation
						recommendation: form.recommendation
					}
				})
			});

			const result = await response.json();

			if (response.ok) {
				draftSaveSuccess = true;
				lastSavedTime = new Date().toLocaleString();
				console.log('Draft saved successfully:', result);
				
				// Clear success message after 3 seconds
				setTimeout(() => {
					draftSaveSuccess = false;
				}, 3000);
			} else {
				draftSaveError = result.error || 'Failed to save draft';
			}
		} catch (error) {
			console.error('Error saving draft:', error);
			draftSaveError = 'Network error. Please try again.';
		} finally {
			isSavingDraft = false;
		}
	}

	async function handleSubmit() {
		if (isSubmitting) return;
		
		if (hasSubmittedInCurrentRound) {
			submitError = `You have already submitted a review for round ${currentRound}. You can only submit another review in the next round.`;
			return;
		}
		
		isSubmitting = true;
		submitError = '';
		submitSuccess = false;

		try {
			const response = await fetch('/api/reviews', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					paperId,
					reviewerId,
					paperTitle,
					reviewRound: currentRound,
					form: {
						// Part I – Quantitative Evaluation
						originality: form.originality,
						clarity: form.clarity,
						literatureReview: form.literatureReview,
						theoreticalFoundation: form.theoreticalFoundation,
						methodology: form.methodology,
						reproducibility: form.reproducibility,
						results: form.results,
						figures: form.figures,
						limitations: form.limitations,
						language: form.language,
						impact: form.impact,

						// Part II – Qualitative Evaluation
						strengths: form.strengths,
						weaknesses: form.weaknesses,

						// Part III – Ethics
						involvesHumanResearch: form.involvesHumanResearch,
						ethicsApproval: form.ethicsApproval,

						// Part IV – Recommendation
						recommendation: form.recommendation
					}
				})
			});

			const result = await response.json();

			if (response.ok) {
				submitSuccess = true;
				console.log('Review submitted successfully:', result);
				
				// Clear draft after successful submission
				await clearDraft();
				
				// Dispatch event to parent component
				dispatch('reviewSubmitted', {
					paperId: paperId,
					reviewId: result.reviewId
				});
			} else {
				submitError = result.error || 'Failed to submit review';
			}
		} catch (error) {
			console.error('Error submitting review:', error);
			submitError = 'Network error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	async function clearDraft() {
		try {
			await fetch(`/api/reviews/draft?paperId=${paperId}&reviewerId=${reviewerId}`, {
				method: 'DELETE'
			});
		} catch (error) {
			console.error('Error clearing draft:', error);
		}
	}

	function calculateAverage() {
		const scores = [
			form.originality,
			form.clarity,
			form.literatureReview,
			form.theoreticalFoundation,
			form.methodology,
			form.reproducibility,
			form.results,
			form.figures,
			form.limitations,
			form.language,
			form.impact
		].filter((score) => score > 0);

		return scores.length > 0
			? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
			: '0.00';
	}

	function calculateWeightedAverage() {
		const weights = {
			originality: 0.15,
			clarity: 0.08,
			literatureReview: 0.07,
			theoreticalFoundation: 0.08,
			methodology: 0.15,
			reproducibility: 0.07,
			results: 0.15,
			figures: 0.05,
			limitations: 0.05,
			language: 0.05,
			impact: 0.10
		};

		let totalScore = 0;
		let totalWeight = 0;

		Object.entries(form).forEach(([key, score]) => {
			if (typeof score === 'number' && score > 0 && weights[key as keyof typeof weights]) {
				const weight = weights[key as keyof typeof weights];
				totalScore += score * weight;
				totalWeight += weight;
			}
		});

		return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : '0.00';
	}

	// Function to calculate score from any form object (for previous reviews)
	function calculateScore(formData: any) {
		if (!formData) return '0.00';
		
		const weights = {
			originality: 0.15,
			clarity: 0.08,
			literatureReview: 0.07,
			theoreticalFoundation: 0.08,
			methodology: 0.15,
			reproducibility: 0.07,
			results: 0.15,
			figures: 0.05,
			limitations: 0.05,
			language: 0.05,
			impact: 0.10
		};

		let totalScore = 0;
		let totalWeight = 0;

		Object.entries(formData).forEach(([key, score]) => {
			if (typeof score === 'number' && score > 0 && weights[key as keyof typeof weights]) {
				const weight = weights[key as keyof typeof weights];
				totalScore += score * weight;
				totalWeight += weight;
			}
		});

		return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : '0.00';
	}
</script>

<div class="w-full md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)]">
	<div class="w-full bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100 flex flex-col md:max-h-[calc(100vh-2rem)]">
		<!-- Header -->
		<div class="bg-blue-600 text-white p-6">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<h1 class="text-2xl font-bold">Scientific Article Review Form</h1>
					<h2 class="text-lg mt-2 opacity-90 truncate">{@html paperTitle}</h2>
				</div>
				<button
					class="shrink-0 rounded-md border border-white/30 px-3 py-1 text-sm font-medium text-white/95 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
					aria-expanded={!isCollapsed}
					onclick={toggleCollapse}
				>
					{isCollapsed ? 'Expand' : 'Minimize'}
				</button>
			</div>
		
		<!-- Review Round Indicator -->
		<div class="mt-3 flex items-center gap-2 flex-wrap">
			<span class="px-3 py-1 rounded-full text-xs font-semibold {currentRound === 2 ? 'bg-purple-500' : 'bg-blue-500'}">
				{#if currentRound === 1}
					🔵 First Review Round
				{:else}
					🟣 Second Review Round (After Author Corrections)
				{/if}
			</span>
			{#if hasSubmittedInCurrentRound}
				<span class="bg-green-500 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
					<span>✓</span> Review Submitted
				</span>
			{/if}
		</div>
		
		<!-- Second Round Notice -->
		{#if currentRound === 2}
			<div class="mt-3 bg-purple-100 text-purple-900 p-3 rounded border border-purple-300">
				<p class="text-sm font-medium">
					✨ This is the second review round. The author has made corrections to address feedback from the first round.
				</p>
				{#if previousReview}
					<button 
						class="mt-2 text-sm underline hover:no-underline bg-purple-200 px-2 py-1 rounded"
						onclick={() => viewingPreviousReview = !viewingPreviousReview}
					>
						{viewingPreviousReview ? '📝 Hide' : '👁️ View'} Your First Review
					</button>
				{/if}
			</div>
		{/if}
		
		<!-- Draft status -->
		{#if isDraftLoaded && lastSavedTime && !viewingPreviousReview}
			<div class="mt-3 text-sm opacity-80">
				<span class="bg-blue-500 px-2 py-1 rounded text-xs">DRAFT</span>
				Last saved: {lastSavedTime}
			</div>
		{/if}
		
		<!-- Warning if already submitted -->
		{#if hasSubmittedInCurrentRound}
			<div class="mt-3 bg-yellow-100 text-yellow-900 p-3 rounded border border-yellow-300">
				<p class="text-sm font-medium">{@html `You have already submitted a review for round ${currentRound}. You can only submit another review in the next round.`}</p>
			</div>
		{/if}

		{#if isCollapsed}
			<div class="mt-4 flex items-center gap-3 text-xs text-blue-100">
				<span>Step {currentStep + 1} of {totalSteps}</span>
				<div class="flex-1 h-1 rounded-full bg-blue-400/40">
					<div
						class="h-1 rounded-full bg-white/90"
						style="width: {((currentStep + 1) / totalSteps) * 100}%"
					></div>
				</div>
			</div>
		{/if}
	</div>

	{#if !isCollapsed}
		<div class="flex-1 overflow-y-auto">

	<!-- View Previous Review Section (Round 2 only) -->
	{#if currentRound === 2 && viewingPreviousReview && previousReview}
		<div class="bg-gray-50 border-l-4 border-purple-500 p-6">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-xl font-bold text-purple-900">👁️ Your First Round Review</h3>
				<button 
					class="text-sm underline text-purple-600 hover:text-purple-900"
					onclick={() => viewingPreviousReview = false}
				>
					Close
				</button>
			</div>
			
			<div class="grid grid-cols-2 gap-4 mb-4">
				<div class="bg-white p-3 rounded">
					<p class="text-xs text-gray-500 font-semibold">ORIGINALITY</p>
					<p class="text-2xl font-bold text-purple-600">{previousReview.form?.originality || 0}/5</p>
				</div>
				<div class="bg-white p-3 rounded">
					<p class="text-xs text-gray-500 font-semibold">CLARITY</p>
					<p class="text-2xl font-bold text-purple-600">{previousReview.form?.clarity || 0}/5</p>
				</div>
				<div class="bg-white p-3 rounded">
					<p class="text-xs text-gray-500 font-semibold">METHODOLOGY</p>
					<p class="text-2xl font-bold text-purple-600">{previousReview.form?.methodology || 0}/5</p>
				</div>
				<div class="bg-white p-3 rounded">
					<p class="text-xs text-gray-500 font-semibold">OVERALL SCORE</p>
					<p class="text-2xl font-bold text-purple-600">{previousReview.form ? calculateScore(previousReview.form) : '0.00'}/5</p>
				</div>
			</div>

			<div class="bg-white p-4 rounded mb-4">
				<h4 class="font-semibold text-purple-900 mb-2">✨ Strengths:</h4>
				<p class="text-gray-700 text-sm whitespace-pre-wrap">{previousReview.form?.strengths || 'N/A'}</p>
			</div>

			<div class="bg-white p-4 rounded mb-4">
				<h4 class="font-semibold text-purple-900 mb-2">⚠️ Weaknesses:</h4>
				<p class="text-gray-700 text-sm whitespace-pre-wrap">{previousReview.form?.weaknesses || 'N/A'}</p>
			</div>

			<div class="bg-white p-4 rounded">
				<h4 class="font-semibold text-purple-900 mb-2">📌 Recommendation:</h4>
				<p class="text-gray-700 text-sm">{previousReview.form?.recommendation || 'N/A'}</p>
			</div>

			{#if previousReview.createdAt}
				<div class="mt-4 pt-4 border-t border-gray-300">
					<p class="text-xs text-gray-500">Review submitted on {new Date(previousReview.createdAt).toLocaleDateString()}</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Progress Bar with Save Draft Button -->
	{#if !viewingPreviousReview}
	<div class="bg-gray-100 p-4">
		<div class="flex justify-between items-center mb-4">
			<div class="flex flex-1">
				{#each Array(totalSteps) as _, i}
					<button
						class="flex-1 text-center py-2 px-4 mx-1 rounded {currentStep === i
							? 'bg-blue-600 text-white'
							: 'bg-gray-200 hover:bg-gray-300'}"
						onclick={() => goToStep(i)}
					>
						Part {i + 1}
					</button>
				{/each}
			</div>
			
			<!-- Save Draft Button -->
			<button
				class="ml-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={isSavingDraft}
				onclick={saveDraft}
			>
				{#if isSavingDraft}
					<span class="flex items-center">
						<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Saving...
					</span>
				{:else}
					Save Draft
				{/if}
			</button>
		</div>
		
		<!-- Draft Messages -->
		{#if draftSaveError}
			<div class="mb-2 bg-red-50 border border-red-200 rounded-lg p-2">
				<p class="text-red-700 text-xs">{draftSaveError}</p>
			</div>
		{/if}

		{#if draftSaveSuccess}
			<div class="mb-2 bg-green-50 border border-green-200 rounded-lg p-2">
				<p class="text-green-700 text-xs">Draft saved successfully!</p>
			</div>
		{/if}
		
		<div class="w-full bg-gray-200 rounded-full h-2">
			<div
				class="bg-blue-600 h-2 rounded-full transition-all duration-300"
				style="width: {((currentStep + 1) / totalSteps) * 100}%"
			></div>
		</div>
	</div>

	<!-- Content -->
	<div class="p-6 min-h-[500px]">
		{#if currentStep === 0}
			<!-- Part I - Quantitative Evaluation -->
			<div class="space-y-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Part I – Quantitative Evaluation</h3>
				<p class="text-gray-600 mb-6">
					Assign scores from 1 (very poor) to 5 (excellent) based on the provided descriptions:
				</p>

				{#each criteria as criterio}
					<div class="border border-gray-200 rounded-lg p-4">
						<div class="flex justify-between items-start mb-3">
							<h4 class="font-medium text-gray-800">{criterio.title}</h4>
							<span class="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded"
								>Weight: {criterio.weight}</span
							>
						</div>
						<p class="text-gray-600 mb-4">{criterio.description}</p>

						<div class="space-y-2">
							{#each criterio.options as opcao, index}
								<label
									class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'} p-2 rounded"
								>
									<input
										type="radio"
										bind:group={form[criterio.name]}
										value={index + 1}
										disabled={hasSubmittedInCurrentRound}
										class="text-blue-600 focus:ring-blue-500"
									/>
									<span class="text-sm">{opcao}</span>
								</label>
							{/each}
						</div>
					</div>
				{/each}

				<div class="bg-blue-50 p-4 rounded-lg">
					<p class="font-medium">
						Average score: <span class="text-blue-600">{calculateAverage()}</span>
					</p>
				</div>
			</div>
		{:else if currentStep === 1}
			<!-- Part II - Qualitative Evaluation -->
			<div class="space-y-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Part II – Qualitative Evaluation</h3>

				<div class="space-y-4">
					<div>
						<label for="strengths" class="block text-sm font-medium text-gray-700 mb-2">
							1. Strengths of the article:
						</label>
						<p class="text-sm text-gray-600 mb-3">
							Write a paragraph or bullet points highlighting the main positive aspects of the
							manuscript.
						</p>
						<textarea
							id="strengths"
							bind:value={form.strengths}
							disabled={hasSubmittedInCurrentRound}
							rows="4"
							class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {hasSubmittedInCurrentRound ? 'bg-gray-100 cursor-not-allowed' : ''}"
							placeholder="Describe the strengths of the article..."
						></textarea>
					</div>

					<div>
						<label for="weaknesses" class="block text-sm font-medium text-gray-700 mb-2">
							2. Weaknesses and suggestions for improvement:
						</label>
						<p class="text-sm text-gray-600 mb-3">
							Indicate aspects that should be improved and offer constructive suggestions.
						</p>
						<textarea
							id="weaknesses"
							bind:value={form.weaknesses}
							disabled={hasSubmittedInCurrentRound}
							rows="4"
							class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {hasSubmittedInCurrentRound ? 'bg-gray-100 cursor-not-allowed' : ''}"
							placeholder="Describe the weaknesses and suggestions for improvement..."
						></textarea>
					</div>
				</div>
			</div>

		{:else if currentStep === 2}
			<!-- Part III - Research Ethics -->
			<div class="space-y-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Part III – Research Ethics</h3>

				<div class="space-y-4">
					<div>
						<p class="font-medium text-gray-700 mb-3">
							1. Does the study involve research with humans or animals that requires ethics
							committee approval?
						</p>
						<div class="space-y-2">
							<label class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
								<input
									type="radio"
									bind:group={form.involvesHumanResearch}
									value="yes"
									disabled={hasSubmittedInCurrentRound}
									class="text-blue-600 focus:ring-blue-500"
								/>
								<span>Yes, it involves research with humans and/or animals</span>
							</label>
							<label class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
								<input
									type="radio"
									bind:group={form.involvesHumanResearch}
									value="no"
									disabled={hasSubmittedInCurrentRound}
									class="text-blue-600 focus:ring-blue-500"
								/>
								<span>No, the work does not involve research with humans or animals</span>
							</label>
						</div>
					</div>

					{#if form.involvesHumanResearch === 'yes'}
						<div>
							<p class="font-medium text-gray-700 mb-3">
								2. If the answer above is "Yes", select one of the following:
							</p>
							<div class="space-y-2">
								<label class="flex items-start space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
									<input
										type="radio"
										bind:group={form.ethicsApproval}
										value="adequate"
										disabled={hasSubmittedInCurrentRound}
										class="text-blue-600 focus:ring-blue-500 mt-1"
									/>
										class="text-blue-600 focus:ring-blue-500 mt-1"
									/>
									<span
										>The manuscript properly cites the ethics committee approval documentation.</span
									>
								</label>
								<label class="flex items-start space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
									<input
										type="radio"
										bind:group={form.ethicsApproval}
										value="justified"
										disabled={hasSubmittedInCurrentRound}
										class="text-blue-600 focus:ring-blue-500 mt-1"
									/>
										class="text-blue-600 focus:ring-blue-500 mt-1"
									/>
									<span
										>The work lacks ethics approval, but adequately justifies its absence or
										mentions the approval process status.</span
									>
								</label>
								<label class="flex items-start space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
									<input
										type="radio"
										bind:group={form.ethicsApproval}
										value="absent"
										disabled={hasSubmittedInCurrentRound}
										class="text-blue-600 focus:ring-blue-500 mt-1"
									/>
										class="text-blue-600 focus:ring-blue-500 mt-1"
									/>
									<span>The manuscript does not mention ethics committee approval.</span>
								</label>
							</div>
						</div>
					{/if}
				</div>
			</div>

		{:else if currentStep === 3}
			<!-- Part IV - Final Recommendation -->
			<div class="space-y-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Part IV – Final Recommendation</h3>

				<div>
					<p class="font-medium text-gray-700 mb-4">Select one of the following options:</p>
					<div class="space-y-3">
						<label
							class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'} p-3 border border-gray-200 rounded-lg"
						>
							<input
								type="radio"
								bind:group={form.recommendation}
								value="accept_without_changes"
								disabled={hasSubmittedInCurrentRound}
								class="text-green-600 focus:ring-green-500"
							/>
							<span>Recommend for publication without modifications</span>
						</label>
						<label
							class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'} p-3 border border-gray-200 rounded-lg"
						>
							<input
								type="radio"
								bind:group={form.recommendation}
								value="accept_with_minor_revisions"
								disabled={hasSubmittedInCurrentRound}
								class="text-blue-600 focus:ring-blue-500"
							/>
							<span>Recommend for publication with minor revisions</span>
						</label>
						<label
							class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'} p-3 border border-gray-200 rounded-lg"
						>
							<input
								type="radio"
								bind:group={form.recommendation}
								value="major_revision"
								disabled={hasSubmittedInCurrentRound}
								class="text-yellow-600 focus:ring-yellow-500"
							/>
							<span>Major revision required before publication</span>
						</label>
						<label
							class="flex items-center space-x-3 {hasSubmittedInCurrentRound ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'} p-3 border border-gray-200 rounded-lg"
						>
							<input
								type="radio"
								bind:group={form.recommendation}
								value="reject"
								disabled={hasSubmittedInCurrentRound}
								class="text-red-600 focus:ring-red-500"
							/>
							<span>Do not recommend publication</span>
						</label>
					</div>
				</div>

				<!-- Summary -->
				<div class="bg-gray-50 p-4 rounded-lg">
					<h4 class="font-medium text-gray-800 mb-2">Review Summary</h4>
					<p class="text-sm text-gray-600">
						Simple average: <span class="font-medium">{calculateAverage()}</span>
					</p>
					<p class="text-sm text-gray-600">
						Weighted average: <span class="font-medium">{calculateWeightedAverage()}</span>
					</p>
					<p class="text-sm text-gray-600">
						Recommendation: <span class="font-medium">{form.recommendation || 'Not selected'}</span>
					</p>
				</div>

				<!-- Error/Success Messages -->
				{#if submitError}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-700 text-sm">{submitError}</p>
					</div>
				{/if}

				{#if submitSuccess}
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<p class="text-green-700 text-sm">Review submitted successfully!</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<div class="bg-gray-50 px-6 py-4 flex justify-between">
		<button
			class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={currentStep === 0}
			onclick={prevStep}
		>
			Back
		</button>

		{#if currentStep === totalSteps - 1}
			<div class="flex space-x-3">
				<!-- Save Draft Button (additional in final step) -->
				<button
					class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isSavingDraft}
					onclick={saveDraft}
				>
					{#if isSavingDraft}
						Saving...
					{:else}
						Save Draft
					{/if}
				</button>
				
				<!-- Submit Button (disabled if already submitted in this round) -->
				<button
					class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isSubmitting || submitSuccess || hasSubmittedInCurrentRound}
					onclick={handleSubmit}
				>
					{#if isSubmitting}
						<span class="flex items-center">
							<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Submitting...
						</span>
					{:else if submitSuccess}
						Review Submitted ✓
					{:else}
						Submit Review
					{/if}
				</button>
			</div>
		{:else}
			<button
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				onclick={nextStep}
			>
				Next
			</button>
		{/if}
	</div>
	{/if}
	</div>
	{/if}
	</div>
</div>

