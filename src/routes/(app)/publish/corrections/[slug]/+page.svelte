<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperReviewPage from '$lib/Pages/Paper/PaperReviewPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { Review } from '$lib/types/Review';
	import type { PageData } from './$types';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper = data.paper;
	let currentUser = data.user;
	let messageFeed = data.messageFeed;
	let users: Array<{ id: string; firstName: string; lastName: string }> = data.users as Array<{ id: string; firstName: string; lastName: string }>;

	// Function to get reviewer name by ID
	function getReviewerName(reviewerId: string | any): string {
		console.log('Looking for reviewer with ID:', reviewerId);
		console.log('Available users:', users);
		
		// Handle if reviewerId is an object with id property
		const actualReviewerId = typeof reviewerId === 'object' ? reviewerId?.id || reviewerId?._id : reviewerId;
		
		console.log('Actual reviewer ID to search:', actualReviewerId);
		
		const reviewer = users.find((user: any) => {
			return user.id === actualReviewerId || user._id === actualReviewerId;
		});
		
		console.log('Found reviewer:', reviewer);
		
		if (reviewer) {
			return `${reviewer.firstName} ${reviewer.lastName}`;
		}
		
		// If not found, try to extract from reviewerId object if it has name properties
		if (typeof reviewerId === 'object' && reviewerId?.firstName) {
			return `${reviewerId.firstName} ${reviewerId.lastName}`;
		}
		
		return `Reviewer ID: ${actualReviewerId || 'Unknown'}`;
	}

	// Function to get recommendation text
	function getRecommendationText(recommendation: string): string {
		const recommendations: Record<string, string> = {
			accept_without_changes: 'Accept without changes',
			accept_with_minor_revisions: 'Accept with minor revisions',
			major_revision: 'Major revision required',
			reject: 'Reject'
		};
		return recommendations[recommendation] || recommendation;
	}

	// Function to get recommendation badge class
	function getRecommendationClass(recommendation: string): string {
		const classes: Record<string, string> = {
			accept_without_changes: 'bg-green-100 text-green-800',
			accept_with_minor_revisions: 'bg-yellow-100 text-yellow-800',
			major_revision: 'bg-orange-100 text-orange-800',
			reject: 'bg-red-100 text-red-800'
		};
		return classes[recommendation] || 'bg-gray-100 text-gray-800';
	}

	// Function to format criteria name
	function formatCriteriaName(key: string): string {
		const names: Record<string, string> = {
			originality: 'Originality',
			clarity: 'Clarity',
			literatureReview: 'Literature Review',
			theoreticalFoundation: 'Theoretical Foundation',
			methodology: 'Methodology',
			reproducibility: 'Reproducibility',
			results: 'Results',
			figures: 'Figures',
			limitations: 'Limitations',
			language: 'Language',
			impact: 'Impact'
		};
		return names[key] || key;
	}

	let correctionProgress: Record<string, boolean> = $state({});

	// Function to toggle correction completion
	function toggleCorrection(reviewIndex: number, type: 'weaknesses' | 'criterion', identifier: string) {
		const key = `${reviewIndex}-${type}-${identifier}`;
		correctionProgress[key] = !correctionProgress[key];
	}

	// Function to calculate completion percentage
	function getCompletionPercentage(): number {
		const totalItems = Object.keys(correctionProgress).length;
		const completedItems = Object.values(correctionProgress).filter(Boolean).length;
		return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
	}

	// Function to get all unique weaknesses/areas for improvement
	function getAllCriticalComments(): string[] {
		if (!paper.peer_review?.reviews) return [];
		
		const comments: string[] = [];
		paper.peer_review.reviews.forEach((review, index) => {
			if (review.qualitativeEvaluation?.weaknesses) {
				comments.push(`Review ${index + 1}: ${review.qualitativeEvaluation.weaknesses}`);
			}
		});
		return comments;
	}

	// Function to get lowest scoring criteria
	function getLowestScoringCriteria(): Array<{criterion: string, scores: number[], average: number}> {
		if (!paper.peer_review?.reviews) return [];
		
		const criteriaScores: Record<string, number[]> = {};
		
		paper.peer_review.reviews.forEach(review => {
			if (review.quantitativeEvaluation) {
				Object.entries(review.quantitativeEvaluation).forEach(([criterion, score]) => {
					if (!criteriaScores[criterion]) criteriaScores[criterion] = [];
					criteriaScores[criterion].push(score);
				});
			}
		});

		return Object.entries(criteriaScores)
			.map(([criterion, scores]) => ({
				criterion: formatCriteriaName(criterion),
				scores,
				average: scores.reduce((sum, score) => sum + score, 0) / scores.length
			}))
			.filter(item => item.average < 3.5) // Show criteria with average below 3.5
			.sort((a, b) => a.average - b.average);
	}

	// Function to count recommendations
	function getRecommendationSummary(): Record<string, number> {
		if (!paper.peer_review?.reviews) return {};
		
		const summary: Record<string, number> = {};
		paper.peer_review.reviews.forEach(review => {
			const rec = review.recommendation;
			summary[rec] = (summary[rec] || 0) + 1;
		});
		return summary;
	}

	async function handleSavePaper(event: { detail: { store: Paper } }) {
		console.log('Updated Paper Data:', event.detail.store);
		const updatedPaper = event.detail.store;
		console.log('Saving Updated Paper:', updatedPaper);

		try {
			const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper);

			if (response.paper) {
				goto(`/publish/`);
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.log(error);
			alert('An error occurred. Please try again.');
		}
	}

	async function hdlSubmitPublish(event: CustomEvent) {
		let { newMessage } = event.detail;
		console.log(event.detail);
		newMessage = { ...newMessage, sender: newMessage.sender.id, _id: newMessage.id };

		console.log(newMessage);

		try {
			const response = await fetch(`/publish/corrections/${data.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newMessage,
					id: messageFeed?.id
				})
			});
			console.log(response.body);
			if (!response.ok) {
				const errorData = await response.json();
				console.error('Erro ao enviar mensagem:', errorData);
				alert(`Erro: ${errorData.error}`);
			}
		} catch (error) {
			console.error('Erro na requisição:', error);
		}
	}
</script>

<!-- Main Container -->
<div class="max-w-7xl mx-auto px-4 py-6">
	<!-- Debug section - remove after fixing -->
	<!-- <div class="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs">
		<h4 class="font-bold mb-2">Debug Information:</h4>
		<p><strong>Users count:</strong> {users?.length || 0}</p>
		<p><strong>First user sample:</strong> {JSON.stringify(users?.[0] || 'No users')}</p>
		<p><strong>Reviews count:</strong> {paper.peer_review?.reviews?.length || 0}</p>
		{#if paper.peer_review?.reviews?.length > 0}
			<p><strong>First review reviewerId:</strong> {JSON.stringify(paper.peer_review.reviews[0].reviewerId)}</p>
		{/if}
	</div> -->

	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Article Corrections Required</h1>
		<p class="text-gray-600">
			Review the feedback from peer reviewers and make the necessary corrections to your article.
		</p>
		<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<h3 class="font-semibold text-blue-800 mb-2">📋 Article Information</h3>
			<p><strong>Title:</strong> {paper.title}</p>
			<p><strong>Status:</strong> <span class="capitalize">{paper.status}</span></p>
			<p><strong>Submitted:</strong> {new Date(paper.createdAt).toLocaleDateString()}</p>
		</div>
	</div>

	<!-- Critical Summary Section -->
	{#if paper.peer_review && paper.peer_review.reviews && paper.peer_review.reviews.length > 0}
		<div class="mb-8 bg-white rounded-lg shadow-md p-6">
			<h2 class="text-2xl font-semibold text-gray-800 mb-4">🎯 Priority Corrections Summary</h2>
			
			<!-- Recommendation Overview -->
			<div class="mb-6">
				<h3 class="text-lg font-semibold text-gray-700 mb-3">📊 Reviewer Recommendations</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each Object.entries(getRecommendationSummary()) as [recommendation, count]}
						<div class="p-3 rounded-lg border {getRecommendationClass(recommendation)}">
							<div class="text-2xl font-bold">{count}</div>
							<div class="text-sm">{getRecommendationText(recommendation)}</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Areas Needing Most Attention -->
			{#if getLowestScoringCriteria().length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold text-gray-700 mb-3">⚠️ Areas Requiring Most Attention</h3>
					<div class="space-y-3">
						{#each getLowestScoringCriteria() as { criterion, average, scores }}
							<div class="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
								<div>
									<span class="font-semibold text-red-800">{criterion}</span>
									<span class="text-sm text-red-600 ml-2">
										(Scores: {scores.join(', ')})
									</span>
								</div>
								<div class="text-lg font-bold text-red-600">
									{average.toFixed(1)}/5.0
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- All Critical Comments -->
			{#if getAllCriticalComments().length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold text-gray-700 mb-3">📝 All Critical Comments to Address</h3>
					<div class="space-y-4">
						{#each getAllCriticalComments() as comment, index}
							<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
								<div class="flex items-start gap-3">
									<span class="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
										{index + 1}
									</span>
									<div class="text-yellow-800 whitespace-pre-wrap flex-1">
										{comment}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Review Summary Section -->
	{#if paper.peer_review && paper.peer_review.reviews && paper.peer_review.reviews.length > 0}
		<div class="mb-8 bg-white rounded-lg shadow-md p-6">
			<h2 class="text-2xl font-semibold text-gray-800 mb-4">
				📋 Review Summary ({paper.peer_review.reviews.length} review{paper.peer_review.reviews.length !== 1 ? 's' : ''})
			</h2>
			
			<!-- Overall Status -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div class="bg-blue-50 p-4 rounded-lg">
					<h3 class="font-semibold text-blue-800">Average Score</h3>
					<p class="text-2xl font-bold text-blue-600">
						{paper.peer_review.averageScore ? paper.peer_review.averageScore.toFixed(1) : 'N/A'}/5.0
					</p>
				</div>
				<div class="bg-green-50 p-4 rounded-lg">
					<h3 class="font-semibold text-green-800">Reviews Completed</h3>
					<p class="text-2xl font-bold text-green-600">{paper.peer_review.reviewCount || 0}</p>
				</div>
				<div class="bg-purple-50 p-4 rounded-lg">
					<h3 class="font-semibold text-purple-800">Status</h3>
					<p class="text-lg font-medium text-purple-600 capitalize">
						{paper.peer_review.reviewStatus?.replace('_', ' ') || 'Unknown'}
					</p>
				</div>
			</div>

			<!-- Individual Reviews -->
			{#each paper.peer_review.reviews as review, index}
				<div class="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
					<div class="flex justify-between items-start mb-4">
						<h3 class="text-xl font-semibold text-gray-800">
							🔍 Review #{index + 1}
						</h3>
						<div class="flex flex-col items-end gap-2">
							<span class="px-3 py-1 rounded-full text-sm font-medium {getRecommendationClass(review.recommendation)}">
								{getRecommendationText(review.recommendation)}
							</span>
							{#if review.averageScore}
								<span class="text-lg font-bold text-gray-700">
									Score: {review.averageScore.toFixed(1)}/5.0
								</span>
							{/if}
						</div>
					</div>

					<!-- Reviewer Info -->
					<div class="mb-4 p-3 bg-white rounded border">
						<p class="text-sm text-gray-600">
							<strong>Reviewer:</strong> {getReviewerName(review.reviewerId)}
						</p>
						<!-- Debug info - remove this after fixing
						<p class="text-xs text-gray-400 mt-1">
							<strong>Debug - Reviewer ID:</strong> {JSON.stringify(review.reviewerId)}
						</p> -->
						{#if review.submissionDate}
							<p class="text-sm text-gray-600">
								<strong>Submitted:</strong> {new Date(review.submissionDate).toLocaleDateString()}
							</p>
						{/if}
					</div>

					<!-- Quantitative Scores -->
					{#if review.quantitativeEvaluation}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-700 mb-3">📊 Quantitative Evaluation</h4>
							<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
								{#each Object.entries(review.quantitativeEvaluation) as [criterion, score]}
									<div class="bg-white p-3 rounded border">
										<div class="text-sm font-medium text-gray-700">{formatCriteriaName(criterion)}</div>
										<div class="text-lg font-bold text-blue-600">{score}/5</div>
										<div class="w-full bg-gray-200 rounded-full h-2 mt-1">
											<div 
												class="bg-blue-600 h-2 rounded-full" 
												style="width: {(score / 5) * 100}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Qualitative Evaluation -->
					{#if review.qualitativeEvaluation}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-700 mb-3">💭 Detailed Reviewer Feedback</h4>
							
							{#if review.qualitativeEvaluation.strengths}
								<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
									<h5 class="font-semibold text-green-800 mb-2 flex items-center gap-2">
										✅ Strengths Recognized by Reviewer
									</h5>
									<div class="text-green-700 whitespace-pre-wrap leading-relaxed">
										{review.qualitativeEvaluation.strengths}
									</div>
								</div>
							{/if}

							{#if review.qualitativeEvaluation.weaknesses}
								<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
									<h5 class="font-semibold text-red-800 mb-2 flex items-center gap-2">
										⚠️ Critical Areas Requiring Attention
									</h5>
									<div class="text-red-700 whitespace-pre-wrap leading-relaxed">
										{review.qualitativeEvaluation.weaknesses}
									</div>
									<div class="mt-3 p-3 bg-white border border-red-300 rounded">
										<h6 class="font-medium text-red-800 text-sm mb-1">💡 Action Items:</h6>
										<ul class="text-sm text-red-700 space-y-1">
											<li>• Address each concern mentioned above in your revision</li>
											<li>• Provide clear explanations for any changes made</li>
											<li>• Consider adding supplementary information if needed</li>
										</ul>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Ethics Review -->
					{#if review.ethics}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-700 mb-3">🔒 Ethics Review</h4>
							<div class="bg-white p-4 rounded border">
								{#if review.ethics.involvesHumanResearch}
									<p class="mb-2">
										<strong>Involves Human Research:</strong> 
										<span class="capitalize">{review.ethics.involvesHumanResearch}</span>
									</p>
								{/if}
								{#if review.ethics.ethicsApproval}
									<p>
										<strong>Ethics Approval:</strong> 
										<span class="capitalize">{review.ethics.ethicsApproval.replace('_', ' ')}</span>
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Review Status -->
					<div class="flex justify-between items-center pt-4 border-t border-gray-200">
						<span class="text-sm text-gray-500">
							Status: <span class="capitalize font-medium">{review.status}</span>
						</span>
						{#if review.completionDate}
							<span class="text-sm text-gray-500">
								Completed: {new Date(review.completionDate).toLocaleDateString()}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
			<h2 class="text-xl font-semibold text-yellow-800 mb-2">⚠️ No Reviews Available</h2>
			<p class="text-yellow-700">
				No peer review data is currently available for this article. 
				Please contact the editorial team if you believe this is an error.
			</p>
		</div>
	{/if}

	<!-- Action Items Section -->
	<div class="mb-8 bg-white rounded-lg shadow-md p-6">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-2xl font-semibold text-gray-800">📋 Correction Checklist</h2>
			<div class="flex items-center gap-4">
				<div class="text-sm text-gray-600">
					Progress: {getCompletionPercentage()}% complete
				</div>
				<div class="w-32 bg-gray-200 rounded-full h-2">
					<div 
						class="bg-green-600 h-2 rounded-full transition-all duration-300" 
						style="width: {getCompletionPercentage()}%"
					></div>
				</div>
			</div>
		</div>
		
		{#if paper.peer_review && paper.peer_review.reviews && paper.peer_review.reviews.length > 0}
			<div class="space-y-6">
				{#each paper.peer_review.reviews as review, reviewIndex}
					<div class="border border-gray-200 rounded-lg p-4">
						<h3 class="font-semibold text-gray-800 mb-3">Review #{reviewIndex + 1} Corrections</h3>
						
						<!-- Low-scoring criteria to address -->
						{#if review.quantitativeEvaluation}
							{#each Object.entries(review.quantitativeEvaluation) as [criterion, score]}
								{#if score < 3.5}
									<div class="flex items-center gap-3 p-2 mb-2 bg-orange-50 rounded">
										<input 
											type="checkbox" 
											id="criterion-{reviewIndex}-{criterion}"
											bind:checked={correctionProgress[`${reviewIndex}-criterion-${criterion}`]}
											class="w-4 h-4 text-blue-600"
										/>
										<label for="criterion-{reviewIndex}-{criterion}" class="flex-1 text-sm">
											<span class="font-medium">Improve {formatCriteriaName(criterion)}</span>
											<span class="text-orange-600">(scored {score}/5)</span>
										</label>
									</div>
								{/if}
							{/each}
						{/if}

						<!-- Critical comments to address -->
						{#if review.qualitativeEvaluation?.weaknesses}
							<div class="flex items-start gap-3 p-2 mb-2 bg-red-50 rounded">
								<input 
									type="checkbox" 
									id="weakness-{reviewIndex}"
									bind:checked={correctionProgress[`${reviewIndex}-weaknesses-main`]}
									class="w-4 h-4 text-blue-600 mt-1"
								/>
								<label for="weakness-{reviewIndex}" class="flex-1 text-sm">
									<span class="font-medium text-red-800">Address critical feedback:</span>
									<div class="text-red-700 mt-1 text-xs">
										{review.qualitativeEvaluation.weaknesses.substring(0, 150)}...
									</div>
								</label>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-600">No specific actions required at this time.</p>
		{/if}
	</div>

	<!-- Helpful Tips Section -->
	<div class="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-200">
		<h2 class="text-2xl font-semibold text-blue-800 mb-4">💡 Tips for Making Effective Corrections</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div>
				<h3 class="font-semibold text-blue-700 mb-3">📝 General Guidelines</h3>
				<ul class="space-y-2 text-blue-600 text-sm">
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Address each reviewer comment systematically
					</li>
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Be specific about changes made in response to feedback
					</li>
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Maintain the academic tone and structure
					</li>
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Double-check all citations and references
					</li>
				</ul>
			</div>
			<div>
				<h3 class="font-semibold text-blue-700 mb-3">🎯 Priority Areas</h3>
				<ul class="space-y-2 text-blue-600 text-sm">
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Focus on criteria scored below 3.5 first
					</li>
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Address all "weaknesses" comments thoroughly
					</li>
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Strengthen methodology and results sections
					</li>
					<li class="flex items-start gap-2">
						<span class="text-blue-500 mt-1">•</span>
						Improve clarity and readability where noted
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Paper Content Section -->
	<div class="bg-white rounded-lg shadow-md">
		<div class="p-6 border-b border-gray-200">
			<div class="flex justify-between items-center">
				<div>
					<h2 class="text-2xl font-semibold text-gray-800">📄 Your Article</h2>
					<p class="text-gray-600 mt-1">
						Review your article content and make necessary corrections based on reviewer feedback.
					</p>
				</div>
				<div class="flex flex-col items-end gap-2">
					<button 
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
					>
						📋 Back to Review Summary
					</button>
					<span class="text-sm text-gray-500">
						{getCompletionPercentage()}% corrections completed
					</span>
				</div>
			</div>
		</div>
		
		<div class="p-6">
			<PaperReviewPage
				{paper}
				{currentUser}
				{messageFeed}
			/>
		</div>
	</div>
</div>
