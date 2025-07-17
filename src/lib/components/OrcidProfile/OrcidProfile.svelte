<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    // Props
    export let profile: any;
    export let showAddButton: boolean = false;
    export let isAdding: boolean = false;
    export let isSelected: boolean = false;
    export let canSelect: boolean = false;

    // Reatividade
    $: name = profile?.person?.name;
    $: biography = profile?.person?.biography?.content;
    $: orcidId = profile?.['orcid-identifier']?.path;
    $: affiliations = profile?.['activities-summary']?.employments?.['affiliation-group'] ?? [];
    $: country = profile?.person?.addresses?.address?.[0]?.country?.value;
    $: works = profile?.['activities-summary']?.works?.group ?? [];
    $: emails = profile?.person?.emails?.email ?? [];
    $: primaryEmail = emails.find((email: any) => email.primary)?.email || emails[0]?.email || null;
    $: mainAffiliation = affiliations?.[0]?.['summaries']?.[0]?.['employment-summary'] ?? null;
    $: hasValidData = profile && (name || orcidId || biography || mainAffiliation);

    // States para formulário
    let manualEmail = '';
    let emailInputVisible = false;
    let emailError = '';

    function handleSelect() {
        const newSelectedState = !isSelected;
        dispatch('select', { profile, isSelected: newSelectedState });

        // Sempre mostrar o campo de email quando selecionado e não há email público
        if (newSelectedState && !primaryEmail) {
            emailInputVisible = true;
        } else {
            emailInputVisible = false;
            manualEmail = '';
            emailError = '';
        }
    }

    function validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function handleAddAsCoauthor() {
        // Se não há email público e não foi fornecido email manual
        if (!primaryEmail && !manualEmail.trim()) {
            emailError = 'Email is required for account creation';
            return;
        }

        // Validar email manual se fornecido
        if (!primaryEmail && manualEmail.trim() && !validateEmail(manualEmail)) {
            emailError = 'Please enter a valid email address';
            return;
        }

        emailError = '';
        const emailToUse = primaryEmail || manualEmail.trim();
        dispatch('addAsCoauthor', { profile, email: emailToUse });
    }

    function clearEmailError() {
        emailError = '';
    }

    function formatTitle(work: any) {
        const summary = work['work-summary']?.[0];
        const url = summary?.url?.value;
        const title = summary?.title?.title?.value ?? 'Sem título';
        return url
            ? `<a href="${url}" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-800 underline">${title}</a>`
            : title;
    }

    // Reactive statement to show email input when selected and no public email
    $: shouldShowEmailInput = isSelected && !primaryEmail;
</script>

{#if hasValidData}
    <div
        class="bg-white dark:bg-surface-800 shadow-md rounded-lg p-6 space-y-4 max-w-2xl mx-auto border border-surface-200 dark:border-surface-700 transition-all duration-200 {isSelected
            ? 'ring-2 ring-green-500 border-green-300'
            : ''}"
    >
        {#if canSelect}
            <div
                class="flex items-center justify-between mb-3 pb-3 border-b border-surface-200 dark:border-surface-700"
            >
                <label class="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onchange={handleSelect}
                        class="w-5 h-5 text-green-600 bg-surface-100 border-surface-300 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span class="text-lg font-medium text-surface-800 dark:text-surface-200">
                        Select this profile
                    </span>
                </label>
                {#if isSelected}
                    <div class="flex items-center gap-2 text-green-600">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <span class="text-sm font-medium">Selected</span>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-800 dark:text-white">
                    {#if name}
                        {name['given-names']?.value || ''} {name['family-name']?.value || ''}
                    {:else}
                        Profile Information
                    {/if}
                </h2>
                {#if orcidId}
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        <a
                            href={`https://orcid.org/${orcidId}`}
                            target="_blank"
                            rel="noopener"
                            class="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            ORCID: {orcidId}
                        </a>
                    </p>
                {/if}
                {#if primaryEmail}
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        📧 <a
                            href={`mailto:${primaryEmail}`}
                            class="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            {primaryEmail}
                        </a>
                    </p>
                {:else}
                    <p class="text-sm text-orange-500 dark:text-orange-400">⚠️ No public email available</p>
                {/if}
            </div>

            {#if country}
                <div class="mt-2 sm:mt-0 text-sm text-gray-600 dark:text-gray-300">🌍 {country}</div>
            {/if}
        </div>

        {#if mainAffiliation}
            <div class="text-gray-700 dark:text-gray-300">
                🏛️ <strong>Affiliation:</strong>
                {mainAffiliation?.organization?.name || 'Not specified'}
            </div>
        {/if}

        {#if biography}
            <div class="text-gray-600 dark:text-gray-400">
                ✍️ <strong>Biography:</strong>
                <p class="mt-1 text-sm leading-relaxed">{biography}</p>
            </div>
        {/if}

        {#if works.length > 0}
            <div>
                <h3 class="text-md font-semibold text-gray-800 dark:text-white mb-2">
                    📚 Recent publications:
                </h3>
                <ul
                    class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 max-h-40 overflow-y-auto bg-surface-50 dark:bg-surface-900 p-3 rounded"
                >
                    {@html works
                        .slice(0, 5)
                        .map(formatTitle)
                        .map(
                            (title: any) =>
                                `<li class="hover:text-gray-900 dark:hover:text-white transition-colors">${title}</li>`
                        )
                        .join('')}
                </ul>
                {#if works.length > 5}
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Showing 5 of {works.length} publications
                    </p>
                {/if}
            </div>
        {/if}

        <!-- Email Input Section (sempre mostrado quando selecionado e sem email público) -->
        {#if shouldShowEmailInput}
            <div
                class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
            >
                <div class="flex items-start gap-2 mb-3">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <div class="flex-1">
                        <p class="font-medium text-blue-800 dark:text-blue-200">Email Required</p>
                        <p class="text-blue-700 dark:text-blue-300 text-sm mb-3">
                            This ORCID profile doesn't have a public email. Please provide an email address to
                            create the user account.
                        </p>

                        <div class="space-y-2">
                            <label
                                for="manual-email"
                                class="block text-sm font-medium text-blue-800 dark:text-blue-200"
                            >
                                Email Address *
                            </label>
                            <input
                                id="manual-email"
                                type="email"
                                bind:value={manualEmail}
                                oninput={clearEmailError}
                                placeholder="user@example.com"
                                class="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                            {#if emailError}
                                <p class="text-red-600 dark:text-red-400 text-sm">{emailError}</p>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        {#if showAddButton && isSelected}
            <div class="flex justify-center pt-4 border-t border-surface-200 dark:border-surface-700">
                <button
                    type="button"
                    onclick={handleAddAsCoauthor}
                    disabled={isAdding || (!primaryEmail && !manualEmail.trim())}
                    class="bg-green-500 hover:bg-green-600 disabled:bg-surface-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    {#if isAdding}
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding as Co-author...
                    {:else}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        Add as Co-author
                    {/if}
                </button>
            </div>
        {/if}

        <!-- Informação adicional quando não há email e não está selecionado -->
        {#if !isSelected && !primaryEmail}
            <div
                class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
            >
                <div class="flex items-start gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <div class="text-sm">
                        <p class="font-medium text-yellow-800 dark:text-yellow-200">
                            Email Required for Account Creation
                        </p>
                        <p class="text-yellow-700 dark:text-yellow-300 mt-1">
                            Select this profile to provide an email address for user account creation.
                        </p>
                    </div>
                </div>
            </div>
        {/if}
    </div>
{:else}
    <div
        class="bg-surface-100 dark:bg-surface-800 rounded-lg p-6 text-center border border-surface-200 dark:border-surface-700"
    >
        <p class="text-gray-500 dark:text-gray-400">No profile information available</p>
    </div>
{/if}
