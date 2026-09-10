<script lang="ts">
  import PaperSubmissionGuide from '$lib/components/Paper/PaperSubmissionGuide.svelte';
</script>

<svelte:head>
  <title>How to Submit | SciLedger Help</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-900">How to Submit an Article</h1>
    <p class="text-gray-600 mt-2">Official submission flow for papers without a hub and with reviewer assignment.</p>
  </div>

  <PaperSubmissionGuide expanded={true} />

  <div class="rounded-xl border border-blue-200 bg-blue-50 p-6">
    <h3 class="text-lg font-semibold text-blue-900 mb-2">Payment Rule</h3>
    <p class="text-blue-900">
      Payment capture is executed only when 3 reviewers accept the review invitation.
    </p>
  </div>

  <div class="rounded-xl border border-gray-200 bg-white p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-2">Changing your mind</h3>
    <p class="text-gray-600 mb-4">
      Two different situations, with two different policies. Read the one that matches your
      manuscript's current state before requesting anything.
    </p>
    <div class="grid gap-3 sm:grid-cols-2">
      <a
        href="/policies/submission-withdrawal"
        class="block rounded-lg border border-gray-200 p-4 transition hover:border-primary-400 hover:shadow-sm"
      >
        <p class="font-semibold text-gray-900">Submission Withdrawal</p>
        <p class="text-sm text-gray-600 mt-1">
          Withdrawing while the manuscript is still in the editorial process.
        </p>
      </a>
      <a
        href="/policies/publication-withdrawal"
        class="block rounded-lg border border-gray-200 p-4 transition hover:border-primary-400 hover:shadow-sm"
      >
        <p class="font-semibold text-gray-900">Publication Withdrawal</p>
        <p class="text-sm text-gray-600 mt-1">
          Deciding not to publish after the manuscript has been accepted.
        </p>
      </a>
    </div>
  </div>

  <div class="flex gap-3">
    <a href="/publish/new" class="btn preset-filled-primary-500">Go to Submission</a>
    <a href="/help" class="btn preset-outlined">Back to Help</a>
  </div>
</div>
