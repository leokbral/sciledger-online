<script lang="ts">
    export let data;
    const hub = data.hub;

</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
    {#if hub}
       
        <div class="w-full h-80 rounded-2xl overflow-hidden relative">
            <img 
                src={hub.bannerUrl ? `/api/images/${hub.bannerUrl}` : '/placeholder-banner.jpg'} 
                alt="Banner" 
                class="w-full h-full object-cover" 
            />
        </div>

      
        <div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
           
            <img 
                src={hub.logoUrl ? `/api/images/${hub.logoUrl}` : '/placeholder-logo.jpg'} 
                alt="Logo" 
                class="w-28 h-28 object-contain rounded-full" 
            />

           
            <div class="flex-1 space-y-4">

            <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
             {#if loading}
        <div class="text-center">Loading hub details...</div>
            {:else if error}
        <div class="text-red-600">Error: {error}</div>
            {:else if hub}
        
            <div class="w-full h-80 rounded-2xl overflow-hidden relative">
            <img 
                src={hub.bannerUrl ? `/api/images/${hub.bannerUrl}` : '/placeholder-banner.jpg'} 
                alt="Banner" 
                class="w-full h-full object-cover" 
            />
            </div>
       
        <div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
            <!-- Logo -->
            <img 
                src={hub.logoUrl ? `/api/images/${hub.logoUrl}` : '/placeholder-logo.jpg'} 
                alt="Logo" 
                class="w-28 h-28 object-contain rounded-full" 
            />
            <!-- Content -->
            <div class="flex-1 space-y-2">
                <h1 class="text-2xl font-semibold text-gray-900">{hub.title}</h1>
            </div>
        </div>
       
        {#if hub.location}
            <div class="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                <div class="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z" />
                    </svg>
                    <span>{hub.location}</span>
                </div>
            </div>
        {/if}
        <div class="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
            </svg>
            <span>{hub.views} Views</span>
        </div>
        <div class="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-5-4m-8 6H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z" />
            </svg>
            <span>{hub.members} Members</span>
        </div>
        
        <p class="text-gray-700 text-sm">{hub.description}</p>
        
        {#if hub.website}
            <a href={hub.website} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm">
                {hub.website}
            </a>
        {/if}
    {/if}

        
        <div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
            <!-- Logo -->
            <img 
                src={hub.logoUrl ? `/api/images/${hub.logoUrl}` : '/placeholder-logo.jpg'} 
                alt="Logo" 
                class="w-28 h-28 object-contain rounded-full" 
            />

            <!-- Content -->
            <div class="flex-1 space-y-2">
                <h1 class="text-2xl font-semibold text-gray-900">{hub.title}</h1>
            </div>
        </div>

               
                {#if hub.location}
                    <div class="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                        <div class="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z" />
                            </svg>
                            <span>{hub.location}</span>
                        </div>
                    </div>
                {/if}

				<div class="flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
					</svg>
					<span>{hub.views} Views</span>
                    </div>
                
				<div class="flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-5-4m-8 6H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z" />
					</svg>
					<span>{hub.members} Members</span>
				</div>
			</div>

               
                <p class="text-gray-700 text-sm">{hub.description}</p>

               
                {#if hub.website}
                    <a href={hub.website} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm">
                        {hub.website}
                    </a>
                {/if}
            <!-- </div> -->

            <!-- Actions
            <div class="flex md:flex-col gap-2 justify-between items-end">
                <button class="text-gray-50"
				<div class="flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-5-4m-8 6H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z" />
					</svg>
					<span>{hub.members} Members</span>
				</div>
			</div>
<div class:text-gray-800 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17l4-4-4-4m8 8l-4-4 4-4" />
                        </svg>
                        Acknowledgement
                    </button>
                {/if}
            </div> -->
        <!-- </div> -->
    <!-- </div> -->
<button class="text-gray-50 flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-5-4m-8 6H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z" />
    </svg>
    <span>{hub.members} Members</span>
</button>
<!-- </div> -->
<button class="text-gray-50 flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-5-4m-8 6H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z" />
    </svg>
    <span>{hub.members} Members</span>
</button>
