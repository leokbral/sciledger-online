<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let sessionId = '';
  let copied = false;

  onMount(() => {
    const params = new URLSearchParams($page.url.search);
    sessionId = params.get('session_id') ?? '';
  });

  function copySessionId() {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<svelte:head>
  <title>Pagamento Realizado | SciLedger</title>
</svelte:head>

<section class="min-h-screen flex items-center justify-center px-6 py-24 bg-green-50">
  <div class="max-w-lg w-full bg-white rounded-2xl shadow-md p-10 text-center">
    <!-- Success Icon -->
    <div class="flex justify-center mb-6">
      <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <h1 class="text-3xl font-semibold text-green-700 mb-3">Payment Successful!</h1>

    <p class="text-lg text-surface-600 mb-8">
      Thank you for your purchase. Your payment has been successfully processed on Stripe (test mode).
    </p>

    {#if sessionId}
      <div class="bg-surface-50 rounded-lg p-4 mb-8 text-left">
        <p class="text-sm text-surface-600 mb-2">Session ID:</p>
        <div class="flex items-center gap-2 break-all">
          <code class="text-xs font-mono text-surface-700 flex-1">{sessionId}</code>
          <button
            on:click={copySessionId}
            class="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>
    {/if}

    <div class="space-y-3">
      <button
        on:click={() => goto('/')}
        class="w-full bg-primary-600 text-white py-3 rounded-full font-semibold hover:bg-primary-700 transition-colors"
      >
        Back to Home
      </button>

      <button
        on:click={() => goto('/stripe-test')}
        class="w-full bg-surface-200 text-surface-700 py-3 rounded-full font-semibold hover:bg-surface-300 transition-colors"
      >
        Run Another Test
      </button>
    </div>

    <p class="text-xs text-surface-500 mt-6">
      💡 Tip: You can use the <code class="rounded bg-surface-100 px-1">session_id</code> to check payment details
      in the Stripe Dashboard (test mode).
    </p>
  </div>
</section>
