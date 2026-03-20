<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';

  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  let stripe: any = null;
  let elements: any = null;
  let cardNumberElement: any = null;
  let cardExpiryElement: any = null;
  let cardCvcElement: any = null;
  let isProcessing = $state(false);
  let error = $state('');
  let success = $state(false);
  const paymentAmount = 400_00; // R$ 400,00 fixo
  const platformFee = 160_00; // R$ 160,00
  const reviewerFee = 80_00; // R$ 80,00 por revisor
  let paperId = $derived($page.url.searchParams.get('paperId'));

  function formatBrl(valueInCents: number): string {
    return `R$${(valueInCents / 100).toFixed(2)} BRL`;
  }

  async function initStripe() {
    if (!data.stripePublicKey) {
      error = 'Stripe is not configured. Please contact support.';
      return;
    }

    // Aguardar o script ser carregado com retry
    let retries = 0;
    const maxRetries = 20; // 2 segundos com 100ms entre cada
    
    while (!window.Stripe && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!window.Stripe) {
      error = 'Stripe library failed to load. Please refresh the page.';
      console.error('Stripe.js failed to load after 2 seconds');
      return;
    }

    try {
      // @ts-ignore
      stripe = await window.Stripe(data.stripePublicKey);
      if (!stripe) {
        error = 'Failed to initialize Stripe';
        return;
      }

      // @ts-ignore
      elements = stripe.elements();
      
      // Verificar se elementos existem no DOM
      const cardNumberContainer = document.getElementById('card-number-element');
      const cardExpiryContainer = document.getElementById('card-expiry-element');
      const cardCvcContainer = document.getElementById('card-cvc-element');
      if (!cardNumberContainer || !cardExpiryContainer || !cardCvcContainer) {
        error = 'Card form containers not found in page. Please refresh.';
        return;
      }

      const stripeElementStyle = {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a'
          }
        }
      };

      cardNumberElement = elements.create('cardNumber', stripeElementStyle);
      cardExpiryElement = elements.create('cardExpiry', stripeElementStyle);
      cardCvcElement = elements.create('cardCvc', stripeElementStyle);

      cardNumberElement.mount('#card-number-element');
      cardExpiryElement.mount('#card-expiry-element');
      cardCvcElement.mount('#card-cvc-element');
    } catch (err) {
      error = `Stripe initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Stripe initialization failed:', err);
    }
  }

  async function handlePaymentHold(e: any) {
    e.preventDefault();
    
    // Verificações iniciais
    if (!stripe) {
      error = 'Stripe client not initialized. Please refresh the page.';
      return;
    }
    
    if (!elements) {
      error = 'Payment form elements not loaded. Please refresh the page.';
      return;
    }
    
    if (!cardNumberElement || !cardExpiryElement || !cardCvcElement) {
      error = 'Card fields are not ready. Please refresh the page and try again.';
      return;
    }

    isProcessing = true;
    error = '';

    try {
      const userEmail = $page.data.user?.email || `user-${Date.now()}@temp.local`;

      // Step 1: Criar o Payment Intent no servidor
      console.log('Creating payment intent...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundo timeout

      const holdRes = await fetch('/api/stripe/payment-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: 'brl',
          email: userEmail,
          paperId: paperId || 'pending',
          description: 'Publication Fee Authorization Hold'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!holdRes.ok) {
        let errorMsg = 'Failed to create payment hold';
        try {
          const errorData = await holdRes.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Se não conseguir parsear JSON, usar status code
          errorMsg = `Server error (${holdRes.status}): ${holdRes.statusText}`;
        }
        error = errorMsg;
        console.error('Payment hold error:', errorMsg);
        isProcessing = false;
        return;
      }

      let holdData;
      try {
        holdData = await holdRes.json();
      } catch (e) {
        error = 'Invalid response from server. Please try again.';
        console.error('Failed to parse payment hold response:', e);
        isProcessing = false;
        return;
      }

      if (holdData.error) {
        error = holdData.error;
        console.error('Payment hold error:', holdData.error);
        isProcessing = false;
        return;
      }

      const paymentIntentId = holdData.paymentIntentId;
      const clientSecret = holdData.clientSecret;

      if (!clientSecret) {
        error = 'Invalid response: missing client secret';
        console.error('Missing client secret in response');
        isProcessing = false;
        return;
      }

      console.log('Payment intent created:', paymentIntentId);

      // Step 2: Confirmar o Payment Intent com o card element
      console.log('Confirming card payment...');
      // @ts-ignore
      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            email: userEmail
          }
        }
      });

      if (confirmRes.error) {
        error = confirmRes.error.message || 'Payment confirmation failed';
        console.error('Card confirmation error:', confirmRes.error);
        isProcessing = false;
        return;
      }

      const paymentIntent = confirmRes.paymentIntent;

      if (!paymentIntent) {
        error = 'Payment intent is missing from response';
        console.error('Missing payment intent in confirmation response');
        isProcessing = false;
        return;
      }

      console.log('Card confirmed. Intent status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
        success = true;

        // Atualizar o paper com o código de autorização
        if (paperId) {
          try {
            const updateRes = await fetch(`/api/papers/${paperId}/update-payment-auth`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentAuthorizationCode: paymentIntentId
              })
            });
            
            if (!updateRes.ok) {
              const updateError = await updateRes.json().catch(() => ({ error: 'Unknown error' }));
              console.error('Failed to update payment auth code:', updateError);
              // Não interrompe o fluxo, continua mesmo se falhar
            } else {
              console.log('Paper updated with payment authorization');
            }
          } catch (err) {
            console.error('Error updating payment auth:', err);
            // Não interrompe o fluxo
          }
        }

        // Redirecionar de volta para reviewer-assignment
        setTimeout(() => {
          goto(`/publish/reviewer-assignment/${paperId}`);
        }, 2000);
      } else {
        error = `Unexpected payment status: ${paymentIntent.status}. Please contact support.`;
        console.error('Unexpected payment intent status:', paymentIntent.status);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        error = 'Request timeout. Please check your connection and try again.';
        console.error('Payment request timeout');
      } else {
        error = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('Payment error:', err);
      }
    } finally {
      isProcessing = false;
    }
  }

  onMount(() => {
    initStripe();
  });
</script>

<svelte:head>
  <title>Authorization Hold | SciLedger</title>
  <script src="https://js.stripe.com/v3/"></script>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-8">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <Icon icon="mdi:lock-outline" class="w-8 h-8 text-primary-600" />
        </div>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Authorization Hold</h1>
      <p class="text-gray-600">Authorize payment before submitting your paper</p>
    </div>

    {#if data?.error}
      <!-- Configuration Error -->
      <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
        <p class="text-sm text-red-900 font-semibold">Configuration Error</p>
        <p class="text-sm text-red-700 mt-1">{data.error}</p>
        <p class="text-xs text-red-600 mt-2">
          Please ensure your administrator has configured Stripe in the system.
        </p>
      </div>
    {:else}
      <!-- Info Card -->
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p class="text-sm text-blue-900">
          <strong>ℹ️ How it works:</strong> We'll authorize (block) a temporary hold on your card. The actual charge
          will only happen when your paper is published. You won't be charged during the review process.
        </p>
      </div>

      <!-- Amount Display -->
      <div class="bg-gray-50 rounded-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-600">Publication Fee</span>
          <span class="text-3xl font-bold text-primary-600">{formatBrl(paymentAmount)}</span>
        </div>
        <p class="text-xs text-gray-500">Fixed fee split: {formatBrl(platformFee)} platform + 3 x {formatBrl(reviewerFee)} reviewers</p>
      </div>

      {#if success}
        <!-- Success Message -->
        <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
          <div class="flex items-center gap-3">
            <Icon icon="mdi:check-circle" class="w-6 h-6 text-green-600" />
            <div>
              <p class="font-semibold text-green-900">Authorization Successful!</p>
              <p class="text-sm text-green-700">Redirecting to submission form...</p>
            </div>
          </div>
        </div>
      {:else}
        <!-- Form -->
        <form onsubmit={handlePaymentHold} class="space-y-6">
          {#if error}
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p class="text-sm text-red-700 font-semibold">Error</p>
              <p class="text-sm text-red-600">{error}</p>
            </div>
          {/if}

          <!-- Card Elements -->
          <div class="space-y-3">
            <label for="card-number-element" class="block text-sm font-medium text-gray-700">Card Details</label>
            <div class="border border-gray-300 rounded-xl px-4 py-3 bg-white shadow-sm">
              <div id="card-number-element"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="border border-gray-300 rounded-xl px-4 py-3 bg-white shadow-sm">
                <div id="card-expiry-element"></div>
              </div>
              <div class="border border-gray-300 rounded-xl px-4 py-3 bg-white shadow-sm">
                <div id="card-cvc-element"></div>
              </div>
            </div>
          </div>

          <!-- Payment Method Selection -->
          <div class="border-t pt-4">
            <p class="text-xs text-gray-500 mb-3">Accepted payment methods:</p>
            <div class="flex gap-2 text-gray-600 text-xs">
              <div class="flex items-center gap-1">
                <Icon icon="mdi:credit-card" class="w-4 h-4" />
                <span>Credit Card</span>
              </div>
              <div class="flex items-center gap-1">
                <Icon icon="mdi:credit-card" class="w-4 h-4" />
                <span>Debit Card</span>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={isProcessing}
            class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {#if isProcessing}
              <span class="flex items-center justify-center gap-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            {:else}
              Authorize {formatBrl(paymentAmount)}
            {/if}
          </button>

          <!-- Additional Info -->
          <div class="bg-gray-50 p-4 rounded text-xs text-gray-600 space-y-2">
            <p>
              <strong>✓ Secure:</strong> Your payment is processed by Stripe, the industry standard for secure payments.
            </p>
            <p>
              <strong>✓ Temporary:</strong> This is an authorization hold that doesn't charge your card immediately.
            </p>
            <p>
              <strong>✓ Flexible:</strong> The hold will be released if your paper is rejected.
            </p>
          </div>
        </form>
      {/if}
    {/if}

    <!-- Footer -->
    <div class="mt-6 pt-6 border-t text-center text-xs text-gray-600">
      <p>Questions? Contact our support team.</p>
    </div>
  </div>
</div>

<style>
  :global(#card-number-element),
  :global(#card-expiry-element),
  :global(#card-cvc-element) {
    min-height: 24px;
  }

  :global(.StripeElement) {
    width: 100%;
  }
</style>
