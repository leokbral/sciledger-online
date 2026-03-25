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

  <div class="flex gap-3">
    <a href="/publish/new" class="btn preset-filled-primary-500">Go to Submission</a>
    <a href="/help" class="btn preset-outlined">Back to Help</a>
  </div>
</div>
