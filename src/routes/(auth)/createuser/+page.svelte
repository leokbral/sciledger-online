<script lang="ts">
    import { preventDefault } from 'svelte/legacy';

    let name = $state('');
    let email = $state('');
    let password = $state('');
    let confirmPassword = $state('');
    let handle = $state('');

    // Adiciona '@' ao handle apenas no envio dos dados
    function formatHandle(handle: string): string {
        return handle.startsWith('@') ? handle : `@${handle}`;
    }

    async function handleSubmit() {
        if (password !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        const formattedHandle = formatHandle(handle);

        const response = await fetch('/api/createuser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                handle: formattedHandle
            })
        });

        if (response.ok) {
            alert('Usuário criado com sucesso!');
        } else {
            const errorData = await response.json();
            alert(`Erro ao criar usuário: ${errorData.error}`);
        }
    }
</script>

<form onsubmit={preventDefault(handleSubmit)}>
    <label for="name">Nome de Usuário:</label>
    <input id="name" type="text" bind:value={name} required />

    <label for="email">Email:</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="handle">UserId:</label>
    <input id="handle" type="text" bind:value={handle} placeholder="Nome de usuário" required />

    <label for="password">Senha:</label>
    <input id="password" type="password" bind:value={password} required />

    <label for="confirmPassword">Confirme a Senha:</label>
    <input id="confirmPassword" type="password" bind:value={confirmPassword} required />

    <button type="submit">Criar Usuário</button>
</form>
