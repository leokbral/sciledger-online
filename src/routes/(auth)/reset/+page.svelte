<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { run, preventDefault } from 'svelte/legacy';

    let token = $state('');
    let newPassword = $state('');
    let confirmPassword = $state('');
    let processing = $state(false);
    let message = $state('');
    let error = $state('');
    let isValidToken = $state(false);
    let checking = $state(true);

    onMount(() => {
        const urlToken = page.url.searchParams.get('token');
        if (urlToken) {
            token = urlToken;
            validateToken();
        } else {
            // Se não tem token, mostra mensagem de confirmação de envio
            checking = false;
        }
    });

    async function validateToken() {
        try {
            const response = await fetch('/reset/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                isValidToken = true;
            } else {
                error = result.error || 'Invalid or expired token';
            }
        } catch (err) {
            error = 'Failed to validate token';
        } finally {
            checking = false;
        }
    }

    async function submitNewPassword(event: Event) {
        if (newPassword !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }

        if (newPassword.length < 6) {
            error = 'Password must be at least 6 characters long';
            return;
        }

        processing = true;
        error = '';

        try {
            const response = await fetch('/reset/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                message = 'Password reset successfully! Redirecting to login...';
                setTimeout(() => goto('/login'), 2000);
            } else {
                error = result.error || 'Failed to reset password';
            }
        } catch (err) {
            error = 'Failed to reset password';
        } finally {
            processing = false;
        }
    }
</script>

<div class="h-screen flex flex-col justify-center items-center bg-surface-100">
    <div class="w-full flex justify-center md:max-w-xl md:bg-white md:rounded-3xl md:shadow-2xl md:shadow-surface-500/50">
        <div class="flex flex-col items-center justify-center w-2/5 max-w-lg p-8">
            <!-- Logo -->
            <img
                src="https://t4.ftcdn.net/jpg/05/44/04/47/360_F_544044746_Swth0lqH9CcTci8S5p2FS4Jqpcy6HWoI.jpg"
                alt="Logo"
                width="64px"
                height="105px"
                class="mb-6"
            />

            {#if checking}
                <div class="text-center">
                    <div class="text-2xl font-bold text-surface-900 mb-4">Validating...</div>
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
            {:else if !token}
                <!-- Confirmação de envio de email -->
                <div class="text-center">
                    <div class="text-3xl font-bold text-surface-900 mb-4">Check your email</div>
                    <div class="text-base text-surface-700 mb-6">
                        We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                    </div>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p class="text-blue-800 text-sm">
                            <strong>Didn't receive the email?</strong><br>
                            Check your spam folder or try again in a few minutes.
                        </p>
                    </div>
                    <a href="/login" class="text-purple-600 hover:text-purple-800 underline">
                        Back to login
                    </a>
                </div>
            {:else if !isValidToken}
                <!-- Token inválido -->
                <div class="text-center">
                    <div class="text-3xl font-bold text-red-600 mb-4">Invalid Link</div>
                    <div class="text-base text-surface-700 mb-6">
                        This password reset link is invalid or has expired. Please request a new one.
                    </div>
                    <a href="/recovery" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                        Request New Link
                    </a>
                </div>
            {:else}
                <!-- Formulário de nova senha -->
                <form class="w-full" onsubmit={preventDefault(submitNewPassword)}>
                    <div class="text-3xl font-bold text-surface-900 mb-2">Reset Password</div>
                    <div class="text-base text-surface-700 mb-6">
                        Enter your new password below.
                    </div>

                    {#if error}
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p class="text-red-800 text-sm">{error}</p>
                        </div>
                    {/if}

                    {#if message}
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <p class="text-green-800 text-sm">{message}</p>
                        </div>
                    {/if}

                    <div class="space-y-4 mb-6">
                        <input
                            type="password"
                            placeholder="New Password"
                            bind:value={newPassword}
                            required
                            minlength="6"
                            class="w-full bg-transparent rounded-xl border-2 border-purple-200 text-surface-900 font-medium text-lg p-3 focus:outline-none focus:border-purple-600 placeholder-surface-400"
                        />
                        
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            bind:value={confirmPassword}
                            required
                            minlength="6"
                            class="w-full bg-transparent rounded-xl border-2 border-purple-200 text-surface-900 font-medium text-lg p-3 focus:outline-none focus:border-purple-600 placeholder-surface-400"
                        />
                    </div>

                    {#if processing}
                        <div class="text-center text-purple-600 mb-4">Processing...</div>
                    {/if}

                    <button
                        type="submit"
                        disabled={processing}
                        class="w-full bg-purple-600 text-white rounded-lg py-3 font-bold hover:bg-purple-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {processing ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            {/if}
        </div>
    </div>
</div>

<style>
	.main-container {
		height: 100vh;
		background-color: var(--std-purple);
		display: flex;
		flex-flow: column wrap;
		justify-content: center;
		align-items: center;
	}
	.main-form {
		color: #7e0cf5;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		width: 50vw;
		/* height: 50%; */ /*magical number*/
		border-bottom: 1px solid #f7beef;
	}
	.input-fields {
		color: #f7beef;
		font-weight: 500;
		font-size: large;
		/* padding: 10px 6px; */
	}
	@media (max-width: 768px) {
		.main-form {
			width: 81vw;
		}
	}
	@media (max-width: 360px) {
		.main-form {
			width: 81vw;
		}
	}
</style>