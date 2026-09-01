<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	let stripe: any = null;
	let elements: any = null;
	let paymentElement: any = null;
	let billingAddressElement: any = null;
	let paymentIntentId = $state(data.paymentState?.paymentIntentId ?? '');
	let paymentElementReady = $state(false);
	let isInitializing = $state(false);
	let isProcessing = $state(false);
	let error = $state('');
	let statusMessage = $state('');
	let success = $state(false);
	let paymentPolicyAccepted = $state(Boolean(data.paymentPolicyAccepted));
	let activePaymentPurpose = $state(String(data.paymentState?.purpose ?? 'standalone_submission'));
	let activePaymentPolicy = $state(String(data.paymentState?.policy ?? 'submission'));
	let paperId = $derived($page.url.searchParams.get('paperId'));
	let returnedPaymentIntentId = $derived($page.url.searchParams.get('payment_intent'));
	let paymentAmount = $derived(Number(data.amountCents ?? 40000));
	let paymentCurrency = $derived(String(data.currency ?? 'brl').toUpperCase());
	let paymentAlreadyCaptured = $state(data.paymentState?.state === 'captured');

	function formatMoney(valueInCents: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: paymentCurrency
		}).format(valueInCents / 100);
	}

	async function waitForStripeJs() {
		let retries = 0;
		while (!(window as any).Stripe && retries < 20) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			retries++;
		}
	}

	function buildReturnUrl() {
		const url = new URL('/publish/payment-hold', window.location.origin);
		if (paperId) {
			url.searchParams.set('paperId', paperId);
		}
		return url.toString();
	}

	function isSubmissionPayment(purpose = activePaymentPurpose) {
		return purpose === 'standalone_submission' || purpose === 'hub_submission';
	}

	function paymentTitle() {
		if (activePaymentPurpose === 'hub_review') return 'Review Payment';
		if (activePaymentPurpose === 'hub_publication') return 'Publication Payment';
		return 'Submission Payment';
	}

	function paymentDescription() {
		if (activePaymentPurpose === 'hub_review') {
			return 'Payment is required before this Hub paper can move into review.';
		}
		if (activePaymentPurpose === 'hub_publication') {
			return 'Payment is required before this Hub paper can be published.';
		}
		return 'Payment is required before this paper can be submitted.';
	}

	function paymentInfoText() {
		if (activePaymentPurpose === 'hub_review') {
			return 'This Hub charges before review. After Stripe confirms the payment, return to reviewer assignment to continue.';
		}
		if (activePaymentPurpose === 'hub_publication') {
			return 'This Hub charges before publication. After Stripe confirms the payment, return to publication approval to continue.';
		}
		return 'This is an immediate submission charge. After Stripe confirms the payment, the paper will be submitted for reviewer assignment.';
	}

	function paymentFeeLabel() {
		if (activePaymentPurpose === 'hub_review') return 'Review fee';
		if (activePaymentPurpose === 'hub_publication') return 'Publication fee';
		return 'Submission fee';
	}

	function paymentButtonText() {
		if (activePaymentPurpose === 'hub_review') return `Pay review fee ${formatMoney(paymentAmount)}`;
		if (activePaymentPurpose === 'hub_publication') {
			return `Pay publication fee ${formatMoney(paymentAmount)}`;
		}
		return `Pay and submit ${formatMoney(paymentAmount)}`;
	}

	function destinationAfterPayment(purpose = activePaymentPurpose) {
		if (purpose === 'hub_publication') return `/publish/publication-approval/${paperId}`;
		return `/publish/reviewer-assignment/${paperId}`;
	}

	async function initStripe() {
		if (!paperId) {
			error = 'Please save your paper as a draft before starting payment.';
			return;
		}
		if (!data.stripePublicKey) {
			error = 'Stripe is not configured. Please contact support.';
			return;
		}
		if (paymentAlreadyCaptured && !returnedPaymentIntentId) {
			statusMessage = 'Payment already confirmed. Continue your paper workflow.';
			return;
		}
		if (!returnedPaymentIntentId && !paymentPolicyAccepted) {
			statusMessage = 'Review and accept the payment rules before loading the secure form.';
			return;
		}

		isInitializing = true;
		error = '';
		statusMessage = 'Loading secure payment form...';

		await waitForStripeJs();
		if (!(window as any).Stripe) {
			error = 'Stripe library failed to load. Please refresh the page.';
			isInitializing = false;
			return;
		}

		try {
			stripe = await (window as any).Stripe(data.stripePublicKey);

			if (returnedPaymentIntentId) {
				try {
					statusMessage = 'Checking payment result with Stripe...';
					await submitPaperAfterPayment(returnedPaymentIntentId);
					success = true;
					setTimeout(() => goto(destinationAfterPayment()), 1200);
					return;
				} catch (redirectError) {
					error =
						redirectError instanceof Error
							? redirectError.message
							: 'Payment could not be confirmed after authentication.';
				}
			}

			const holdData = await startPaymentIntent();
			activePaymentPurpose = holdData.purpose ?? activePaymentPurpose;
			activePaymentPolicy = holdData.policy ?? activePaymentPolicy;
			paymentIntentId = holdData.paymentIntentId ?? '';

			if (holdData.alreadyPaid && holdData.paymentIntentId) {
				paymentAlreadyCaptured = true;
				statusMessage = 'Payment already confirmed. Continue to submit your paper.';
				return;
			}

			if (!holdData.clientSecret) {
				throw new Error('Payment could not be initialized. Missing client secret.');
			}

			paymentAlreadyCaptured = false;
			await tick();
			mountPaymentElements(holdData.clientSecret);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Payment form could not be initialized.';
		} finally {
			isInitializing = false;
		}
	}

	async function startPaymentIntent() {
		if (!paperId) {
			throw new Error('Missing paperId for payment.');
		}

		const holdRes = await fetch('/api/stripe/payment-hold', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ paperId, acceptPaymentPolicy: paymentPolicyAccepted })
		});
		const holdData = await holdRes.json().catch(() => ({}));
		if (!holdRes.ok) {
			throw new Error(holdData.error || 'Failed to start payment.');
		}

		return holdData;
	}

	function mountPaymentElements(secret: string) {
		const paymentContainer = document.getElementById('payment-element');
		const billingAddressContainer = document.getElementById('billing-address-element');
		if (!paymentContainer || !billingAddressContainer) {
			throw new Error('Payment form is not ready. Please refresh the page.');
		}

		paymentElementReady = false;
		paymentElement?.unmount?.();
		billingAddressElement?.unmount?.();

		elements = stripe.elements({
			clientSecret: secret,
			appearance: {
				theme: 'stripe',
				variables: {
					colorPrimary: '#2563eb',
					colorText: '#1f2937',
					colorDanger: '#dc2626',
					fontFamily:
						'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
					borderRadius: '8px'
				}
			}
		});

		billingAddressElement = elements.create('address', {
			mode: 'billing',
			fields: {
				phone: 'never'
			},
			defaultValues: {
				address: {
					country: 'BR'
				}
			}
		});

		paymentElement = elements.create('payment', {
			layout: {
				type: 'tabs',
				defaultCollapsed: false
			},
			fields: {
				billingDetails: {
					name: 'never',
					address: 'never'
				}
			},
			defaultValues: {
				billingDetails: {
					email: data.user?.email || ''
				}
			}
		});

		billingAddressElement.on('change', (event: any) => {
			if (event?.error?.message) {
				error = event.error.message;
			} else if (error) {
				error = '';
			}
		});
		paymentElement.on('change', (event: any) => {
			if (event?.error?.message) {
				error = event.error.message;
			} else if (error) {
				error = '';
			}
		});
		paymentElement.on('ready', () => {
			paymentElementReady = true;
			statusMessage = 'Payment form ready.';
		});

		billingAddressElement.mount('#billing-address-element');
		paymentElement.mount('#payment-element');
	}

	async function reconcilePayment(paymentIntentId: string) {
		if (!paperId) {
			throw new Error('Missing paperId for submission.');
		}

		const updateRes = await fetch(`/api/papers/${paperId}/update-payment-auth`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ paymentIntentId })
		});
		const updateData = await updateRes.json().catch(() => ({}));
		if (!updateRes.ok) {
			throw new Error(updateData.error || 'Payment could not be reconciled.');
		}

		return updateData;
	}

	async function submitPaperAfterPayment(paymentIntentId: string) {
		const updateData = await reconcilePayment(paymentIntentId);
		if (updateData.paymentState !== 'captured') {
			throw new Error(updateData.error || `Payment is not complete yet. Current status: ${updateData.status}.`);
		}
		activePaymentPurpose = updateData.purpose ?? activePaymentPurpose;
		activePaymentPolicy = updateData.policy ?? activePaymentPolicy;

		if (!isSubmissionPayment(updateData.purpose ?? activePaymentPurpose)) {
			statusMessage = 'Payment confirmed. Continue your paper workflow.';
			return;
		}

		const submitRes = await fetch(`/api/papers/${paperId}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				status: 'reviewer assignment',
				expectedStatus: 'draft',
				metadata: {
					paymentIntentId,
					source: updateData.purpose ?? activePaymentPurpose,
					paymentPolicy: updateData.policy ?? activePaymentPolicy
				}
			})
		});
		const submitData = await submitRes.json().catch(() => ({}));
		if (!submitRes.ok) {
			throw new Error(submitData.error || 'Payment succeeded, but submission could not be completed.');
		}
	}

	async function collectBillingDetails() {
		if (!billingAddressElement) return null;

		const addressResult = await billingAddressElement.getValue();
		if (!addressResult?.complete) {
			throw new Error('Please complete the billing name and address.');
		}

		return {
			name: addressResult.value?.name,
			address: addressResult.value?.address
		};
	}

	async function handlePaymentIntentResult(paymentIntent: any) {
		paymentIntentId = paymentIntent.id;

		if (paymentIntent.status === 'succeeded') {
			statusMessage = 'Payment approved. Confirming with SciLedger...';
			await submitPaperAfterPayment(paymentIntent.id);
			paymentAlreadyCaptured = true;
			success = true;
			setTimeout(() => goto(destinationAfterPayment()), 1200);
			return;
		}

		if (paymentIntent.status === 'processing') {
			statusMessage = 'Payment is processing. Your paper remains blocked until Stripe confirms capture.';
			await reconcilePayment(paymentIntent.id);
			return;
		}

		if (paymentIntent.status === 'requires_action') {
			statusMessage = 'Additional authentication is required before this payment can be completed.';
			await reconcilePayment(paymentIntent.id);
			return;
		}

		if (paymentIntent.status === 'requires_payment_method') {
			statusMessage = 'Payment was not approved. Please review the details and try another payment method.';
			await reconcilePayment(paymentIntent.id);
			return;
		}

		if (paymentIntent.status === 'canceled') {
			throw new Error('Payment was canceled. Please start a new attempt.');
		}

		throw new Error(`Payment is not complete yet. Current status: ${paymentIntent.status}.`);
	}

	async function handlePayment(e: SubmitEvent) {
		e.preventDefault();

		if (!paperId) {
			error = 'Please save your paper as a draft before starting payment.';
			return;
		}

		isProcessing = true;
		error = '';

		try {
			if (paymentAlreadyCaptured) {
				statusMessage = isSubmissionPayment()
					? 'Payment already confirmed. Submitting your paper...'
					: 'Payment already confirmed. Continuing your paper workflow...';
				if (paymentIntentId && isSubmissionPayment()) {
					await submitPaperAfterPayment(paymentIntentId);
				}
				success = true;
				setTimeout(() => goto(destinationAfterPayment()), 1200);
				return;
			}

			if (!stripe || !elements || !paymentElement) {
				throw new Error('Payment form is not ready. Please refresh the page.');
			}

			statusMessage = 'Validating payment and billing details...';
			const billingDetails = await collectBillingDetails();
			const submitResult = await elements.submit();
			if (submitResult?.error) {
				throw new Error(submitResult.error.message || 'Please review your payment details.');
			}

			const confirmParams: Record<string, unknown> = {
				return_url: buildReturnUrl()
			};
			if (billingDetails) {
				confirmParams.payment_method_data = {
					billing_details: {
						...billingDetails,
						email: data.user?.email || undefined
					}
				};
			}

			statusMessage = 'Confirming payment with Stripe...';
			const confirmRes = await stripe.confirmPayment({
				elements,
				confirmParams,
				redirect: 'if_required'
			});

			if (confirmRes.error) {
				if (confirmRes.error.type === 'card_error') {
					throw new Error(confirmRes.error.message || 'Payment was declined.');
				}
				if (confirmRes.error.type === 'validation_error') {
					throw new Error(confirmRes.error.message || 'Please review the payment form.');
				}
				throw new Error(confirmRes.error.message || 'Payment confirmation failed.');
			}

			const paymentIntent = confirmRes.paymentIntent;
			if (!paymentIntent?.id) {
				throw new Error('Payment intent is missing from Stripe response.');
			}

			await handlePaymentIntentResult(paymentIntent);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Payment failed. Please try again.';
		} finally {
			isProcessing = false;
		}
	}

	onMount(() => {
		if (returnedPaymentIntentId || paymentAlreadyCaptured || paymentPolicyAccepted) {
			initStripe();
		}
	});
</script>

<svelte:head>
	<title>Submission Payment | SciLedger</title>
	<script src="https://js.stripe.com/v3/"></script>
</svelte:head>

<div class="min-h-screen bg-surface-100 flex items-center justify-center px-4 py-8">
	<div class="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
		<div class="text-center mb-8">
			<div class="flex justify-center mb-4">
				<div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
					<Icon icon="mdi:credit-card-check-outline" class="w-7 h-7 text-primary-600" />
				</div>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">{paymentTitle()}</h1>
			<p class="text-gray-600">{paymentDescription()}</p>
		</div>

		{#if data?.error}
			<div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
				<p class="text-sm text-red-900 font-semibold">Configuration Error</p>
				<p class="text-sm text-red-700 mt-1">{data.error}</p>
			</div>
		{:else if !paperId}
			<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
				<p class="text-sm text-yellow-900 font-semibold">Draft required</p>
				<p class="text-sm text-yellow-800 mt-1">Save your paper as a draft before starting payment.</p>
			</div>
		{:else}
			<div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
				<p class="text-sm text-blue-900">
					{paymentInfoText()}
				</p>
			</div>

			<div class="bg-gray-50 rounded-lg p-5 mb-6">
				<div class="flex justify-between items-center gap-4">
					<span class="text-gray-600">{paymentFeeLabel()}</span>
					<span class="text-2xl font-bold text-primary-700">{formatMoney(paymentAmount)}</span>
				</div>
				<p class="text-xs text-gray-500 mt-2">Policy: {activePaymentPolicy}</p>
				{#if data.paymentState?.state === 'retry_required'}
					<p class="text-sm text-red-700 mt-3">The previous payment attempt was not completed.</p>
				{:else if data.paymentState?.state === 'processing'}
					<p class="text-sm text-blue-700 mt-3">A payment attempt is currently processing.</p>
				{/if}
			</div>

			{#if statusMessage}
				<div class="bg-surface-50 border border-surface-200 p-4 mb-6 rounded text-sm text-surface-700">
					{statusMessage}
				</div>
			{/if}

			{#if success}
				<div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
					<div class="flex items-center gap-3">
						<Icon icon="mdi:check-circle" class="w-6 h-6 text-green-600" />
						<div>
							<p class="font-semibold text-green-900">Payment complete</p>
							<p class="text-sm text-green-700">Submitting your paper...</p>
						</div>
					</div>
				</div>
			{:else}
				<form onsubmit={handlePayment} class="space-y-6">
					{#if error}
						<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
							<p class="text-sm text-red-700 font-semibold">Payment issue</p>
							<p class="text-sm text-red-600">{error}</p>
						</div>
					{/if}

					{#if paymentAlreadyCaptured}
						<div class="bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800">
							Payment has already been confirmed for this paper.
						</div>
					{:else}
						<div class="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
							<label class="flex gap-3 text-sm text-gray-700">
								<input
									type="checkbox"
									bind:checked={paymentPolicyAccepted}
									class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
								/>
								<span>Li e aceito as regras de pagamento aplicaveis a este Paper.</span>
							</label>
							{#if !paymentElementReady && !isInitializing}
								<button
									type="button"
									onclick={initStripe}
									disabled={!paymentPolicyAccepted}
									class="w-full rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 disabled:border-gray-300 disabled:text-gray-400"
								>
									Load secure payment form
								</button>
							{/if}
						</div>

						<div class="space-y-3">
							<label for="billing-address-element" class="block text-sm font-medium text-gray-700">
								Billing details
							</label>
							<div class="border border-gray-300 rounded-lg px-4 py-3 bg-white shadow-sm">
								<div id="billing-address-element"></div>
							</div>
						</div>

						<div class="space-y-3">
							<label for="payment-element" class="block text-sm font-medium text-gray-700">
								Payment method
							</label>
							<div class="border border-gray-300 rounded-lg px-4 py-3 bg-white shadow-sm">
								{#if isInitializing}
									<p class="text-sm text-gray-500">Loading payment form...</p>
								{/if}
								<div id="payment-element"></div>
							</div>
						</div>
					{/if}

					<button
						type="submit"
						disabled={isInitializing || isProcessing || (!paymentAlreadyCaptured && (!paymentElementReady || !paymentPolicyAccepted))}
						class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
					>
						{#if isProcessing}
							<span class="flex items-center justify-center gap-2">
								<span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
								Processing payment...
							</span>
						{:else if paymentAlreadyCaptured}
							Continue submission
						{:else}
							{paymentButtonText()}
						{/if}
					</button>

					<div class="bg-gray-50 p-4 rounded text-xs text-gray-600">
						<p>Your payment is processed by Stripe. SciLedger does not store card details.</p>
					</div>
				</form>
			{/if}
		{/if}
	</div>
</div>

<style>
	:global(#payment-element),
	:global(#billing-address-element) {
		min-height: 24px;
	}

	:global(.StripeElement) {
		width: 100%;
	}
</style>
