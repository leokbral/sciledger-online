<script lang="ts">
    import { onMount } from 'svelte';
    import Icon from '@iconify/svelte';

    let { unreadCount = 0 } = $props();
    let count = $state(unreadCount);

    // Update count when props change
    $effect(() => {
        count = unreadCount;
    });

    async function loadUnreadCount() {
        try {
            const response = await fetch('/api/notifications/unread-count');
            if (response.ok) {
                const data = await response.json();
                count = data.count || 0;
            }
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    }

    onMount(loadUnreadCount);
</script>

<div class="relative">
    <Icon icon="mdi:bell" class="w-6 h-6" />
    {#if count > 0}
        <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
        </span>
    {/if}
</div>