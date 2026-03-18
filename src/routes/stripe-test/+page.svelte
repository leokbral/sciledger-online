<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let checkoutMode: 'priceId' | 'amount' = 'priceId';
  let priceId = '';
  let quantity = 1;
  let amount = 1000; // cents
  let currency = 'brl';
  let loading = false;
  let error: string | null = null;
  let successUrl: string | null = null;

  // If ?priceId=... is passed in URL, prefill it
  onMount(() => {
    const params = new URLSearchParams($page.url.search);
    const paramPriceId = params.get('priceId');
    if (paramPriceId) priceId = paramPriceId;
  });

  async function startCheckout() {
    error = null;
    successUrl = null;

    const body: Record<string, unknown> = { quantity };
    if (checkoutMode === 'priceId') {
      if (!priceId) {
        error = 'Please enter a valid priceId (e.g., price_123...).';
        return;
      }
      body.priceId = priceId;
    } else {
      if (!amount || !currency) {
        error = 'Please enter amount and currency to create a simple checkout session.';
        return;
      }
      body.amount = amount;
      body.currency = currency;
      body.productName = 'SciLedger Test';
    }

    loading = true;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        error = data?.error || 'Error creating checkout session.';
        return;
      }

      if (!data.url) {
        error = 'Unexpected server response.';
        return;
      }

      // redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      error = (err as Error)?.message ?? 'Request failed.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Stripe Checkout Test | SciLedger</title>
</svelte:head>

<section class="min-h-screen flex items-center justify-center px-6 py-24 bg-surface-50">
  <div class="max-w-lg w-full bg-white rounded-2xl shadow-md p-10">
    <h1 class="text-3xl font-semibold mb-6">Stripe Checkout (test mode)</h1>

    <p class="text-sm text-surface-600 mb-6">
      Choose how you want to create the checkout session:
    </p>

    <div class="space-y-4">
      <div class="flex items-center gap-4">
        <label class="inline-flex items-center gap-2">
          <input type="radio" bind:group={checkoutMode} value="priceId" />
          <span class="text-sm">Use <strong>priceId</strong> (recommended)</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input type="radio" bind:group={checkoutMode} value="amount" />
          <span class="text-sm">Use direct value (amount + currency)</span>
        </label>
      </div>

      {#if checkoutMode === 'priceId'}
        <label class="block">
          <span class="text-sm font-medium text-surface-700">Price ID</span>
          <input
            bind:value={priceId}
            class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 focus:border-primary-600 focus:outline-none"
            placeholder="price_..."
          />
        </label>
      {:else}
        <label class="block">
          <span class="text-sm font-medium text-surface-700">Amount (cents)</span>
          <input
            type="number"
            min="1"
            bind:value={amount}
            class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 focus:border-primary-600 focus:outline-none"
          />
          <p class="text-xs text-surface-500 mt-1">Ex: 1000 = $10.00</p>
        </label>

        <label class="block">
          <span class="text-sm font-medium text-surface-700">Currency</span>
          <input
            bind:value={currency}
            class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 focus:border-primary-600 focus:outline-none"
            placeholder="brl"
          />
        </label>
      {/if}

      <label class="block">
        <span class="text-sm font-medium text-surface-700">Quantity</span>
        <input
          type="number"
          min="1"
          bind:value={quantity}
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 focus:border-primary-600 focus:outline-none"
        />
      </label>
    </div>

    {#if error}
      <div class="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
        {error}
      </div>
    {/if}

    {#if successUrl}
      <div class="mt-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3">
        Session created! <a href={successUrl} class="underline">Go to checkout</a>
      </div>
    {/if}

    <button
      class="mt-6 w-full bg-primary-600 text-white py-3 rounded-full font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
      on:click={startCheckout}
      disabled={loading}
    >
      {loading ? 'Creating session...' : 'Go to checkout'}
    </button>
  </div>
</section>
