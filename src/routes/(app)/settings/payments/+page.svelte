<script lang="ts">
	import SettingsCard from '$lib/components/Settings/SettingsCard.svelte';
	import SettingsField from '$lib/components/Settings/SettingsField.svelte';
	import StatusBadge from '$lib/components/Settings/StatusBadge.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type ReviewerPaymentsView = {
		stripeConnectAccountId: string;
		onboardingComplete: boolean;
		detailsSubmitted: boolean;
		chargesEnabled: boolean;
		payoutsEnabled: boolean;
		defaultCurrency: string;
		totalEarnedCents: number;
		totalPaidOutCents: number;
		pendingPayoutCents: number;
		onboardingStartedAt: string | Date | null;
		onboardingCompletedAt: string | Date | null;
		lastPayoutAt: string | Date | null;
	};

	function normalizePayments(
		input: Partial<ReviewerPaymentsView> | null | undefined
	): ReviewerPaymentsView {
		return {
			stripeConnectAccountId: input?.stripeConnectAccountId ?? '',
			onboardingComplete: !!input?.onboardingComplete,
			detailsSubmitted: !!input?.detailsSubmitted,
			chargesEnabled: !!input?.chargesEnabled,
			payoutsEnabled: !!input?.payoutsEnabled,
			defaultCurrency: input?.defaultCurrency ?? 'brl',
			totalEarnedCents: Number(input?.totalEarnedCents ?? 0),
			totalPaidOutCents: Number(input?.totalPaidOutCents ?? 0),
			pendingPayoutCents: Number(input?.pendingPayoutCents ?? 0),
			onboardingStartedAt: input?.onboardingStartedAt ?? null,
			onboardingCompletedAt: input?.onboardingCompletedAt ?? null,
			lastPayoutAt: input?.lastPayoutAt ?? null
		};
	}

	let { data }: Props = $props();
	let isLoading = $state(false);
	let feedback = $state('');
	let feedbackType = $state<'success' | 'error' | 'info'>('info');

	const isReviewer = data.isReviewer;
	let reviewerPayments = $state<ReviewerPaymentsView | null>(
		data.reviewerPayments ? normalizePayments(data.reviewerPayments) : null
	);

	function currencyFromCents(value: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format((value || 0) / 100);
	}

	async function refreshStatus() {
		isLoading = true;
		feedback = '';

		try {
			const response = await fetch('/api/stripe/connect/status');
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to load Stripe account status.');
			}

			reviewerPayments = payload.reviewerPayments
				? normalizePayments(payload.reviewerPayments as Partial<ReviewerPaymentsView>)
				: reviewerPayments;
			feedbackType = 'success';
			feedback = 'Stripe status updated successfully.';
		} catch (error: unknown) {
			feedbackType = 'error';
			feedback = error instanceof Error ? error.message : 'Failed to update Stripe status.';
		} finally {
			isLoading = false;
		}
	}

	async function startOnboarding() {
		isLoading = true;
		feedback = '';

		try {
			const response = await fetch('/api/stripe/connect/onboarding-link', { method: 'POST' });
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to create Stripe Connect onboarding link.');
			}

			reviewerPayments = payload.accountStatus
				? {
						...normalizePayments(reviewerPayments || undefined),
						stripeConnectAccountId: payload.accountId,
						onboardingComplete: payload.accountStatus.onboardingComplete,
						detailsSubmitted: payload.accountStatus.detailsSubmitted,
						chargesEnabled: payload.accountStatus.chargesEnabled,
						payoutsEnabled: payload.accountStatus.payoutsEnabled,
						defaultCurrency: payload.accountStatus.defaultCurrency
					}
				: reviewerPayments;

			window.location.href = payload.onboardingUrl;
		} catch (error: unknown) {
			feedbackType = 'error';
			feedback =
				error instanceof Error ? error.message : 'Failed to start Stripe Connect onboarding.';
			isLoading = false;
		}
	}

	async function openDashboard() {
		isLoading = true;
		feedback = '';

		try {
			const response = await fetch('/api/stripe/connect/dashboard-link', { method: 'POST' });
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to open Stripe dashboard.');
			}

			window.location.href = payload.dashboardUrl;
		} catch (error: unknown) {
			feedbackType = 'error';
			feedback = error instanceof Error ? error.message : 'Failed to open Stripe dashboard.';
			isLoading = false;
		}
	}
</script>

{#if feedback}
	<div
		class={`rounded-md border px-4 py-3 text-sm ${
			feedbackType === 'error'
				? 'border-red-300 bg-red-50 text-red-700'
				: feedbackType === 'success'
					? 'border-green-300 bg-green-50 text-green-700'
					: 'border-blue-300 bg-blue-50 text-blue-700'
		}`}
	>
		{feedback}
	</div>
{/if}

{#if isReviewer}
	<SettingsCard
		title="Stripe Connect"
		description="Connect your account to receive payments automatically after the final review is submitted."
	>
		<div class="grid gap-3 md:grid-cols-2">
			<SettingsField label="Connected Account" boxed>
				<p class="text-sm font-medium break-all">
					{reviewerPayments?.stripeConnectAccountId
						? reviewerPayments.stripeConnectAccountId
						: 'Not connected'}
				</p>
			</SettingsField>

			<SettingsField label="Onboarding" boxed>
				<StatusBadge
					label={reviewerPayments?.onboardingComplete ? 'Complete' : 'Pending'}
					tone={reviewerPayments?.onboardingComplete ? 'success' : 'warning'}
					variant={reviewerPayments?.onboardingComplete ? 'filled' : 'outlined'}
				/>
			</SettingsField>

			<SettingsField label="Charges Enabled" boxed>
				<StatusBadge
					label={reviewerPayments?.chargesEnabled ? 'Yes' : 'No'}
					tone={reviewerPayments?.chargesEnabled ? 'success' : 'warning'}
					variant={reviewerPayments?.chargesEnabled ? 'filled' : 'outlined'}
				/>
			</SettingsField>

			<SettingsField label="Payouts Enabled" boxed>
				<StatusBadge
					label={reviewerPayments?.payoutsEnabled ? 'Yes' : 'No'}
					tone={reviewerPayments?.payoutsEnabled ? 'success' : 'warning'}
					variant={reviewerPayments?.payoutsEnabled ? 'filled' : 'outlined'}
				/>
			</SettingsField>
		</div>

		<div class="grid gap-3 md:grid-cols-3">
			<SettingsField
				label="Total Paid Out"
				value={currencyFromCents(reviewerPayments?.totalPaidOutCents || 0)}
				boxed
			/>
			<SettingsField
				label="Total Earned"
				value={currencyFromCents(reviewerPayments?.totalEarnedCents || 0)}
				boxed
			/>
			<SettingsField
				label="Pending"
				value={currencyFromCents(reviewerPayments?.pendingPayoutCents || 0)}
				boxed
			/>
		</div>

		<div class="flex flex-wrap gap-3">
			<button class="btn preset-filled" onclick={startOnboarding} disabled={isLoading}>
				{reviewerPayments?.stripeConnectAccountId ? 'Update Stripe Onboarding' : 'Connect Stripe'}
			</button>
			<button class="btn preset-tonal" onclick={refreshStatus} disabled={isLoading}>
				Refresh Status
			</button>
			<button
				class="btn preset-tonal"
				onclick={openDashboard}
				disabled={isLoading || !reviewerPayments?.stripeConnectAccountId}
			>
				Open Stripe Dashboard
			</button>
		</div>

		<p class="text-xs text-surface-500-400">
			Pending payments are processed automatically after the final review is submitted.
		</p>
	</SettingsCard>
{/if}
