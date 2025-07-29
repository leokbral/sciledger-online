<script lang="ts">
    import { run, preventDefault } from 'svelte/legacy';
    import { post } from '$lib/utils';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import '/src/app.css';
    
    let email = $state('');
    let processing = $state(false);
    let submitted = $state(false);
    let error = $state('');

    async function submit(event: unknown) {
        if (!email.trim()) {
            error = 'Please enter your email address';
            return;
        }

        // Validar formato do email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            error = 'Please enter a valid email address';
            return;
        }

        processing = true;
        error = '';

        try {
            const response = await post(`/recovery`, { email: email.toLowerCase() });
            
            if (response.message === 'success') {
                submitted = true;
            } else {
                error = response.error || 'Failed to send recovery email. Please try again.';
            }
        } catch (err) {
            error = 'Network error. Please check your connection and try again.';
        } finally {
            processing = false;
        }
    }

    function resetForm() {
        submitted = false;
        email = '';
        error = '';
    }
</script>

<div class="h-screen flex flex-col justify-center items-center bg-surface-100">
    <div class="w-full flex justify-center md:max-w-xl md:bg-white md:rounded-3xl md:shadow-2xl md:shadow-surface-500/50">
        <div class="flex flex-col items-center justify-center w-full max-w-lg p-8">
            <!-- Logo -->
            <img
                src="https://t4.ftcdn.net/jpg/05/44/04/47/360_F_544044746_Swth0lqH9CcTci8S5p2FS4Jqpcy6HWoI.jpg"
                alt="Logo"
                width="64px"
                height="105px"
                class="mb-6"
            />

            {#if !submitted}
                <!-- Formulário de recuperação -->
                <form class="w-full" onsubmit={preventDefault(submit)}>
                    <div class="text-3xl font-bold text-surface-900 mb-2">Reset your password</div>
                    <div class="text-base text-surface-700 mb-6">
                        Enter your email address that you use with your account to continue.
                    </div>

                    {#if error}
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p class="text-red-800 text-sm">{error}</p>
                        </div>
                    {/if}

                    <div class="mb-6">
                        <input
                            class="w-full bg-transparent rounded-xl border-2 border-surface-500 text-surface-900 font-medium text-lg p-3 focus:outline-none focus:border-primary-600 placeholder-surface-400"
                            type="email"
                            required
                            placeholder="Email"
                            bind:value={email}
                            disabled={processing}
                        />
                    </div>

                    {#if processing}
                        <div class="text-center text-primary-600 mb-4">
                            <div class="flex items-center justify-center space-x-2">
                                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                <span>Sending recovery email...</span>
                            </div>
                        </div>
                    {/if}

                    <div class="flex flex-col space-y-4">
                        <button
                            class="w-full bg-primary-600 text-white rounded-lg py-3 font-bold hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
                            type="submit"
                            disabled={processing}
                        >
                            {processing ? 'Sending...' : 'Send Recovery Email'}
                        </button>
                        
                        <a 
                            href="/login" 
                            class="text-center text-primary-600 hover:text-primary-800 underline"
                        >
                            Remember your password? Sign in
                        </a>
                    </div>
                </form>
            {:else}
                <!-- Confirmação de envio -->
                <div class="text-center w-full">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                        <div class="text-green-600 mb-2">
                            <svg class="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold text-green-800 mb-2">Check your email</h3>
                        <p class="text-green-700">
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                    </div>

                    <div class="space-y-4 text-sm text-surface-600">
                        <p>
                            <strong>Didn't receive the email?</strong><br>
                            • Check your spam/junk folder<br>
                            • Make sure the email address is correct<br>
                            • Wait a few minutes and check again
                        </p>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p class="text-blue-800">
                                <strong>Security note:</strong> The reset link will expire in 1 hour for your security.
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-col space-y-3 mt-6">
                        <button 
                            onclick={resetForm}
                            class="text-primary-600 hover:text-primary-800 underline"
                        >
                            Try with a different email
                        </button>
                        
                        <a 
                            href="/login" 
                            class="text-surface-600 hover:text-surface-800 underline"
                        >
                            Back to login
                        </a>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
