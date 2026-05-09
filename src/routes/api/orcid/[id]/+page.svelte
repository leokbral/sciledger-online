<script lang="ts">
    import OrcidProfile from '$lib/components/OrcidProfile/OrcidProfile.svelte';

  export let data: { profile: any };

  // Debug removed to avoid exposing profile data in console
</script>

<div>
  <!-- Debug visual na página -->
  <details>
    <summary>Debug Info (clique para expandir)</summary>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </details>
  
  <OrcidProfile profile={data.profile} />
</div>
