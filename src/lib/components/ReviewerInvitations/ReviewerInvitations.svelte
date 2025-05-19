<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';

	let { reviewerInvitations } = $props();
	console.log('Reviewer Invitations', reviewerInvitations);
	// Mock de usuário
	// const mockUser: User = {
	// 	id: 'uuidv4()',
	// 	firstName: 'Carlos',
	// 	lastName: 'Silva',
	// 	country: 'Brazil',
	// 	dob: '1985-11-23',
	// 	username: 'carlos.silva',
	// 	email: 'carlos.silva@example.com',
	// 	password: 'hashed_password_123',
	// 	darkMode: true,
	// 	roles: {
	// 		author: true,
	// 		reviewer: true
	// 	},
	// 	bio: 'Pesquisador em inteligência artificial com foco em ética e aprendizado de máquina.',
	// 	profilePictureUrl: 'https://example.com/profiles/carlos_silva.jpg',
	// 	institution: 'Universidade de São Paulo',
	// 	position: 'Professor Associado',
	// 	performanceReviews: {
	// 		averageReviewDays: 12,
	// 		recommendations: ['Excelente avaliador técnico', 'Colabora com feedbacks detalhados'],
	// 		responseTime: 6, // horas
	// 		expertise: ['Machine Learning', 'AI Ethics', 'Data Science']
	// 	},
	// 	connections: ['user-abc123', 'user-def456'],
	// 	followers: [],
	// 	following: [],
	// 	papers: [],
	// 	hubs: ['hub-001', 'hub-002'],
	// 	createdAt: new Date('2024-10-15T14:00:00Z'),
	// 	updatedAt: new Date('2025-05-01T10:30:00Z')
	// };

	// let invitations = $state<ReviewQueue[]>([
	// 	{
	// 		_id: '663f74d7c2aadc8b6f1d39a1',
	// 		id: 'uuidv4()',
	// 		paperId: 'paper-987654321',
	// 		reviewer: mockUser,
	// 		peerReviewType: 'open',
	// 		hubId: 'hub-54321',
	// 		isLinkedToHub: true,
	// 		status: 'pending',
	// 		assignedAt: new Date('2025-05-01T10:00:00Z'),
	// 		respondedAt: undefined, // ainda não respondeu
	// 		createdAt: new Date('2025-05-01T09:50:00Z'),
	// 		updatedAt: new Date('2025-05-01T09:50:00Z')
	// 	}
	// ]);

	//let invitations = $state(reviewerInvitations);
	let loading = $state(false);

	async function loadInvitations() {
		try {
			const response = await fetch('/api/reviewer-invitations');
			const data = await response.json();
			if (response.ok) {
				reviewerInvitations = data.reviewerInvitations;
			}
		} catch (error) {
			console.error('Error loading reviewerInvitations:', error);
		}
	}

	async function handleInvitation(inviteId: string, action: 'accept' | 'reject') {
		loading = true;
		try {
			const response = await fetch(`/api/reviewer-invitations/${inviteId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});

			if (response.ok) {
				// Remove the invitation from the local state
				reviewerInvitations = reviewerInvitations.filter((invite: { _id: string; }) => invite._id !== inviteId);
				
				toaster.success({
					title: `Invitation ${action}ed`,
					description: `You have successfully ${action}ed the invitation.`
				});
			} else {
				const error = await response.json();
				throw new Error(error.message);
			}
		} catch (error) {
			console.error(`Error ${action}ing invitation:`, error);
			toaster.error({
				title: 'Error',
				description: `Failed to ${action} invitation.`
			});
		} finally {
			loading = false;
		}
	}

	onMount(loadInvitations);
</script>

<div class="space-y-4">
	<h2 class="text-xl font-semibold">Reviewer Invitations</h2>
	<div class="space-y-2">
		{#each reviewerInvitations as invite}
			<div class="card p-4 flex items-center justify-between">
				<div>
					<p class="font-medium">Invitation to review hub</p>
					<p class="text-sm text-gray-500">
						Received {new Date(invite.createdAt).toLocaleDateString()}
					</p>
				</div>
				<div class="flex gap-2">
					<button
						class="btn preset-filled-success-500"
						disabled={loading}
						onclick={() => handleInvitation(invite._id, 'accept')}
					>
						<Icon icon="mdi:check" class="mr-2" />
						Accept
					</button>
					<button
						class="btn preset-filled-error-500"
						disabled={loading}
						onclick={() => handleInvitation(invite._id, 'reject')}
					>
						<Icon icon="mdi:close" class="mr-2" />
						Reject
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>
