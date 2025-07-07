<script lang="ts">
    import OrcidProfile from '$lib/components/OrcidProfile/OrcidProfile.svelte';

  export let data: { profile: any };

  // Debug: verificar dados recebidos
  console.log('Dados completos recebidos:', data);
  console.log('Profile específico:', data?.profile);
  console.log('Tipo do profile:', typeof data?.profile);
  
  // Verificar se profile existe e tem conteúdo
  if (data?.profile) {
    console.log('Profile tem dados:', Object.keys(data.profile));
  } else {
    console.log('Profile está vazio ou undefined');
  }
</script>

<div>
  <!-- Debug visual na página -->
  <details>
    <summary>Debug Info (clique para expandir)</summary>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </details>
  
  <OrcidProfile profile={data.profile} />
</div>
