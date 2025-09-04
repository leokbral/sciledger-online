<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Icon from '@iconify/svelte';
    
    export let paperId: string;
    export let hubId: string | undefined = undefined;
    export let disabled: boolean = false;
    export let loading: boolean = false;
    export let variant: 'primary' | 'secondary' = 'primary';
    
    const dispatch = createEventDispatcher();
    
    let isLoading = false;
    
    async function acceptPaper() {
        if (disabled || isLoading) return;
        
        isLoading = true;
        
        try {
            const response = await fetch('/api/review/accept-paper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paperId,
                    hubId,
                    reviewType: 'peer_review'
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                dispatch('success', {
                    message: result.message,
                    paperId: result.paperId,
                    notificationsCreated: result.notificationsCreated
                });
            } else {
                console.error('Server error:', result);
                dispatch('error', {
                    message: result.error || 'Failed to accept paper',
                    details: result.details
                });
            }
        } catch (error) {
            console.error('Network error:', error);
            dispatch('error', {
                message: 'Network error occurred',
                details: error instanceof Error ? error.message : String(error)
            });
        } finally {
            isLoading = false;
        }
    }
    
    $: buttonLoading = loading || isLoading;
</script>

<button
    on:click={acceptPaper}
    disabled={disabled || buttonLoading}
    class="btn variant-filled-tertiary px-8 py-3 rounded-lg flex items-center gap-2
        {variant === 'primary' 
            ? 'text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400' 
            : 'text-green-700 bg-green-100 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400'
        }
        disabled:cursor-not-allowed"
>
    {#if buttonLoading}
        <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
        Processing...
    {:else}
        <Icon icon="fluent-mdl2:accept" class="size-5" />
        Accept for Review
    {/if}
</button>