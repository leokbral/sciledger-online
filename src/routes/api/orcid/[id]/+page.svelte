<script lang="ts">
    import OrcidProfile from '$lib/components/OrcidProfile/OrcidProfile.svelte';

  export let data: { profile: any };

  // Debug removed to avoid exposing profile data in console
</script>

<div>
  <OrcidProfile profile={data.profile} />
</div>
