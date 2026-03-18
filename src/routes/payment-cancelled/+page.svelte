<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Pagamento Cancelado | SciLedger</title>
</svelte:head>

<section class="min-h-screen flex items-center justify-center px-6 py-24 bg-red-50">
  <div class="max-w-lg w-full bg-white rounded-2xl shadow-md p-10 text-center">
    <!-- Cancel Icon -->
    <div class="flex justify-center mb-6">
      <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    </div>

    <h1 class="text-3xl font-semibold text-red-700 mb-3">Payment Cancelled</h1>

    <p class="text-lg text-surface-600 mb-8">
      Your payment has been cancelled. No amount has been charged.
    </p>

    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
      <p class="text-sm text-amber-700">
        If you cancelled by mistake or want to try again, click the button below.
      </p>
    </div>

    <div class="space-y-3">
      <button
        on:click={() => goto('/stripe-test')}
        class="w-full bg-primary-600 text-white py-3 rounded-full font-semibold hover:bg-primary-700 transition-colors"
      >
        Try Again
      </button>

      <button
        on:click={() => goto('/')}
        class="w-full bg-surface-200 text-surface-700 py-3 rounded-full font-semibold hover:bg-surface-300 transition-colors"
      >
        Back to Home
      </button>
    </div>
  </div>
</section>
