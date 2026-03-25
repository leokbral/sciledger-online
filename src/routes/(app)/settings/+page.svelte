<script lang="ts">
	import { goto } from '$app/navigation';
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

		function normalizePayments(input: Partial<ReviewerPaymentsView> | null | undefined): ReviewerPaymentsView {
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
				throw new Error(payload?.error || 'Falha ao carregar status da conta Stripe');
			}

			reviewerPayments = payload.reviewerPayments
				? normalizePayments(payload.reviewerPayments as Partial<ReviewerPaymentsView>)
				: reviewerPayments;
			feedbackType = 'success';
			feedback = 'Status Stripe atualizado com sucesso.';
		} catch (error: unknown) {
			feedbackType = 'error';
			feedback = error instanceof Error ? error.message : 'Erro ao atualizar status Stripe';
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
				throw new Error(payload?.error || 'Falha ao gerar onboarding do Stripe Connect');
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
			feedback = error instanceof Error ? error.message : 'Erro ao iniciar onboarding Stripe Connect';
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
				throw new Error(payload?.error || 'Falha ao abrir dashboard Stripe');
			}

			window.location.href = payload.dashboardUrl;
		} catch (error: unknown) {
			feedbackType = 'error';
			feedback = error instanceof Error ? error.message : 'Erro ao abrir dashboard Stripe';
			isLoading = false;
		}
	}

</script>

<section class="space-y-6 max-w-3xl mx-auto">
	<header class="space-y-1">
		<h1 class="text-3xl font-bold">Settings</h1>
		<p class="text-surface-600-400">
			Configure sua conta e seus recebimentos de revisao via Stripe Connect.
		</p>
	</header>

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

	<div class="grid gap-4 md:grid-cols-2">
		<div class="card border rounded-lg p-5 space-y-2">
			<h2 class="text-lg font-semibold">Conta</h2>
			<p class="text-sm text-surface-600-400">{data.user.firstName} {data.user.lastName}</p>
			<p class="text-sm text-surface-600-400">@{data.user.username}</p>
			<p class="text-sm text-surface-600-400">{data.user.email}</p>
		</div>

		<div class="card border rounded-lg p-5 space-y-2">
			<h2 class="text-lg font-semibold">Perfil de Revisor</h2>
			<p class="text-sm text-surface-600-400">
				{#if isReviewer}
					Revisor habilitado
				{:else}
					Seu usuario ainda nao esta habilitado como revisor
				{/if}
			</p>
		</div>
	</div>

	{#if isReviewer}
		<div class="card border rounded-lg p-5 space-y-4">
			<div class="flex flex-col gap-1">
				<h2 class="text-xl font-semibold">Stripe Connect</h2>
				<p class="text-sm text-surface-600-400">
					Conecte sua conta para receber pagamentos automaticamente apos a revisao final.
				</p>
			</div>

			<div class="grid gap-3 md:grid-cols-2">
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Conta conectada</p>
					<p class="font-semibold">
						{reviewerPayments?.stripeConnectAccountId
							? reviewerPayments.stripeConnectAccountId
							: 'Nao conectada'}
					</p>
				</div>
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Onboarding</p>
					<p class="font-semibold">
						{reviewerPayments?.onboardingComplete ? 'Completo' : 'Pendente'}
					</p>
				</div>
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Charges habilitados</p>
					<p class="font-semibold">{reviewerPayments?.chargesEnabled ? 'Sim' : 'Nao'}</p>
				</div>
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Payouts habilitados</p>
					<p class="font-semibold">{reviewerPayments?.payoutsEnabled ? 'Sim' : 'Nao'}</p>
				</div>
			</div>

			<div class="grid gap-3 md:grid-cols-3">
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Total recebido</p>
					<p class="font-semibold">{currencyFromCents(reviewerPayments?.totalPaidOutCents || 0)}</p>
				</div>
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Total ganho</p>
					<p class="font-semibold">{currencyFromCents(reviewerPayments?.totalEarnedCents || 0)}</p>
				</div>
				<div class="rounded-md border p-3">
					<p class="text-xs uppercase tracking-wide opacity-70">Pendente</p>
					<p class="font-semibold">{currencyFromCents(reviewerPayments?.pendingPayoutCents || 0)}</p>
				</div>
			</div>

			<div class="flex flex-wrap gap-3">
				<button class="btn preset-filled" onclick={startOnboarding} disabled={isLoading}>
					{reviewerPayments?.stripeConnectAccountId ? 'Atualizar onboarding Stripe' : 'Conectar Stripe'}
				</button>
				<button class="btn preset-tonal" onclick={refreshStatus} disabled={isLoading}>
					Atualizar status
				</button>
				<button
					class="btn preset-tonal"
					onclick={openDashboard}
					disabled={isLoading || !reviewerPayments?.stripeConnectAccountId}
				>
					Abrir dashboard Stripe
				</button>
			</div>

			<p class="text-xs text-surface-500-400">
				Pagamentos pendentes sao processados automaticamente apos o envio da revisao final.
			</p>
		</div>
	{/if}

	<div>
		<button class="btn preset-tonal" onclick={() => goto('/review')}>Voltar para Review</button>
	</div>
</section>
